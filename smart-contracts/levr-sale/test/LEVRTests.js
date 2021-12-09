const levr = artifacts.require("LEVR");
const sale = artifacts.require("Sale");
const createCsvWriter = require("csv-writer").createArrayCsvWriter;

contract("LEVR", (accounts) => {
  it("Generate sale data", async () => {
    const levrContract = await levr.new();
    const supply = await levrContract.totalSupply();
    assert(supply.toString() === "0");

    let etherToSpend = "0.02";
    let incline = "10000000000000000000000000000000000000000000000000000000"; //10000000000 *10^18 *10^27
    let issueRecords = [];
    let numberOfBuys = 100;

    const saleContract = await sale.new(
      incline,
      levrContract.address,
      accounts[1],
      accounts[4],
      accounts[2],
      accounts[3]
    );

    let tokensIssued = 0;
    let totalRaised = 0;
    let amountRaised = 0;

    await saleContract.buy(accounts[0], {
      value: web3.utils.toWei(etherToSpend),
    });

    tokensIssued = await saleContract.tokensIssued();
    console.log("Tokens Issued: ", web3.utils.fromWei(tokensIssued.toString()));

    issueRecords.push([
      0,
      web3.utils.fromWei("0"),
      web3.utils.fromWei(tokensIssued),
    ]);

    for (let i = 1; i < numberOfBuys; i++) {
      amountRaised = await saleContract.raised();
      console.log("Amount raised: ", amountRaised.toString());

      await saleContract.buy(accounts[0], {
        value: web3.utils.toWei(etherToSpend),
      });

      tokensIssued = await saleContract.tokensIssued();
      console.log(
        "Tokens Issued: ",
        web3.utils.fromWei(tokensIssued.toString())
      );

      totalRaised = await saleContract.raised();
      console.log("Total Raised: ", web3.utils.fromWei(totalRaised.toString()));

      issueRecords.push([
        i,
        web3.utils.fromWei(totalRaised),
        web3.utils.fromWei(tokensIssued),
      ]);
    }

    const csvWriter = createCsvWriter({
      header: ["Buy Count", "Raised", "Total Tokens Issued"],
      path: "levrData.csv",
    });

    csvWriter
      .writeRecords(issueRecords) // returns a promise
      .then(() => {
        console.log("Written to csv");
      });
  });
});
