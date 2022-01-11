const Web3 = require("web3");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const createCsvWriter = require("csv-writer").createArrayCsvWriter;
const { BigNumber } = require("ethers");

const testLevrAddress = "0xce0F718BD518E38A479fcB0187B67c2Eb57c5e1D";
const accountToImpersonate = "0x20BD917E2fc207AC80a15b034B4dBAa296065216";
let incline = "389564392300000000000000000000000000000000000000"; // 5% Start
let web3 = new Web3("ws://localhost:8545");
let LEVR;
let levr;
let Sale;
let sale;
let [
  testAccount,
  gulperAccount,
  liquidityAccount,
  foundryAccount,
  treasuryAccount,
] = ["", "", "", "", ""];
let prov = ethers.getDefaultProvider();

describe("LevrSale Tests", function () {
  // Reset to fork before each test
  beforeEach(async function () {
    resetChain();

    // Get LEVR test token contract that was launched on Arbitrum
    LEVR = await hre.ethers.getContractFactory("LEVR");
    levr = await LEVR.attach(testLevrAddress);

    // Get test accounts
    [
      testAccount,
      gulperAccount,
      liquidityAccount,
      foundryAccount,
      treasuryAccount,
    ] = await ethers.getSigners();

    // // Get rid of gulper account eth
    // await gulperAccount.sendTransaction({
    //   to: "0x0000000000000000000000000000000000000000",
    //   value: ethers.utils.parseEther("1000.0"),
    // });

    // Deploy Sale
    Sale = await hre.ethers.getContractFactory("Sale");
    sale = await Sale.deploy(
      incline,
      levr.address,
      gulperAccount.address, // gulper
      treasuryAccount.address, // treasury
      liquidityAccount.address, // liquidity
      foundryAccount.address // foundryTreasury
    );

    await sale.deployed();
  });

  it("LS_C: Constructor", async function () {
    expect(await sale.inclineWAD()).to.equal(incline);
    expect(await sale.tokenOnSale()).to.equal(levr.address);
    expect(await sale.gulper()).to.equal(gulperAccount.address);
    expect(await sale.treasury()).to.equal(treasuryAccount.address);
    expect(await sale.liquidity()).to.equal(liquidityAccount.address);
    expect(await sale.foundryTreasury()).to.equal(foundryAccount.address);
  });

  it("LS_B: Buy zero Levr", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    // admin has minting rights
    const admin = await ethers.getSigner(accountToImpersonate);

    // send ether to admin account
    await testAccount.sendTransaction({
      to: accountToImpersonate,
      value: ethers.utils.parseEther("1.0"),
    });

    // Use admin address to make Sale a minter of Levr token
    await levr.connect(admin).addMinter(sale.address);

    let gulperAccountBalanceBefore = await gulperAccount.getBalance();
    // Buy 0 Levr
    let buyTx = await sale.buy(gulperAccount.address, {
      value: web3.utils.toWei("0"),
    });

    // STATE
    let totalRaised = await sale.raised();
    let tokensIssued = await sale.tokensIssued();
    //   console.log("Total Raised: ", totalRaised);

    let testAccountBalance = await levr.balanceOf(testAccount.address);
    let gulperAccountBalance = await gulperAccount.getBalance(); // eth balance of gulper
    let liquidityAccountBalance = await levr.balanceOf(
      liquidityAccount.address
    );
    let foundryAccountBalance = await levr.balanceOf(foundryAccount.address);
    let treasuryAccountBalance = await levr.balanceOf(treasuryAccount.address);

    expect(testAccountBalance).to.equal("0");
    expect(gulperAccountBalance.sub(gulperAccountBalanceBefore)).to.equal(
      web3.utils.toWei("0")
    );
    expect(liquidityAccountBalance).to.equal("0");
    expect(foundryAccountBalance).to.equal("0");
    expect(treasuryAccountBalance).to.equal("0");
    expect(tokensIssued).to.equal("0");
    expect(totalRaised).to.equal("1000000000000000000000");

    // EVENTS
    expect(buyTx).to.emit(sale, "Bought").withArgs(gulperAccount.address, "0");
  });

  it("LS_B: Buy Levr", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    // admin has minting rights
    const admin = await ethers.getSigner(accountToImpersonate);

    // send ether to admin account
    await testAccount.sendTransaction({
      to: accountToImpersonate,
      value: ethers.utils.parseEther("1.0"),
    });

    // Use admin address to make Sale contract a minter of Levr token
    await levr.connect(admin).addMinter(sale.address);

    let amountToBuy = "1.0";
    let raisedBefore = await sale.raised();
    let gulperAccountBalanceBefore = await gulperAccount.getBalance();

    // Buy 1 eth of Levr
    let buyTx = await sale.buy(testAccount.address, {
      value: web3.utils.toWei(amountToBuy),
    });

    // STATE
    let totalRaised = await sale.raised();
    let tokensIssued = await sale.tokensIssued();
    // console.log("Total Raised: ", totalRaised);

    let testAccountBalance = await levr.balanceOf(testAccount.address);
    let gulperAccountBalance = await gulperAccount.getBalance(); // eth balance of gulper
    let liquidityAccountBalance = await levr.balanceOf(
      liquidityAccount.address
    );
    let foundryAccountBalance = await levr.balanceOf(foundryAccount.address);
    let treasuryAccountBalance = await levr.balanceOf(treasuryAccount.address);

    // console.log(
    //   "Account 0 Tokens: ",
    //   web3.utils.fromWei(gulperAccountBalance.toString())
    // );

    // Calculate expected tokens received
    let calculatedTokenAmount = calculateTokensReceived(
      web3.utils.toWei(amountToBuy),
      raisedBefore
    );
    // console.log(
    //   "Calculated tokens: ",
    //   web3.utils.fromWei(calculatedTokenAmount.div(7).mul(4).toString())
    // );
    expect(testAccountBalance).to.equal(
      calculatedTokenAmount.div(7).mul(4).toString()
    );
    expect(gulperAccountBalance.sub(gulperAccountBalanceBefore)).to.equal(
      web3.utils.toWei(amountToBuy)
    );
    expect(liquidityAccountBalance).to.equal(
      calculatedTokenAmount.div(7).toString()
    );
    expect(foundryAccountBalance).to.equal(
      calculatedTokenAmount.div(7).toString()
    );
    expect(treasuryAccountBalance).to.equal(
      calculatedTokenAmount.div(7).toString()
    );
    expect(tokensIssued).to.equal(calculatedTokenAmount.toString());
    expect(totalRaised).to.equal(
      raisedBefore.add(web3.utils.toWei(amountToBuy))
    );

    // EVENTS
    expect(buyTx)
      .to.emit(sale, "Bought")
      .withArgs(testAccount.address, calculatedTokenAmount.toString());
  });

  it("LS_B: Buy Levr with invalid gulper", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    // Deply invalid gulper
    let BlankContract = await hre.ethers.getContractFactory("BlankContract");
    let blankContract = await BlankContract.deploy();
    // Deploy Sale
    let SaleWithInvalidGulper = await hre.ethers.getContractFactory("Sale");
    let saleWithInvalidGulper = await SaleWithInvalidGulper.deploy(
      incline,
      levr.address,
      blankContract.address, // gulper
      treasuryAccount.address, // treasury
      liquidityAccount.address, // liquidity
      foundryAccount.address // foundryTreasury
    );

    await saleWithInvalidGulper.deployed();

    // admin has minting rights
    const admin = await ethers.getSigner(accountToImpersonate);

    // send ether to admin account
    await testAccount.sendTransaction({
      to: accountToImpersonate,
      value: ethers.utils.parseEther("1.0"),
    });

    // Use admin address to make Sale contract a minter of Levr token
    await levr.connect(admin).addMinter(saleWithInvalidGulper.address);

    let amountToBuy = "1.0";
    let raisedBefore = await saleWithInvalidGulper.raised();
    let gulperAccountBalanceBefore = await gulperAccount.getBalance();

    // Should Revert
    await expect(
      saleWithInvalidGulper.buy(testAccount.address, {
        value: web3.utils.toWei(amountToBuy),
      })
    ).to.be.revertedWith("reverted with reason string 'gulper malfunction'");
  });

  it("LS_B: Buy zero Levr (By just sending eth)", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    // admin has minting rights
    const admin = await ethers.getSigner(accountToImpersonate);

    // send ether to admin account
    await testAccount.sendTransaction({
      to: accountToImpersonate,
      value: ethers.utils.parseEther("1.0"),
    });

    // Use admin address to make Sale a minter of Levr token
    await levr.connect(admin).addMinter(sale.address);

    let gulperAccountBalanceBefore = await gulperAccount.getBalance();
    // Buy 0 Levr
    let buyTx = await testAccount.sendTransaction({
      to: sale.address,
      value: ethers.utils.parseEther("0"),
    });

    // STATE
    let totalRaised = await sale.raised();
    let tokensIssued = await sale.tokensIssued();
    //   console.log("Total Raised: ", totalRaised);

    let testAccountBalance = await levr.balanceOf(testAccount.address);
    let gulperAccountBalance = await gulperAccount.getBalance(); // eth balance of gulper
    let liquidityAccountBalance = await levr.balanceOf(
      liquidityAccount.address
    );
    let foundryAccountBalance = await levr.balanceOf(foundryAccount.address);
    let treasuryAccountBalance = await levr.balanceOf(treasuryAccount.address);

    expect(testAccountBalance).to.equal("0");
    expect(gulperAccountBalance.sub(gulperAccountBalanceBefore)).to.equal(
      web3.utils.toWei("0")
    );
    expect(liquidityAccountBalance).to.equal("0");
    expect(foundryAccountBalance).to.equal("0");
    expect(treasuryAccountBalance).to.equal("0");
    expect(tokensIssued).to.equal("0");
    expect(totalRaised).to.equal(totalRaised);

    // EVENTS
    expect(buyTx).to.emit(sale, "Bought").withArgs(testAccount.address, "0");
  });

  it("LS_B: Buy Levr (By just sending eth)", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    // admin has minting rights
    const admin = await ethers.getSigner(accountToImpersonate);

    // send ether to admin account
    await testAccount.sendTransaction({
      to: accountToImpersonate,
      value: ethers.utils.parseEther("1.0"),
    });

    // Use admin address to make Sale contract a minter of Levr token
    await levr.connect(admin).addMinter(sale.address);

    let amountToBuy = "1";
    let raisedBefore = await sale.raised();
    let gulperAccountBalanceBefore = await gulperAccount.getBalance();
    // Buy 1 eth of Levr by simply sending eth to the contract
    let buyTx = await testAccount.sendTransaction({
      to: sale.address,
      value: ethers.utils.parseEther(amountToBuy),
    });

    // STATE
    let totalRaised = await sale.raised();
    let tokensIssued = await sale.tokensIssued();
    // console.log("Total Raised: ", totalRaised);

    let testAccountBalance = await levr.balanceOf(testAccount.address);
    let gulperAccountBalance = await gulperAccount.getBalance(); // eth balance of gulper
    let liquidityAccountBalance = await levr.balanceOf(
      liquidityAccount.address
    );
    let foundryAccountBalance = await levr.balanceOf(foundryAccount.address);
    let treasuryAccountBalance = await levr.balanceOf(treasuryAccount.address);

    // console.log(
    //   "Account 0 Tokens: ",
    //   web3.utils.fromWei(gulperAccountBalance.toString())
    // );

    // Calculate expected tokens received
    let calculatedTokenAmount = calculateTokensReceived(
      web3.utils.toWei(amountToBuy),
      raisedBefore
    );
    // console.log(
    //   "Calculated tokens: ",
    //   web3.utils.fromWei(calculatedTokenAmount.div(7).mul(4).toString())
    // );
    expect(testAccountBalance).to.equal(
      calculatedTokenAmount.div(7).mul(4).toString()
    );
    expect(gulperAccountBalance.sub(gulperAccountBalanceBefore)).to.equal(
      web3.utils.toWei(amountToBuy)
    );
    expect(liquidityAccountBalance).to.equal(
      calculatedTokenAmount.div(7).toString()
    );
    expect(foundryAccountBalance).to.equal(
      calculatedTokenAmount.div(7).toString()
    );
    expect(treasuryAccountBalance).to.equal(
      calculatedTokenAmount.div(7).toString()
    );
    expect(tokensIssued).to.equal(calculatedTokenAmount.toString());
    expect(totalRaised).to.equal(
      raisedBefore.add(web3.utils.toWei(amountToBuy))
    );

    // EVENTS
    expect(buyTx)
      .to.emit(sale, "Bought")
      .withArgs(testAccount.address, calculatedTokenAmount.toString());
  });

  it("LS_B: Buy Levr with invalid gulper (by just sending eth)", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    // Deploy invalid gulper
    let BlankContract = await hre.ethers.getContractFactory("BlankContract");
    let blankContract = await BlankContract.deploy();
    // Deploy Sale
    let SaleWithInvalidGulper = await hre.ethers.getContractFactory("Sale");
    let saleWithInvalidGulper = await SaleWithInvalidGulper.deploy(
      incline,
      levr.address,
      blankContract.address, // gulper
      treasuryAccount.address, // treasury
      liquidityAccount.address, // liquidity
      foundryAccount.address // foundryTreasury
    );

    await saleWithInvalidGulper.deployed();

    // admin has minting rights
    const admin = await ethers.getSigner(accountToImpersonate);

    // send ether to admin account
    await testAccount.sendTransaction({
      to: accountToImpersonate,
      value: ethers.utils.parseEther("1.0"),
    });

    // Use admin address to make Sale contract a minter of Levr token
    await levr.connect(admin).addMinter(saleWithInvalidGulper.address);

    let amountToBuy = "1.0";
    let raisedBefore = await saleWithInvalidGulper.raised();
    let gulperAccountBalanceBefore = await gulperAccount.getBalance();

    // Should Revert
    await expect(
      testAccount.sendTransaction({
        to: saleWithInvalidGulper.address,
        value: ethers.utils.parseEther(amountToBuy),
      })
    ).to.be.revertedWith("reverted with reason string 'gulper malfunction'");
  });

  it("LS_CPPT: Calculate Price; Supplied 0 eth", async function () {
    let amountEth = "0";

    // Should Revert
    await expect(
      sale.calculatePricePerToken(web3.utils.toWei(amountEth))
    ).to.be.revertedWith(
      "reverted with panic code 0x12 (Division or modulo division by zero)"
    );
  });

  it("LS_CPPT: Calculate Price; Supplied 2 eth", async function () {
    let raisedBefore = await sale.raised();

    let amountEth = "2";

    let price = await sale.calculatePricePerToken(web3.utils.toWei(amountEth));

    let calculatedPrice = web3.utils.fromWei(
      calculatePrice(
        web3.utils.toWei(amountEth),
        raisedBefore.toString()
      ).toString()
    );

    // console.log("Token Price: ", web3.utils.fromWei(price.toString()));
    // console.log("Calculated token Price: ", calculatedPrice);

    // RETURNS
    expect(web3.utils.fromWei(price.toString())).to.equal(calculatedPrice);
  });

  it("LS_CTR: Supplied 0 eth", async function () {
    let amountToBuy = "0";
    let raisedBefore = await sale.raised();
    // Buy 1 eth of Levr
    let tokenAmount = await sale.calculateTokensReceived(
      web3.utils.toWei(amountToBuy)
    );

    // console.log(
    //   "Account 0 Tokens: ",
    //   web3.utils.fromWei(gulperAccountBalance.toString())
    // );

    // Calculate expected tokens received
    let calculatedTokenAmount = calculateTokensReceived(
      web3.utils.toWei(amountToBuy),
      raisedBefore
    );
    // console.log(
    //   "Calculated tokens: ",
    //   web3.utils.fromWei(calculatedTokenAmount.toString())
    // );

    expect(tokenAmount).to.equal(calculatedTokenAmount.toString());
  });

  it("LS_CTR: Supplied 1 eth", async function () {
    let amountToBuy = "1";
    let raisedBefore = await sale.raised();
    // Calculate tokens received for 1 eth of Levr
    let tokenAmount = await sale.calculateTokensReceived(
      web3.utils.toWei(amountToBuy)
    );

    // console.log("amountToBuy: ", web3.utils.toWei(amountToBuy));

    let gulperAccountBalance = await levr.balanceOf(gulperAccount.address);
    // console.log("Tokens: ", web3.utils.fromWei(tokenAmount.toString()));

    // Calculate expected tokens received
    let calculatedTokenAmount = calculateTokensReceived(
      web3.utils.toWei(amountToBuy).toString(),
      raisedBefore.toString()
    );
    // console.log("Calculated tokens: ", calculatedTokenAmount.toString());

    expect(tokenAmount.toString()).to.equal(calculatedTokenAmount.toString());
  });

  // return; // Don't run graph data generation

  it("Multiple buy Test", async function () {
    //let incline = "389564392300000000000000000000000000000000000000"; // 5% Start
    //let incline = "305249378105604451351096324563797880934725117350"; // 1% Start
    //let incline = "465831239517769992455746636833534334196354427279"; // 10% Start

    // Wolfram equation to get incline value
    // Divide[\(40)2 \(40)2*Power[10,21]\(41) Power[\(40)1*Power[10,26]\(41),2] + \(40)2*Power[10,22]\(41) Power[1*Power[10,26],2] + 2 sqrt\(40)Power[\(40)2*Power[10,21]\(41),2] Power[\(40)\(40)1*Power[10,26]\(41),4] + \(40)2*Power[10,21]\(41) \(40)2*Power[10,22]\(41) Power[1*Power[10,26],4]\(41)\(41),\(40)2 Power[\(40)2*Power[10,22]\(41),2]\(41)]

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    const admin = await ethers.getSigner(accountToImpersonate);
    // console.log("Admin: ", admin);
    await testAccount.sendTransaction({
      to: accountToImpersonate,
      value: ethers.utils.parseEther("1.0"),
    });
    // send enough ether to testAccount to do all the buys
    await gulperAccount.sendTransaction({
      to: testAccount.address,
      value: ethers.utils.parseEther("9999.0"),
    });
    await liquidityAccount.sendTransaction({
      to: testAccount.address,
      value: ethers.utils.parseEther("9999.0"),
    });
    // console.log("Admin Balance: ", adminBal);
    // admin.sendTransaction(await levr.addMinter(sale.address));
    await levr.connect(admin).addMinter(sale.address);

    // console.log("isMinter: ", await levr.isMinter(admin.address));

    let tokensIssued = 0;
    let totalRaised = 0;
    let amountRaised = 0;
    let testAccountBalance = 0;
    let gulperAccountBalance = 0;
    let liquidityAccountBalance = 0;
    let foundryAccountBalance = 0;
    let treasuryAccountBalance = 0;
    let testAccountCalculatedBalance = BigNumber.from(0);
    let liquidityAccountCalculatedBalance = BigNumber.from(0);
    let foundryAccountCalculatedBalance = BigNumber.from(0);
    let treasuryAccountCalculatedBalance = BigNumber.from(0);

    let issueRecords = [];

    let numberOfBuys = 100;
    let etherToSpend = "1.0";

    for (let i = 0; i < numberOfBuys; i++) {
      amountRaised = await sale.raised();
      // console.log("Amount raised: ", amountRaised.toString());
      let gulperAccountBalanceBefore = await gulperAccount.getBalance();
      let buyTx = await sale.buy(testAccount.address, {
        value: web3.utils.toWei(etherToSpend),
      });

      tokensIssued = await sale.tokensIssued();
      // console.log(
      //   "Tokens Issued: ",
      //   web3.utils.fromWei(tokensIssued.toString())
      // );

      // Check account balances

      testAccountBalance = await levr.balanceOf(testAccount.address);
      gulperAccountBalance = await gulperAccount.getBalance(); // eth balance of gulper
      liquidityAccountBalance = await levr.balanceOf(liquidityAccount.address);
      foundryAccountBalance = await levr.balanceOf(foundryAccount.address);
      treasuryAccountBalance = await levr.balanceOf(treasuryAccount.address);

      let tmpCalculated = calculateTokensReceived(
        web3.utils.toWei(etherToSpend),
        amountRaised
      );

      // console.log("Round: ", i);
      testAccountCalculatedBalance = testAccountCalculatedBalance.add(
        tmpCalculated.div(7).mul(4)
      );
      liquidityAccountCalculatedBalance = liquidityAccountCalculatedBalance.add(
        tmpCalculated.div(7)
      );
      foundryAccountCalculatedBalance = foundryAccountCalculatedBalance.add(
        tmpCalculated.div(7)
      );
      treasuryAccountCalculatedBalance = treasuryAccountCalculatedBalance.add(
        tmpCalculated.div(7)
      );

      expect(testAccountBalance).to.equal(
        testAccountCalculatedBalance.toString()
      );
      expect(gulperAccountBalance.sub(gulperAccountBalanceBefore)).to.equal(
        web3.utils.toWei(etherToSpend)
      );
      expect(liquidityAccountBalance).to.equal(
        liquidityAccountCalculatedBalance.toString()
      );
      expect(foundryAccountBalance).to.equal(
        foundryAccountCalculatedBalance.toString()
      );
      expect(treasuryAccountBalance).to.equal(
        treasuryAccountCalculatedBalance.toString()
      );

      // EVENTS
      expect(buyTx)
        .to.emit(sale, "Bought")
        .withArgs(testAccount.address, tmpCalculated.toString());

      totalRaised = await sale.raised();
      // console.log("Total Raised: ", web3.utils.fromWei(totalRaised.toString()));

      issueRecords.push([
        i,
        web3.utils.fromWei(totalRaised.toString().replace(",", "")),
        web3.utils.fromWei(tokensIssued.toString().replace(",", "")),
      ]);
    }

    const csvWriter = createCsvWriter({
      header: ["Buy Count", "Raised", "Total Tokens Issued"],
      path: "levrData.csv",
      fieldDelimiter: ";",
    });

    csvWriter.writeRecords(issueRecords).then(() => {
      console.log("Written to csv");
    });

    // console.log(
    //   "Total Supply: ",
    //   web3.utils.fromWei((await levr.totalSupply()).toString())
    // );
  });
});

