var BettingApp = artifacts.require("./PredictionMarket.sol");

module.exports = function(deployer) {
  deployer.deploy(BettingApp);
};