var account
var outcome

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
    // Write cancel order, make order, see balance functions

    submitBet: async () => {
      const team = $('#team').val()
      const betAmount = $('#betAmount').val()
      const betQuantity = $('#betQuantity').val()
      await App.PredictionMarket.bid(betAmount, betQuantity, team, {from: account, gas:3000000, value:(betAmount*betQuantity)})
    },

    cancelOrders: async () => {
      await App.PredictionMarket.cancelAll({to: account, gas:3000000})
      document.getElementById("cancelMsg").innerHTML = "Done!"
    },

    balance: async () => {
      var wei, balance
      account = document.getElementById("address").value
      try {
          web3.eth.getBalance(account, function (error, wei) {
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
      await App.PredictionMarket.redeem(outcome, {to: account, gas:3000000})
      document.getElementById("redeemMsg").innerHTML = "Done! Check your balance."
    },

    outcome: async () => {
      outcome = document.getElementById("outcome").value
      document.getElementById("outcomeMsg").innerHTML = "Done!"
    }
  }
  
  $(() => {
    $(window).on('load', (() => {
      App.load()
    })) 
  }) 