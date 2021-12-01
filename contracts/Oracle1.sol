// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract Oracle1 {
    uint NUM_OUTCOMES;
    uint[3] private reports;
    address[3] private reporters;
    address private owner;
    uint[3] private inputs;

    // outcomers flexible
    constructor(uint outcomes, address _owner) {
        NUM_OUTCOMES = outcomes;
        owner = _owner;
        reporters[0] = 0x583031D1113aD414F02576BD6afaBfb302140225;
        reporters[1] = 0xdD870fA1b7C4700F2BD7f44238821C26f7392148;
        reporters[2] = 0x265a5C3DD46EC82e2744f1d0E9fB4eD75D56132a;
        inputs[0] = 0;
        inputs[1] = 0;
        inputs[2] = 0;
    }

    // determine winner through external oracles
    function report1(uint won1) public {
        require(msg.sender == reporters[0], "Not reporter 1");
        require(won1 < NUM_OUTCOMES, "Result out of bounds");
        require(inputs[0] == 0, "Only one input permitted");
        inputs[0]++;
        reports[0] = won1;
    }

    // ensure that can't change report after the fact
    function report2(uint won2) public {
        require(msg.sender == reporters[1], "Not reporter 2");
        require(won2 < NUM_OUTCOMES, "Result out of bounds");
        require(inputs[1] == 0, "Only one input permitted");
        inputs[1]++;
        reports[1] = won2;
    }

    function report3(uint won3) public {
        require(msg.sender == reporters[2], "Not reporter 3");
        require(won3 < NUM_OUTCOMES, "Result out of bounds");
        require(inputs[2] == 0, "Only one input permitted");
        inputs[2]++;
        reports[2] = won3;
    }

    function clear() public {
        require(msg.sender == owner, "Only owner can clear");
        delete reports;
        inputs[0] = 0;
        inputs[1] = 0;
        inputs[2] = 0;
    }

    // most often as consensus - defaults to report1 if inconclusive
    function winner() public view returns(uint) {
        // require(msg.sender == owner, "Only owner can obtain result");
        require(inputs[0] == 1, "First reporter did not contribute");
        require(inputs[1] == 1, "Second reporter did not contribute");
        require(inputs[2] == 1, "Third reporter did not contribute");
        uint  modeValue;
        uint[] memory count = new uint[](NUM_OUTCOMES); 
        uint number; 
        uint maxIndex = 0;
        
        for (uint i = 0; i < reports.length; i += 1) {
            number = reports[i];
            count[number] = (count[number]) + 1;
            if (count[number] > count[maxIndex]) {
                maxIndex = number;
            }
        }
        for (uint i = 0; i < count.length; i++) {
            if (count[i] == maxIndex) {
                modeValue=count[i];
                break;
            }
        }
        return modeValue;
    }       
}