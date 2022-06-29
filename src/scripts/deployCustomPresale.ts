import { ethers } from "hardhat";
import dayjs from "dayjs";

interface TokenDetails {
  presalePrice: string;
  listingPrice: string;
  liquidityPrecentage: number;
}

interface BnbAmounts {
  minBuyBnb: string;
  maxBuyBnb: string;
  softCap: string;
  hardCap: string;
}

export async function deployCustomPresale(
  createPresaleFee: string,
  serviceFeeReciever: string,
  router: string,
  tokenDetails: TokenDetails,
  bnbAmounts: BnbAmounts,
  liquidityLockTime: number,
  startPresaleTime: number,
  endPresaleTime: number,
  feeType: number,
  refundType: number,
  isWhiteListPhase: boolean
) {
  const MAX_APPROVE_AMOUNT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  const FEE_DENOMINATOR = 10 ** 9;
  const BNB_FEE_TYPE_1 = 20000000;

  console.log("Starting to deploy SummitPresaleFactory");

  const SummitFactoryPresale = await ethers.getContractFactory("SummitFactoryPresale");
  const summitFactoryPresale = await SummitFactoryPresale.deploy(createPresaleFee, serviceFeeReciever);
  await summitFactoryPresale.deployed();

  console.log("summitFactoryPresale deployed to:", summitFactoryPresale.address);
  console.log("Starting to deploy DummyToken");

  const DummyToken = await ethers.getContractFactory("DummyToken");
  const dummyToken = await DummyToken.deploy();
  await dummyToken.deployed();

  console.log("DummyToken deployed to:", dummyToken.address);
  console.log("Approving Factory");

  await dummyToken.approve(summitFactoryPresale.address, MAX_APPROVE_AMOUNT);

  console.log("Factory Approved");
  console.log("Starting to deploy SummitCustomPresale");

  const presaleTokenAmount = Number(tokenDetails.presalePrice) * Number(bnbAmounts.hardCap);
  const tokensForLiquidity =
    Number(tokenDetails.liquidityPrecentage / 100) * Number(bnbAmounts.hardCap) * Number(tokenDetails.listingPrice);
  const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
  const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;

  const createPresaleTransaction = await summitFactoryPresale.createPresale(
    [dummyToken.address, router],
    [
      ethers.utils.parseUnits(tokenAmount.toString(), await dummyToken.decimals()),
      ethers.utils.parseEther(tokenDetails.presalePrice),
      ethers.utils.parseEther(tokenDetails.listingPrice),
      tokenDetails.liquidityPrecentage,
    ],
    [
      ethers.utils.parseEther(bnbAmounts.minBuyBnb),
      ethers.utils.parseEther(bnbAmounts.maxBuyBnb),
      ethers.utils.parseEther(bnbAmounts.softCap),
      ethers.utils.parseEther(bnbAmounts.hardCap),
    ],
    liquidityLockTime,
    startPresaleTime,
    endPresaleTime,
    feeType,
    refundType,
    isWhiteListPhase,
    {
      value: createPresaleFee,
    }
  );

  await createPresaleTransaction.wait();

  const presaleAddress = await summitFactoryPresale.tokenPresales(dummyToken.address);

  console.log("CustomPresale deployed to:", presaleAddress);

  return summitFactoryPresale;
}

async function main() {
  const createPresaleFee = "100000000000000"; // 0.0001 ether
  const serviceFeeReciever = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";

  const router = "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B";
  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuyBnb = "0.1";
  const maxBuyBnb = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPrecentage = 70;
  const startPresaleTime = dayjs().add(1, "day").unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const feeType = 0;
  const refundType = 0;
  const isWhiteListPhase = false;

  await deployCustomPresale(
    createPresaleFee,
    serviceFeeReciever,
    router,
    { presalePrice, listingPrice, liquidityPrecentage },
    { minBuyBnb, maxBuyBnb, softCap, hardCap },
    liquidityLockTime,
    startPresaleTime,
    endPresaleTime,
    feeType,
    refundType,
    isWhiteListPhase
  );
}

if (require.main === module) {
  main();
}
