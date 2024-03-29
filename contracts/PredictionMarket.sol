// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract PredictionMarket {
    uint constant NUM_OUTCOMES = 2;
    uint constant INF = 1<<200;
    uint constant CONTRACT_VALUE = 10 ether;
    
    struct Order {
        uint quantity;
        uint price;
        address addr;
        uint outcome;
    }

    Order[] orders;
    mapping (address => uint[]) public all_orders;
    uint[][NUM_OUTCOMES] orderbooks;
    mapping (address => uint[NUM_OUTCOMES]) pos_size;
    address oracle_address;
    uint public temp;
    
    constructor(address oracle_addr) {
        oracle_address = oracle_addr;
    }
    
    // Additional functions for front end
    function getOrders(address addr) public view returns(uint[] memory) {
        return all_orders[addr];
    }
    function getBidQuant(uint id) public view returns(uint) {
        return orders[id].quantity;
    }
    function getBidPrice(uint id) public view returns(uint) {
        return orders[id].price;
    }
    function getBidOutcome(uint id) public view returns(uint) {
        return orders[id].outcome;
    }

    function math_min(uint x, uint y) private returns (uint) {
        return x >= y ? y : x;
    }
    function higher_priority(uint i, uint j) private returns (bool) {
        assert(i < orders.length);
        assert(j < orders.length);
        assert(i != j);
        if (orders[i].price == orders[j].price) return i < j;
        return orders[i].price > orders[j].price;
    }
    // orderbook uses heaps
    function orderbooks_swap(uint outcome, uint i, uint j) private {
        assert(outcome < NUM_OUTCOMES);
        assert(i < orderbooks[outcome].length);
        assert(j < orderbooks[outcome].length);
        assert(i != j);
        uint temp = orderbooks[outcome][i];
        orderbooks[outcome][i] = orderbooks[outcome][j];
        orderbooks[outcome][j] = temp;
    }
    function orderbooks_add(uint outcome, uint id) private {
        assert(id < orders.length);
        assert(outcome < NUM_OUTCOMES);
        assert(orders[id].outcome == outcome);
        orderbooks[outcome].push(id);
        uint i = orderbooks[outcome].length - 1;
        while(i > 0) {
            uint par_i = (i - 1) >> 1;
            if (higher_priority(orderbooks[outcome][par_i], orderbooks[outcome][i])) break;
            orderbooks_swap(outcome, par_i, i);
            i = par_i;
        }
    }
    function orderbooks_emp(uint outcome) private returns (bool){
        assert(outcome < NUM_OUTCOMES);
        return orderbooks[outcome].length == 0;
    }
    function orderbooks_top_quantity(uint outcome) private returns (uint) {
        assert(outcome < NUM_OUTCOMES);
        assert(orderbooks[outcome].length > 0);
        return orders[orderbooks[outcome][0]].quantity;
    }
    function orderbooks_top_remove_quantity(uint outcome, uint delta) private {
        assert(outcome < NUM_OUTCOMES);
        assert(orderbooks[outcome].length > 0);
        orders[orderbooks[outcome][0]].quantity -= delta;
    }
    function orderbooks_top_price(uint outcome) private returns (uint) {
        assert(outcome < NUM_OUTCOMES);
        assert(orderbooks[outcome].length > 0);
        return orders[orderbooks[outcome][0]].price;
    }
    function orderbooks_top_address(uint outcome) private returns (address) {
        assert(outcome < NUM_OUTCOMES);
        assert(orderbooks[outcome].length > 0);
        return orders[orderbooks[outcome][0]].addr;
    }
    function orderbooks_pop(uint outcome) private {
        assert(outcome < NUM_OUTCOMES);
        assert(!orderbooks_emp(outcome));
        if (orderbooks[outcome].length == 1) {
            orderbooks[outcome].pop();
        } else {
            orderbooks_swap(outcome, 0, orderbooks[outcome].length - 1);
            orderbooks[outcome].pop();
            
            uint i = 0;
            uint child_i = 1; 
            while(child_i < orderbooks[outcome].length) {
              if (child_i + 1 < orderbooks[outcome].length && higher_priority(orderbooks[outcome][child_i + 1], orderbooks[outcome][child_i]))
                child_i++;
              if (higher_priority(orderbooks[outcome][i], orderbooks[outcome][child_i])) break;
              orderbooks_swap(outcome, i, child_i);
              i = child_i;
              child_i = (i << 1) + 1;
            }            
        }
    }
    // matching engine
    function try_matching() private returns (bool) {
        for (uint outcome = 0; outcome < NUM_OUTCOMES; outcome++) {
          while(!orderbooks_emp(outcome) && orderbooks_top_quantity(outcome) == 0)
            orderbooks_pop(outcome);
          assert(orderbooks_emp(outcome) || orderbooks_top_quantity(outcome) > 0);
        }
    
        uint sum_prices = 0;
        uint min_quantity = INF;
    
        for (uint outcome = 0; outcome < NUM_OUTCOMES; outcome++) if (!orderbooks_emp(outcome)) {
          sum_prices += orderbooks_top_price(outcome);
          min_quantity = math_min(min_quantity, orderbooks_top_quantity(outcome));
        }
    
        if (sum_prices == 0 || min_quantity == INF) {
          assert(sum_prices == 0 && min_quantity == INF);
          return false;
        }
        if (sum_prices < CONTRACT_VALUE) {
          return false;
        }
        
        for (uint outcome = 0; outcome < NUM_OUTCOMES; outcome++) if (!orderbooks_emp(outcome)) {
          orderbooks_top_remove_quantity(outcome, min_quantity);
          pos_size[orderbooks_top_address(outcome)][outcome] += min_quantity;
        }
    
        return true;
    }
    // submit a new bid for any outcome
    // price is in ether
    function bid(uint price, uint quantity, uint outcome) public payable returns (uint) {
        price = price * 1e18;
        require(price > 0, 'price must be positive');
        require(quantity > 0, 'quantity must be positive');
        require(outcome < NUM_OUTCOMES, 'outcome is between 0 ... NUM_OUTCOMES-1');
        require(msg.value == price * quantity, 'provide value equal to price x quantity');
    
        uint id = orders.length;
        orders.push(Order({
            quantity: quantity,
            price: price,
            addr: msg.sender,
            outcome: outcome}));
        all_orders[msg.sender].push(id);
        orderbooks_add(outcome, id);
    
        while(try_matching()) {}
        
        return id;
    }
    // cancel part of one of your unfilled orders
    function cancel(uint id, uint quantity) public returns (uint) {
        require(id < orders.length);
        require(orders[id].addr == msg.sender);
        
        quantity = math_min(quantity, orders[id].quantity);
        orders[id].quantity -= quantity;
        uint to_refund = orders[id].price * quantity;
        
        assert(address(this).balance >= to_refund);
        payable(msg.sender).transfer(to_refund);
        return to_refund;
    }
    // cancel all your unfilled orders
    function cancelAll() public returns (uint) {
        uint to_refund = 0;
        for (uint i = 0; i < all_orders[msg.sender].length; i++)
            to_refund += cancel(all_orders[msg.sender][i], INF);
        return to_refund;
    }
    // redeem any money you won if you bet correctly
    // call smart smart contarct to get winning outcome
    function redeem(uint winner) public returns (uint) {
        uint winning_outcome = winner;
        require(winning_outcome < NUM_OUTCOMES);
        uint winning_shares = pos_size[msg.sender][winning_outcome];
        temp = pos_size[msg.sender][winning_outcome];
        pos_size[msg.sender][winning_outcome] = 0;
        uint winnings = winning_shares * CONTRACT_VALUE;
        assert(address(this).balance >= winnings);
        payable(msg.sender).transfer(winnings);
        return winnings;
    }

    function returnTemp() public view returns (uint) {
        return temp;
    }
}

