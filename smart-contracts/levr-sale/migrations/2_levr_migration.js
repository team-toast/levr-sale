const levr = artifacts.require("LEVR");

module.exports = async function (deployer, network, accounts) {
  // deployment steps
  await deployer.deploy(levr);
};
