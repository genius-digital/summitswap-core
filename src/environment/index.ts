import hre from "hardhat";

const WBNBs = {
  "56": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "97": "0xae13d989dac2f0debff460ac112a837c89baa7cd",
} as Record<string, string>;

const SummitswapFactory = {
  "97": "0x765317D857df6BceA1B3489b8B66422B9967eF8B",
} as Record<string, string>;

const RpcUrls = {
  "56": "https://bsc-dataseed.binance.org/",
  "97": "https://data-seed-prebsc-1-s1.binance.org:8545/",
} as Record<string, string>;

const VERIFY_SUPPORTED_ON = ["56", "97"];

export const environment = {
  WBNBS: WBNBs,
  WBNB: WBNBs[hre.network.name],
  SUMMITSWAP_FACTORIES: SummitswapFactory,
  SUMMITSWAP_FACTORY: SummitswapFactory[hre.network.name],
  RPC_URLS: RpcUrls,
  RPC_URL: RpcUrls[hre.network.name],
  IS_VERIFY_SUPPORTED: VERIFY_SUPPORTED_ON.includes(hre.network.name),
};