contract Oracle1 {
    uint NUM_OUTCOMES;
    uint[3] private reports;
    uint[3] private inputs;

    // outcomers flexible
    constructor(uint outcomes) {
        NUM_OUTCOMES = outcomes;
        inputs[0] = 0;
        inputs[1] = 0;
        inputs[2] = 0;
    }

    // determine winner through external oracles
    function report1(uint won1) public {
        require(won1 < NUM_OUTCOMES, "Result out of bounds");
        require(inputs[0] == 0, "Only one input permitted");
        inputs[0]++;
        reports[0] = won1;
    }

    // ensure that can't change report after the fact
    function report2(uint won2) public {
        require(won2 < NUM_OUTCOMES, "Result out of bounds");
        require(inputs[1] == 0, "Only one input permitted");
        inputs[1]++;
        reports[1] = won2;
    }

    function report3(uint won3) public {
        require(won3 < NUM_OUTCOMES, "Result out of bounds");
        require(inputs[2] == 0, "Only one input permitted");
        inputs[2]++;
        reports[2] = won3;
    }

    function clear() public {
        reports[0] = 0;
        reports[1] = 0;
        reports[2] = 0;
        inputs[0] = 0;
        inputs[1] = 0;
        inputs[2] = 0;
    }

    // most often as consensus - defaults to report1 if inconclusive
    function winner(uint first, uint second, uint third) public returns(uint) {
        uint modeValue;
        uint[] memory count = new uint[](NUM_OUTCOMES); 
        
        count[first]++;
        count[second]++;
        count[third]++;

        if (count[0] > count[1]) {
            modeValue = count[0];
        }
        else if (count[0] < count[1]) {
            modeValue = count[1];
        }
        else {
            modeValue = first;
        }

        clear();

        return modeValue;
    }       
}