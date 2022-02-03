//const Web3 = require("web3");
const { expect } = require("chai");
const { ethers, network, eth, web3 } = require("hardhat");
const createCsvWriter = require("csv-writer").createArrayCsvWriter;
const { BigNumber } = require("ethers");

const testLevrAddress = "0xce0F718BD518E38A479fcB0187B67c2Eb57c5e1D";
const accountToImpersonate = "0x20BD917E2fc207AC80a15b034B4dBAa296065216";
//let incline = "1212871000000000000000000000000000000000000000000"; // 1% Start
let incline = "1224876200000000000000000000000000000000000000000"; // 1% Start (3.5M tokens)
//let incline = "149572000000000000000000000000000000000000000000";

//let web3 = new Web3("ws://localhost:8545");
let initialEthRaised = web3.utils.toWei("5.00050535719446");
let zeroAddress = "0x0000000000000000000000000000000000000000";
let LEVR;
let levr;
let Sale;
let sale;
let GulpE;
let gulpE;
let [
    testAccount,
    gulperAccount,
    liquidityAccount,
    foundryAccount,
    treasuryAccount,
    referrer,
    extra1,
    extra2,
    extra3,
] = ["", "", "", "", ""];
let prov = ethers.getDefaultProvider();

describe("LevrSale Tests", function () {
    // Reset to fork before each test
    beforeEach(async function () {
        resetChain();

        // Get LEVR test token contract that was launched on Arbitrum
        ERC20 = await hre.ethers.getContractFactory(
            "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20"
        );
        LEVR = await hre.ethers.getContractFactory("LEVR");
        levr = await LEVR.attach(testLevrAddress);
        dai = await ERC20.attach("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1");

        // Get test accounts
        [
            testAccount,
            gulperAccount,
            liquidityAccount,
            foundryAccount,
            treasuryAccount,
            referrer,
            extra1,
            extra2,
            extra3,
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
            foundryAccount.address // foundryTreasury
        );

        await sale.deployed();

        // // Deploy Eth Gulper
        // // DAI/USDT/USDC: 0x1533a3278f3f9141d5f820a184ea4b017fce2382000000000000000000000016
        // GulpE = await hre.ethers.getContractFactory("GulperE");
        // gulpE = await GulpE.deploy(
        //     "0x7E1d0353063F01CfFa92f4a9C8A100cFE37d8264",
        //     "0xBA12222222228d8Ba445958a75a0704d566BF2C8" // Vault address
        // );

        // await gulpE.deployed();

        // // Deploy Dai swap tool
        // SwapTool = await hre.ethers.getContractFactory("SwapEthDaiTool");
        // swapTool = await SwapTool.deploy();

        // await swapTool.deployed();
    });

    // it("GULPE: ETH Gulper test 1", async function () {
    //     // Send eth to eth swap
    //     console.log("Block number: ", await web3.eth.getBlockNumber());
    //     // await testAccount.sendTransaction({
    //     //     to: swapTool.address,
    //     //     value: ethers.utils.parseEther("10"),
    //     // });
    //     await testAccount.sendTransaction({
    //         to: gulpE.address,
    //         value: ethers.utils.parseEther("10"),
    //     });
    //     console.log(
    //         "Gulper eth Balance: ",
    //         await web3.eth.getBalance(gulpE.address)
    //     );
    //     // console.log("Dai Balance: ", await dai.balanceOf(testAccount.address));
    //     // await dai.transfer(gulpE.address, ethers.utils.parseEther("6000.0"));
    //     console.log("Gulper test: ", await gulpE.getInfo());
    //     //console.log("Encoded userdata: ", await gulpE.userDataStorage());
    //     // console.log(
    //     //     "Impersonate Account balance: ",
    //     //     await web3.eth.getBalance(
    //     //         "0x20BD917E2fc207AC80a15b034B4dBAa296065216"
    //     //     )
    //     // );
    //     // console.log(
    //     //     "Elmer Account balance: ",
    //     //     await web3.eth.getBalance(
    //     //         "0x7E1d0353063F01CfFa92f4a9C8A100cFE37d8264"
    //     //     )
    //     // );
    //     // console.log(
    //     //     "Gulper balance: ",
    //     //     await web3.eth.getBalance(gulpE.address)
    //     // );
    //     //
    //     // console.log("Dai Balance Before: ", await dai.balanceOf(gulpE.address));
    //     await gulpE.joinPool({
    //         gasLimit: 30000000,
    //         value: web3.utils.toWei("0.01"),
    //     });
    //     // console.log("Dai Balance After: ", await dai.balanceOf(gulpE.address));
    //     // console.log(
    //     //     "Gulper balance after: ",
    //     //     await web3.eth.getBalance(gulpE.address)
    //     // );
    // });

    it("LS_C: Constructor", async function () {
        // Calculate initial tokens issued
        let initialTokensIssued = calculateTokensReceived(
            initialEthRaised,
            "0"
        );

        // console.log("Starting Levr: ", initialTokensIssued);
        expect(await sale.inclineWAD()).to.equal(incline);
        expect(await sale.tokenOnSale()).to.equal(levr.address);
        expect(await sale.gulper()).to.equal(gulperAccount.address);
        expect(await sale.treasury()).to.equal(treasuryAccount.address);
        expect(await sale.foundryTreasury()).to.equal(foundryAccount.address);
        expect(await sale.tokensSold()).to.equal(initialTokensIssued);
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
        let tokensIssuedBefore = await sale.tokensSold();

        //console.log("Tokens Sold Initial: ", tokensIssuedBefore);

        // Buy 0 Levr

        let buyTx = await sale.buy(gulperAccount.address, zeroAddress, {
            value: web3.utils.toWei("0"),
        });

        // STATE
        let totalRaised = await sale.raised();
        let tokensIssued = await sale.tokensSold();
        //   console.log("Total Raised: ", totalRaised);

        let testAccountBalance = await levr.balanceOf(testAccount.address);
        let gulperAccountBalance = await gulperAccount.getBalance(); // eth balance of gulper
        let foundryAccountBalance = await levr.balanceOf(
            foundryAccount.address
        );
        let treasuryAccountBalance = await levr.balanceOf(
            treasuryAccount.address
        );

        expect(testAccountBalance).to.equal("0");
        expect(gulperAccountBalance.sub(gulperAccountBalanceBefore)).to.equal(
            web3.utils.toWei("0")
        );
        expect(foundryAccountBalance).to.equal("0");
        expect(treasuryAccountBalance).to.equal("0");
        expect(tokensIssued).to.equal(tokensIssuedBefore);
        expect(totalRaised).to.equal(initialEthRaised);

        // EVENTS
        expect(buyTx)
            .to.emit(sale, "Bought")
            .withArgs(gulperAccount.address, zeroAddress, "0");
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
        let tokensIssuedBefore = await sale.tokensSold();

        let testAccountBalanceBefore = await levr.balanceOf(
            testAccount.address
        );

        let tokensReceivedCalculatedWithContract =
            await sale.calculateTokensReceived(web3.utils.toWei(amountToBuy));

        // Buy Levr
        let buyTx = await sale.buy(testAccount.address, zeroAddress, {
            value: web3.utils.toWei(amountToBuy),
        });

        // STATE
        let totalRaised = await sale.raised();
        let tokensIssued = await sale.tokensSold();

        let testAccountBalance = await levr.balanceOf(testAccount.address);

        let gulperAccountEthBalance = await gulperAccount.getBalance(); // eth balance of gulper
        let gulperAccountLevrBalance = await levr.balanceOf(
            gulperAccount.address
        );
        let foundryAccountBalance = await levr.balanceOf(
            foundryAccount.address
        );
        let treasuryAccountBalance = await levr.balanceOf(
            treasuryAccount.address
        );

        // Calculate expected tokens received
        let calculatedTokenAmountWithJS = calculateTokensReceived(
            web3.utils.toWei(amountToBuy),
            raisedBefore
        );

        // Expected token amount calculated with JS function
        expect(testAccountBalance).to.equal(calculatedTokenAmountWithJS);
        // Expected token amount from contract calculatedTokensReturned function
        expect(testAccountBalance).to.equal(
            tokensReceivedCalculatedWithContract
        );
        expect(
            gulperAccountEthBalance.sub(gulperAccountBalanceBefore)
        ).to.equal(web3.utils.toWei(amountToBuy));

        // Gulper balance
        expect(gulperAccountLevrBalance).to.equal(
            calculatedTokenAmountWithJS.div(35).mul(25).toString()
        );

        // Foundry balance
        expect(foundryAccountBalance).to.equal(
            calculatedTokenAmountWithJS.div(35).mul(5).toString()
        );

        // Treasury balance
        expect(treasuryAccountBalance).to.equal(
            calculatedTokenAmountWithJS.toString()
        );

        // Tokens issued
        expect(tokensIssued).to.equal(
            calculatedTokenAmountWithJS.add(tokensIssuedBefore).toString()
        );

        // Total raised
        expect(totalRaised).to.equal(
            raisedBefore.add(web3.utils.toWei(amountToBuy))
        );

        // EVENTS
        expect(buyTx)
            .to.emit(sale, "Bought")
            .withArgs(
                testAccount.address,
                zeroAddress,
                calculatedTokenAmountWithJS.toString()
            );
    });

    it("LS_B: Buy Levr with referrer", async function () {
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

        let amountToBuy = "20.0";
        let raisedBefore = await sale.raised();
        //console.log("Raised Before: ", raisedBefore);
        let gulperAccountBalanceBefore = await gulperAccount.getBalance();
        let tokensIssuedBefore = await sale.tokensSold();
        let tokensReceivedCalculatedWithContract =
            await sale.calculateTokensReceived(web3.utils.toWei(amountToBuy));

        // Buy Levr
        let buyTx = await sale.buy(testAccount.address, referrer.address, {
            value: web3.utils.toWei(amountToBuy),
        });

        let referrerBalance = await levr.balanceOf(referrer.address);
        // STATE
        let totalRaised = await sale.raised();
        let tokensIssued = await sale.tokensSold();

        let testAccountBalance = await levr.balanceOf(testAccount.address);

        let gulperAccountEthBalance = await gulperAccount.getBalance(); // eth balance of gulper
        let gulperAccountLevrBalance = await levr.balanceOf(
            gulperAccount.address
        );
        let foundryAccountBalance = await levr.balanceOf(
            foundryAccount.address
        );
        let treasuryAccountBalance = await levr.balanceOf(
            treasuryAccount.address
        );

        // Calculate expected tokens received
        let calculatedTokenAmountWithJS = calculateTokensReceived(
            web3.utils.toWei(amountToBuy),
            raisedBefore
        );

        // Expected token amount calculated with JS function
        expect(testAccountBalance).to.equal(calculatedTokenAmountWithJS);
        // Expected token amount from contract calculatedTokensReturned function
        expect(testAccountBalance).to.equal(
            tokensReceivedCalculatedWithContract
        );
        expect(
            gulperAccountEthBalance.sub(gulperAccountBalanceBefore)
        ).to.equal(web3.utils.toWei(amountToBuy));

        // Gulper balance
        expect(gulperAccountLevrBalance).to.equal(
            calculatedTokenAmountWithJS.div(35).mul(25).toString()
        );

        // Foundry balance
        expect(foundryAccountBalance).to.equal(
            calculatedTokenAmountWithJS.div(35).mul(5).toString()
        );

        // Referrer balance
        expect(referrerBalance).to.equal(
            calculatedTokenAmountWithJS.div(35).mul(5).toString()
        );

        // Treasury balance
        expect(treasuryAccountBalance).to.equal(
            calculatedTokenAmountWithJS.toString()
        );

        // Tokens issued
        expect(tokensIssued).to.equal(
            calculatedTokenAmountWithJS.add(tokensIssuedBefore).toString()
        );

        // Total raised
        expect(totalRaised).to.equal(
            raisedBefore.add(web3.utils.toWei(amountToBuy))
        );

        // EVENTS
        expect(buyTx)
            .to.emit(sale, "Bought")
            .withArgs(
                testAccount.address,
                referrer.address,
                calculatedTokenAmountWithJS.toString()
            );
    });

    it("LS_B: Buy Levr with invalid gulper", async function () {
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToImpersonate],
        });

        // Deploy invalid gulper
        let BlankContract = await hre.ethers.getContractFactory(
            "BlankContract"
        );
        let blankContract = await BlankContract.deploy();
        // Deploy Sale
        let SaleWithInvalidGulper = await hre.ethers.getContractFactory("Sale");
        let saleWithInvalidGulper = await SaleWithInvalidGulper.deploy(
            incline,
            levr.address,
            blankContract.address, // gulper
            treasuryAccount.address, // treasury
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

        let amountToBuy = "2.0";
        let raisedBefore = await saleWithInvalidGulper.raised();
        let gulperAccountBalanceBefore = await gulperAccount.getBalance();

        // Should Revert
        await expect(
            saleWithInvalidGulper.buy(testAccount.address, zeroAddress, {
                value: web3.utils.toWei(amountToBuy),
            })
        ).to.be.revertedWith(
            "reverted with reason string 'gulper malfunction'"
        );
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
        let tokensIssuedBefore = await sale.tokensSold();
        // Buy 0 Levr
        let buyTx = await testAccount.sendTransaction({
            to: sale.address,
            value: ethers.utils.parseEther("0"),
        });

        // STATE
        let totalRaised = await sale.raised();
        let tokensIssued = await sale.tokensSold();
        //   console.log("Total Raised: ", totalRaised);

        let testAccountBalance = await levr.balanceOf(testAccount.address);
        let gulperAccountBalance = await gulperAccount.getBalance(); // eth balance of gulper
        let foundryAccountBalance = await levr.balanceOf(
            foundryAccount.address
        );
        let treasuryAccountBalance = await levr.balanceOf(
            treasuryAccount.address
        );

        expect(testAccountBalance).to.equal("0");
        expect(gulperAccountBalance.sub(gulperAccountBalanceBefore)).to.equal(
            web3.utils.toWei("0")
        );
        expect(foundryAccountBalance).to.equal("0");
        expect(treasuryAccountBalance).to.equal("0");
        expect(tokensIssued).to.equal(tokensIssuedBefore);
        expect(totalRaised).to.equal(totalRaised);

        // EVENTS
        expect(buyTx)
            .to.emit(sale, "Bought")
            .withArgs(testAccount.address, zeroAddress, "0");
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
        let tokensIssuedBefore = await sale.tokensSold();
        let tokensReceivedCalculatedWithContract =
            await sale.calculateTokensReceived(web3.utils.toWei(amountToBuy));

        // Buy Levr by simply sending eth to the contract
        let buyTx = await testAccount.sendTransaction({
            to: sale.address,
            value: ethers.utils.parseEther(amountToBuy),
        });

        // STATE
        let totalRaised = await sale.raised();
        let tokensIssued = await sale.tokensSold();

        let testAccountBalance = await levr.balanceOf(testAccount.address);

        let gulperAccountEthBalance = await gulperAccount.getBalance(); // eth balance of gulper
        let gulperAccountLevrBalance = await levr.balanceOf(
            gulperAccount.address
        );
        let foundryAccountBalance = await levr.balanceOf(
            foundryAccount.address
        );
        let treasuryAccountBalance = await levr.balanceOf(
            treasuryAccount.address
        );

        // Calculate expected tokens received
        let calculatedTokenAmountWithJS = calculateTokensReceived(
            web3.utils.toWei(amountToBuy),
            raisedBefore
        );

        // Expected token amount calculated with JS function
        expect(testAccountBalance).to.equal(calculatedTokenAmountWithJS);
        // Expected token amount from contract calculatedTokensReturned function
        expect(testAccountBalance).to.equal(
            tokensReceivedCalculatedWithContract
        );
        expect(
            gulperAccountEthBalance.sub(gulperAccountBalanceBefore)
        ).to.equal(web3.utils.toWei(amountToBuy));

        // Gulper balance
        expect(gulperAccountLevrBalance).to.equal(
            calculatedTokenAmountWithJS.div(35).mul(25).toString()
        );

        // Foundry balance
        expect(foundryAccountBalance).to.equal(
            calculatedTokenAmountWithJS.div(35).mul(5).toString()
        );

        // Treasury balance
        expect(treasuryAccountBalance).to.equal(
            calculatedTokenAmountWithJS.toString()
        );

        // Tokens issued
        expect(tokensIssued).to.equal(
            calculatedTokenAmountWithJS.add(tokensIssuedBefore).toString()
        );

        // Total raised
        expect(totalRaised).to.equal(
            raisedBefore.add(web3.utils.toWei(amountToBuy))
        );

        // EVENTS
        expect(buyTx)
            .to.emit(sale, "Bought")
            .withArgs(
                testAccount.address,
                zeroAddress,
                calculatedTokenAmountWithJS.toString()
            );
    });

    it("LS_B: Buy Levr with invalid gulper (by just sending eth)", async function () {
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToImpersonate],
        });

        // Deploy invalid gulper
        let BlankContract = await hre.ethers.getContractFactory(
            "BlankContract"
        );
        let blankContract = await BlankContract.deploy();
        // Deploy Sale
        let SaleWithInvalidGulper = await hre.ethers.getContractFactory("Sale");
        let saleWithInvalidGulper = await SaleWithInvalidGulper.deploy(
            incline,
            levr.address,
            blankContract.address, // gulper
            treasuryAccount.address, // treasury
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

        // Should Revert
        await expect(
            testAccount.sendTransaction({
                to: saleWithInvalidGulper.address,
                value: ethers.utils.parseEther(amountToBuy),
            })
        ).to.be.revertedWith(
            "reverted with reason string 'gulper malfunction'"
        );
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

    it("LS_CPPT: Calculate Price", async function () {
        let raisedBefore = await sale.raised();

        let amountEth = "2";

        let price = await sale.calculatePricePerToken(
            web3.utils.toWei(amountEth)
        );

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

        expect(tokenAmount.toString()).to.equal(
            calculatedTokenAmount.toString()
        );
    });

    //return; // Don't run graph data generation

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
        await extra1.sendTransaction({
            to: testAccount.address,
            value: ethers.utils.parseEther("9999.0"),
        });
        await extra2.sendTransaction({
            to: testAccount.address,
            value: ethers.utils.parseEther("9999.0"),
        });
        await extra3.sendTransaction({
            to: testAccount.address,
            value: ethers.utils.parseEther("9999.0"),
        });

        // console.log("Admin Balance: ", adminBal);
        // admin.sendTransaction(await levr.addMinter(sale.address));
        await levr.connect(admin).addMinter(sale.address);

        // console.log("Price per token New Method: ", await sale.getCurrentPrice());

        // console.log("isMinter: ", await levr.isMinter(admin.address));

        let tokensIssued = 0;
        let totalRaised = 0;
        let amountRaised = 0;
        let testAccountBalance = 0;
        let gulperAccountBalanceBefore = await gulperAccount.getBalance();
        let foundryAccountBalance = 0;
        let treasuryAccountBalance = 0;
        let testAccountCalculatedBalance = BigNumber.from(0);
        let foundryAccountCalculatedBalance = BigNumber.from(0);
        let treasuryAccountCalculatedBalance = BigNumber.from(0);

        let issueRecords = [];

        let numberOfBuys = 100;
        let etherToSpend = "500.0";

        // amountRaised = await sale.raised();
        // tokensIssued = await sale.tokensSold();
        // issueRecords.push([
        //     0,
        //     web3.utils.fromWei(amountRaised.toString().replace(",", "")),
        //     web3.utils.fromWei(tokensIssued.toString().replace(",", "")),
        // ]);

        console.log(
            "Eth paid for 3.5M tokens: ",
            calculateEthPaid(web3.utils.toWei("3500000").toString())
        );
        console.log(
            "Tokens for eth: ",
            calculateTokensReceived(
                web3.utils.toWei("5.0500011955104871").toString(),
                "0"
            )
        );

        //return;

        for (let i = 0; i < numberOfBuys; i++) {
            amountRaised = await sale.raised();
            // console.log("Amount raised: ", amountRaised.toString());
            let gulperAccountEthBalanceBefore =
                await gulperAccount.getBalance();
            let buyTx = await sale.buy(testAccount.address, zeroAddress, {
                value: web3.utils.toWei(etherToSpend),
            });

            tokensIssued = await sale.tokensSold();
            // console.log(
            //   "Tokens Issued: ",
            //   web3.utils.fromWei(tokensIssued.toString())
            // );

            // Check account balances

            testAccountBalance = await levr.balanceOf(testAccount.address);
            gulperAccountEthBalance = await gulperAccount.getBalance(); // eth balance of gulper
            let gulperAccountLevrBalance = await levr.balanceOf(
                gulperAccount.address
            );
            foundryAccountBalance = await levr.balanceOf(
                foundryAccount.address
            );
            treasuryAccountBalance = await levr.balanceOf(
                treasuryAccount.address
            );

            let tmpCalculated = calculateTokensReceived(
                web3.utils.toWei(etherToSpend),
                amountRaised
            );

            // console.log("Round: ", i);
            testAccountCalculatedBalance =
                testAccountCalculatedBalance.add(tmpCalculated);
            foundryAccountCalculatedBalance =
                foundryAccountCalculatedBalance.add(
                    tmpCalculated.div(35).mul(5)
                );
            treasuryAccountCalculatedBalance =
                treasuryAccountCalculatedBalance.add(tmpCalculated);

            expect(testAccountBalance).to.equal(
                testAccountCalculatedBalance.toString()
            );
            expect(
                gulperAccountEthBalance.sub(gulperAccountEthBalanceBefore)
            ).to.equal(web3.utils.toWei(etherToSpend));
            expect(foundryAccountBalance).to.equal(
                foundryAccountCalculatedBalance.toString()
            );
            expect(treasuryAccountBalance).to.equal(
                treasuryAccountCalculatedBalance.toString()
            );

            // EVENTS
            expect(buyTx)
                .to.emit(sale, "Bought")
                .withArgs(
                    testAccount.address,
                    zeroAddress,
                    tmpCalculated.toString()
                );

            totalRaised = await sale.raised();
            // console.log("Total Raised: ", web3.utils.fromWei(totalRaised.toString()));

            // console.log("Price per token: ", await sale.calculatePricePerToken("1"));
            // console.log("Price per token New Method: ", await sale.getCurrentPrice());

            issueRecords.push([
                i + 1,
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

        console.log(
            "Total Sold: ",
            web3.utils.fromWei((await sale.tokensSold()).toString())
        );
        console.log(
            "Total Ether raised: ",
            web3.utils.fromWei(
                (await gulperAccount.getBalance())
                    .sub(gulperAccountBalanceBefore)
                    .toString()
            )
        );
    });

    it("Hit sold out limit", async function () {
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
        await extra1.sendTransaction({
            to: testAccount.address,
            value: ethers.utils.parseEther("9999.0"),
        });
        await extra2.sendTransaction({
            to: testAccount.address,
            value: ethers.utils.parseEther("9999.0"),
        });
        await extra3.sendTransaction({
            to: testAccount.address,
            value: ethers.utils.parseEther("9999.0"),
        });

        await levr.connect(admin).addMinter(sale.address);

        let tokensIssued = 0;
        let amountRaised = 0;
        let testAccountBalance = 0;
        let foundryAccountBalance = 0;
        let treasuryAccountBalance = 0;

        let numberOfBuys = 10;
        let etherToSpend = "5000.0";

        for (let i = 0; i < numberOfBuys; i++) {
            amountRaised = await sale.raised();
            // console.log("Amount raised: ", amountRaised.toString());
            let gulperAccountEthBalanceBefore =
                await gulperAccount.getBalance();
            let buyTx = await sale.buy(testAccount.address, zeroAddress, {
                value: web3.utils.toWei(etherToSpend),
            });
        }

        // Should Revert
        await expect(
            sale.buy(testAccount.address, zeroAddress, {
                value: web3.utils.toWei(etherToSpend),
            })
        ).to.be.revertedWith("reverted with reason string 'Tokens sold out'");
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

    //tokens = tokens.div(35);
    //tokens = tokens.mul(35);
    // console.log("Tokens (func): ", tokens);

    return tokens;
}

function calculateEthPaid(tokenAmount) {
    const tokens = BigNumber.from(tokenAmount);
    let inc = BigNumber.from(incline);

    const two = BigNumber.from(2);
    const ten = BigNumber.from(10);
    const wad = ten.pow(18);

    inc = inc.div(wad);

    // sqrt(uint(2) * _inclineWAD * _raised / WAD);

    let eth = tokens.mul(tokens).div(two.mul(inc));

    return eth;
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
