const Web3 = require("web3");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const createCsvWriter = require("csv-writer").createArrayCsvWriter;

describe("LevrSale", function () {
  it("Generate graph data", async function () {
    const LEVR = await hre.ethers.getContractFactory("LEVR");
    const levr = await LEVR.deploy();
    await levr.deployed();
    console.log("LEVR deployed to:", levr.address);

    let incline = "10000000000000000000000000000000000000000000000000000000"; //10000000000 *10^18 *10^27
    const [account0, account1, account2, account3, account4] =
      await ethers.getSigners();
    console.log(account1.address);
    const Sale = await hre.ethers.getContractFactory("Sale");
    const sale = await Sale.deploy(
      incline,
      //startingPoint,
      levr.address,
      account1.address, // gulper
      account4.address, // treasury
      account2.address, // liquidity
      account3.address // foundryTreasury
    );

    await sale.deployed();

    console.log("Sale deployed to:", sale.address);

    await levr.addMinter(sale.address);

    let web3 = new Web3("ws://localhost:8545");

    let tokensIssued = 0;
    let totalRaised = 0;
    let amountRaised = 0;
    let issueRecords = [];

    let numberOfBuys = 10;
    let etherToSpend = "0.02";

    for (let i = 0; i < numberOfBuys; i++) {
      amountRaised = await sale.raised();
      console.log("Amount raised: ", amountRaised.toString());

      await sale.buy(account1.address, {
        value: web3.utils.toWei(etherToSpend),
      });

      tokensIssued = await sale.tokensIssued();
      console.log(
        "Tokens Issued: ",
        web3.utils.fromWei(tokensIssued.toString())
      );

      totalRaised = await sale.raised();
      console.log("Total Raised: ", web3.utils.fromWei(totalRaised.toString()));

      issueRecords.push([
        i,
        web3.utils.fromWei(totalRaised.toString()),
        web3.utils.fromWei(tokensIssued.toString()),
      ]);
    }

    const csvWriter = createCsvWriter({
      header: ["Buy Count", "Raised", "Total Tokens Issued"],
      path: "levrData.csv",
    });

    csvWriter.writeRecords(issueRecords).then(() => {
      console.log("Written to csv");
    });
  });
});
