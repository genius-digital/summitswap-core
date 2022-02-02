import hre from "hardhat";

const WBNBs = {
  "56": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "97": "0xae13d989dac2f0debff460ac112a837c89baa7cd",
} as Record<string, string>;

const BUSDs = {
  "56": "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  "97": "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7",
} as Record<string, string>;

const SummitswapFactories = {
  "97": "0x765317D857df6BceA1B3489b8B66422B9967eF8B",
} as Record<string, string>;

const SummitswapRouters = {
  "97": "0x1ebCD5e8a378F3b72900bF5BaEb073872f105B73",
} as Record<string, string>;

const SummitswapReferrals = {
  "97": "0x7460E14B141e1978439C350E96862De684c91353",
} as Record<string, string | undefined>;

const SummitswapMiddlemans = {
  "97": "0x88343503c9B9db8ce00d9dB364D7c89C295dA60E",
} as Record<string, string | undefined>;

const RpcUrls = {
  "56": "https://bsc-dataseed.binance.org/",
  "97": "https://data-seed-prebsc-1-s1.binance.org:8545/",
} as Record<string, string>;

const VERIFY_SUPPORTED_ON = ["56", "97"];

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const environment = {
  WBNBS: WBNBs,
  WBNB: WBNBs[hre.network.name],
  BUSDS: BUSDs,
  BUSD: BUSDs[hre.network.name],
  SUMMITSWAP_FACTORIES: SummitswapFactories,
  SUMMITSWAP_FACTORY: SummitswapFactories[hre.network.name],
  SUMMITSWAP_ROUTERS: SummitswapRouters,
  SUMMITSWAP_ROUTER: SummitswapRouters[hre.network.name],
  SUMMITSWAP_REFERRALS: SummitswapReferrals,
  SUMMITSWAP_REFERRAL: SummitswapReferrals[hre.network.name],
  SUMMITSWAP_MIDDLEMANS: SummitswapMiddlemans,
  SUMMITSWAP_MIDDLEMAN: SummitswapMiddlemans[hre.network.name],
  RPC_URLS: RpcUrls,
  RPC_URL: RpcUrls[hre.network.name],
  IS_VERIFY_SUPPORTED: VERIFY_SUPPORTED_ON.includes(hre.network.name),
};
