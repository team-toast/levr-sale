require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.5.17",
            },
            {
                version: "0.8.10",
                settings: {},
            },
        ],
    },
    networks: {
        hardhat: {
            forking: {
                url: "https://arb-mainnet.g.alchemy.com/v2/3VktAs9-jOfFCrGAiD-dKd4KzggT13rf",
                blockNumber: 3843242,
            },
        },
    },
    mocha: {
        timeout: 200000,
    },
};