async function resetChain() {
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl:
            "https://arb-mainnet.g.alchemy.com/v2/3VktAs9-jOfFCrGAiD-dKd4KzggT13rf",
          blockNumber: 3843242,
        },
      },
    ],
  });
}

function calculateTokensReceived(ethAmount, raisedBefore) {
  const eth = BigNumber.from(ethAmount);
  const raised = BigNumber.from(raisedBefore);
  let inc = BigNumber.from(incline);

  const two = BigNumber.from(2);
  const ten = BigNumber.from(10);
  const wad = ten.pow(18);

  inc = inc.div(wad);

  // sqrt(uint(2) * _inclineWAD * _raised / WAD);

  let tokens = two.mul(inc).mul(eth.add(raised));
  tokens = sqrt(tokens);
  let alreadyRaised = two.mul(inc).mul(raised);
  alreadyRaised = sqrt(alreadyRaised);
  tokens = tokens.sub(alreadyRaised);

  // console.log("Tokens (func): ", tokens);

  return tokens;
}

function calculatePrice(_supplied, _raisedBefore) {
  // _price = pureCalculateTokensRecieved(_inclineWAD, _alreadyRaised, _supplied) * WAD / _supplied;

  const raisedBefore = BigNumber.from(_raisedBefore);
  const supplied = BigNumber.from(_supplied);
  const ten = BigNumber.from(10);
  const wad = ten.pow(18);

  let tokensReceived = calculateTokensReceived(
    supplied.toString(),
    raisedBefore.toString()
  );

  return supplied.mul(wad).div(tokensReceived);
}

function sqrt(value) {
  const ONE = ethers.BigNumber.from(1);
  const TWO = ethers.BigNumber.from(2);
  x = BigNumber.from(value);
  let z = x.add(ONE).div(TWO);
  let y = x;
  while (z.sub(y).isNegative()) {
    y = z;
    z = x.div(z).add(z).div(TWO);
  }
  return y;
}
