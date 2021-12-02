var PredictionMarket = artifacts.require("PredictionMarket");
var Oracle = artifacts.require("Oracle1")

module.exports = async function(deployer) {
  deployer.deploy(Oracle, 2);
  deployer.deploy(PredictionMarket, Oracle.address)
};
