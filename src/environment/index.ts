import hre from "hardhat";

const WBNBS = {
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  97: "0xae13d989dac2f0debff460ac112a837c89baa7cd",
} as Record<number, string>;

const RPC_URLS = {
  56: "https://bsc-dataseed.binance.org/",
  97: "https://data-seed-prebsc-1-s1.binance.org:8545/",
} as Record<number, string>;

export const environment = {
  WBNBS,
  WBNB: WBNBS[+hre.network.name],
  RPC_URLS,
  RPC_URL: RPC_URLS[+hre.network.name],
};
