import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

import contract_build_artifacts from '../../build/contracts/PredictionMarket.json'
import { transferPromiseness } from 'chai-as-promised';

var PredictionMarket = contract(contract_build_artifacts);

var accounts;
var account;

document.onreadystatechange = function () {
    if (document.readyState === "complete") {
      ready();
      fetch();
      // transfer()? 
    }
  }

window.App = {
  
  start: function() {
    var self = this;

    PredictionMarket.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(async function(err, accs) {

      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      web3.eth.defaultAccount = accounts[0];
      account = accounts[0];

      self.callEvents();
    });
  },
  
  callingEvents: function(instance){
    var LogInfo = instance.LogInfo({},{fromBlock: 0, toBlock: 'latest'});
    var LogFunctioning = instance.LogFunctioning({},{fromBlock: 0, toBlock: 'latest'});
    var LogDeposit = instance.LogDeposit({},{fromBlock: 0, toBlock: 'latest'});
    var LogTransfer = instance.LogTransfer({},{fromBlock: 0, toBlock: 'latest'});

    LogFunctioning.watch(function(err, result){
      if(!err){
        console.info(result.args)
      }else{
        console.error(err)
      }
    })

    LogInfo.watch(function(err, result){
      if(!err){
        console.info(result.args)
      }else{
        console.error(err)
      }
    })

    LogDeposit.watch(function(err, result){
      if(!err){
        console.info(result.args.sender)
        console.info(result.args.amount)
        console.info(result.args.executed)
      }else{
        console.error(err)
      }
    })

    LogTransfer.watch(function(err, result){
      if(!err){
         console.info(result.args.winner)
         console.info(result.args.win)
      }else{
        console.error(err)
      }
    })
  },

    callEvents: function() {
    var self = this;
    var meta;
          OraclizeContract.deployed().then(function(instance) {
            meta = instance;

              App.callingEvents(instance);
    })
  }        
          
};

  window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    ethereum.enable();
    console.warn("Using web3 detected from external source.")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545.");
    // fallback
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  // Start App
  App.start();
});