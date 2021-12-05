App = {
    contracts: {},
  
    load: async () => {
      await App.loadWeb3()
      await App.loadAccount()
      await App.loadContract()
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
      const oracle1 = await $.getJSON('Oracle1.json')
      App.contracts.PredictionMarket = TruffleContract(predictionmarket)
      App.contracts.PredictionMarket.setProvider(App.web3Provider)
      App.contracts.Oracle1 = TruffleContract(oracle1)
      App.contracts.Oracle1.setProvider(App.web3Provider)
  
      // Populate the smart contract with values from the blockchain
      App.PredictionMarket = await App.contracts.PredictionMarket.deployed()
      App.Oracle1 = await App.contracts.Oracle1.deployed()

      console.log(App.PredictionMarket)
      console.log(App.Oracle1)
    },
    
    renderBids: async () => {
      $('#bidList').empty()
      
      const all_orders = await App.PredictionMarket.getOrders(App.account)
      const bidCount = all_orders.length
      const $bidTemplate = $('.bidTemplate')

      console.log(all_orders) 

      // Render out each bid 
      for (var i = 0; i < bidCount; i++) {
        var quantity = await App.PredictionMarket.getBidQuant(all_orders[i])
        var price = await App.PredictionMarket.getBidPrice(all_orders[i])
        var outcome = await App.PredictionMarket.getBidOutcome(all_orders[i])

        price = price / 1e18

        if (parseInt(quantity) === 0) {
          continue
        }
        
        const newContent = '{ ' + outcome + ', ' + price + ', ' + quantity + '}'
        console.log(newContent)

        $('#bidList').append('<li>' + newContent + '</li>')
      }
    },

    submitBet: async () => {
      const team = parseInt($('#team').val())
      const betAmount = parseFloat($('#betAmount').val())
      const betQuantity = parseInt($('#betQuantity').val())

      App.PredictionMarket.bid(betAmount, betQuantity, team, {from: App.account, gas:3000000, value:((betAmount*1e18)*betQuantity)})
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
      console.log(App.winner)
      App.PredictionMarket.redeem(App.winner, {from: App.account, gas: 3000000})
      document.getElementById("redeemMsg").innerHTML = "Done! Check your balance."
    },

    oracleReport: async () => {
      var num1 = parseInt(document.getElementById("report1").value)
      var num2 = parseInt(document.getElementById("report2").value)
      var num3 = parseInt(document.getElementById("report3").value)
      
      var counts = [0, 0]
      counts[num1] += 1
      counts[num2] += 1
      counts[num3] += 1
      
      if (counts[0] > counts[1]) {
        App.winner = 0
      }
      else if (counts[1] > counts[0]) {
        App.winner = 1
      }
      else {
        App.winner = num1;
      }

      console.log(App.winner)
      document.getElementById("oracleMessage").innerHTML = "Winner Confirmed!"
    }
  }
  
  $(() => {
    $(window).on('load', (() => {
      App.load()
    })) 
  }) 