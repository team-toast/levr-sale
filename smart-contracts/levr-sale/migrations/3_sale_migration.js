const sale = artifacts.require("Sale");

module.exports = async function (deployer, network, accounts) {
  // deployment steps
  await deployer.deploy(
    sale,
    10,
    10,
    "0x7E1d0353063F01CfFa92f4a9C8A100cFE37d8264",
    "0x7E1d0353063F01CfFa92f4a9C8A100cFE37d8264",
    "0x7E1d0353063F01CfFa92f4a9C8A100cFE37d8264",
    "0x7E1d0353063F01CfFa92f4a9C8A100cFE37d8264",
    "0x7E1d0353063F01CfFa92f4a9C8A100cFE37d8264"
  );
};
