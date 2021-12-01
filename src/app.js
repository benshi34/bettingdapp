App = {
    contracts: {},
  
    load: async () => {
      await App.loadWeb3()
      await App.loadAccount()
      await App.loadContract()
      await App.render() 
    },
    
    // Copied from metamask implementation, link below
    // https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
    loadWeb3: async () => {
      if (typeof web3 !== 'undefined') {
        App.web3Provider = web3.currentProvider
        web3 = new Web3(web3.currentProvider)
      } else {
        window.alert("Please connect to Metamask.")
      }
      // Modern dapp browsers...
      if (window.ethereum) {
        window.web3 = new Web3(ethereum)
        try {
          // Request account access if needed
          await ethereum.enable()
          // Acccounts now exposed
          web3.eth.sendTransaction({/* ... */})
        } catch (error) {
          // User denied account access...
        }
      }
      // Legacy dapp browsers...
      else if (window.web3) {
        App.web3Provider = web3.currentProvider
        window.web3 = new Web3(web3.currentProvider)
        // Acccounts always exposed
        web3.eth.sendTransaction({/* ... */})
      }
      // Non-dapp browsers...
      else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
      }
    },

    loadAccount: async () => {
      // Set the current blockchain account: Need to change to set account we want to modify
      App.account = web3.eth.accounts[0]
      web3.eth.defaultAccount = web3.eth.accounts[0]
      console.log(App.account)
    }, 
  
    loadContract: async () => {
      // Create a JavaScript version of the smart contract
      const predictionmarket = await $.getJSON('PredictionMarket.json')
      App.contracts.PredictionMarket = TruffleContract(predictionmarket)
      App.contracts.PredictionMarket.setProvider(App.web3Provider)
  
      // Populate the smart contract with values from the blockchain
      App.PredictionMarket = await App.contracts.PredictionMarket.deployed()

      console.log(App.PredictionMarket)
    },
  
    render: async () => {
      // Prevent double render
      if (App.loading) {
        return
      }
      // Render Account
      $('#account').html(App.account)
    },
    
    renderBids: async () => {
      const superOrders = await App.PredictionMarket.orders
      const all_orders = await App.PredictionMarket.getOrders({from: App.account, gas:3000000})
      const bidCount = await all_orders.length
      const $bidTemplate = $('.bidTemplate')
      console.log(superOrders)
      console.log(all_orders)
      console.log(bidCount)

      // Render out each bid 
      for (var i = 0; i < bidCount; i++) {
        const bid = await superOrders[all_orders[i]]
        const quantity = bid[0].toNumber()
        const price = bid[1].toNumber()
        const outcome = bid[3].toNumber()
        
        console.log(quantity)
        console.log(price)
        console.log(outcome)
        if (quantity === 0)
          continue
        
        const newContent = '{ ' + outcome + ', ' + price + ', ' + quantity + '}'
        const $newBidTemplate = $bidTemplate.clone()
        $newBidTemplate.find('.content').html(newContent)
        $newBidTemplate.show()
      }
    },

    submitBet: async () => {
      const team = parseInt($('#team').val())
      const betAmount = parseInt($('#betAmount').val())
      const betQuantity = parseInt($('#betQuantity').val())

      App.PredictionMarket.bid(betAmount, betQuantity, team, {from: App.account, gas:3000000, value:(betAmount*betQuantity)})

      console.log(App.PredictionMarket.bid(betAmount, betQuantity, team, {from: App.account, gas:3000000, value:(betAmount*betQuantity)}))
    },

    cancelOrders: async () => {
      console.log(App.account)
      await App.PredictionMarket.cancelAll({from: App.account, gas:3000000})
      document.getElementById("cancelMsg").innerHTML = "Done!"
    },

    balance: async () => {
      App.account = document.getElementById("address").value
      console.log(App.account)
      try {
          web3.eth.getBalance(App.account, function (error, wei) {
              if (!error) {
                  var balance = web3.fromWei(wei, 'ether');
                  document.getElementById("balance").innerHTML = balance + " ETH";
              }
          });
      } catch (err) {
          document.getElementById("balance").innerHTML = err;
      }
    },
    
    redeem: async () => {
      await App.PredictionMarket.redeem(App.account, {from: App.account, gas:3000000})
      document.getElementById("redeemMsg").innerHTML = "Done! Check your balance."
    },
  }
  
  $(() => {
    $(window).on('load', (() => {
      App.load()
    })) 
  }) 