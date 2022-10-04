import dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "tsconfig-paths/register";
import "hardhat-gas-reporter";
import "@typechain/hardhat";
import "solidity-coverage";
import "hardhat-contract-sizer";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

export default {
  typechain: {
    outDir: "./build/typechain",
  },
  paths: {
    sources: "./src/contracts",
    tests: "./src/tests",
    cache: "./build/cache",
    artifacts: "./build/artifacts",
  },
  solidity: {
    compilers: [
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    1: {
      url: "https://mainnet.infura.io/v3/ea49cb738655406db0978cca8683d96c",
      accounts,
    },
    5: {
      url: "https://goerli.infura.io/v3/ea49cb738655406db0978cca8683d96c",
      accounts,
      timeout: 500000,
      gas: 7000000,
      allowUnlimitedContractSize: true,
    },
    56: {
      url: "https://bsc-dataseed.binance.org/",
      accounts,
    },
    97: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts,
      timeout: 500000,
      gas: 7000000,
      allowUnlimitedContractSize: true,
    },
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
    },
  },
} as HardhatUserConfig;
