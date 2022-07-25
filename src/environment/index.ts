import hre from "hardhat";

const WBNBs = {
  "56": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "97": "0xae13d989dac2f0debff460ac112a837c89baa7cd",
} as Record<string, string>;

const BUSDs = {
  "56": "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  "97": "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7",
} as Record<string, string>;

const KODAs = {
  "56": "0x8094e772fA4A60bdEb1DfEC56AB040e17DD608D5",
  "97": "0x063646d9C4eCB1c341bECdEE162958f072C43561",
} as Record<string, string>;

const SummitswapFactories = {
  "56": "0x7067079bc460d2c5984cC89008786fE46839FCF0",
  "97": "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B",
} as Record<string, string>;

const SummitswapRouters = {
  "56": "0x2e8C54d980D930C16eFeb28f7061b0f3A78c0A87",
  "97": "0x1ebCD5e8a378F3b72900bF5BaEb073872f105B73",
} as Record<string, string>;

const PancakeswapRouters = {
  "56": "0x10ed43c718714eb63d5aa57b78b54704e256024e",
  "97": "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3",
} as Record<string, string>;

const RpcUrls = {
  "56": "https://bsc-dataseed.binance.org/",
  "97": "https://data-seed-prebsc-1-s1.binance.org:8545/",
} as Record<string, string>;

const VERIFY_SUPPORTED_ON = ["56", "97"];

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export const MAX_VALUE = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
export const ADMIN_ROLE = "0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42";

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
  PANCAKESWAP_ROUTERS: PancakeswapRouters,
  PANCAKESWAP_ROUTER: PancakeswapRouters[hre.network.name],
  RPC_URLS: RpcUrls,
  RPC_URL: RpcUrls[hre.network.name],
  IS_VERIFY_SUPPORTED: VERIFY_SUPPORTED_ON.includes(hre.network.name),
};
