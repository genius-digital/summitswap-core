import dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "tsconfig-paths/register";
import "hardhat-gas-reporter";
import "@typechain/hardhat";
import "solidity-coverage";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const accounts = ["1189301c17da756875ce6b32784eea087534fec43cd14135b657a77467ece451"];
// const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

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
    ],
  },
  networks: {
    56: {
      url: "https://bsc-dataseed.binance.org/",
      accounts,
    },
    97: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts,
      timeout: 200000,
      gas: 4000000,
    },
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: "USD",
  },
  etherscan: {
    apiKey: "1I7FAQEBXEPZECAXYRGQ3T3FB9WHJAN4WA",
    // apiKey: process.env.BSCSCAN_API_KEY,
  },
} as HardhatUserConfig;
