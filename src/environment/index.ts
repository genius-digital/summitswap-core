import hre from "hardhat";

const WBNBs = {
  "56": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "97": "0xae13d989dac2f0debff460ac112a837c89baa7cd",
  "43114": "0x1799aFD227E69e64D8fc55e2B5E62A27e21B33C6",
} as Record<string, string>;

const BUSDs = {
  "56": "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  "97": "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7",
  "43113": "0x01339AeB76b8c582699f08D1f3CC7D922981f2eB",
} as Record<string, string>;

const KODAs = {
  "56": "0x8094e772fA4A60bdEb1DfEC56AB040e17DD608D5",
  "97": "0x063646d9C4eCB1c341bECdEE162958f072C43561",
} as Record<string, string>;

const SummitswapFactories = {
  "56": "0x7067079bc460d2c5984cC89008786fE46839FCF0",
  "97": "0x765317D857df6BceA1B3489b8B66422B9967eF8B",
  "43113": "0xA2C80A33A054B83d789a802efF1a45C5eE3a1f54",
} as Record<string, string>;

const SummitswapRouters = {
  "56": "0x2e8C54d980D930C16eFeb28f7061b0f3A78c0A87",
  "97": "0x1ebCD5e8a378F3b72900bF5BaEb073872f105B73",
  "43113": "0xB1b4e6482e7587F92dFBcfB2673464ec80B689cc",
} as Record<string, string>;

const RpcUrls = {
  "56": "https://bsc-dataseed.binance.org/",
  "97": "https://data-seed-prebsc-1-s1.binance.org:8545/",
  "43113": "https://api.avax-test.network/ext/bc/C/rpc",
} as Record<string, string>;

const VERIFY_SUPPORTED_ON = ["56", "97", "43113", "43114"];

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const environment = {
  WBNBS: WBNBs,
  WBNB: WBNBs[hre.network.name],
  BUSDS: BUSDs,
  BUSD: BUSDs[hre.network.name],
  KODAs: KODAs,
  KODA: KODAs[hre.network.name],
  SUMMITSWAP_FACTORIES: SummitswapFactories,
  SUMMITSWAP_FACTORY: SummitswapFactories[hre.network.name],
  SUMMITSWAP_ROUTERS: SummitswapRouters,
  SUMMITSWAP_ROUTER: SummitswapRouters[hre.network.name],
  RPC_URLS: RpcUrls,
  RPC_URL: RpcUrls[hre.network.name],
  IS_VERIFY_SUPPORTED: VERIFY_SUPPORTED_ON.includes(hre.network.name),
};
