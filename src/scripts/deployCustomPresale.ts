import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { environment, MAX_VALUE, ZERO_ADDRESS } from "src/environment";
import { deployDummyToken } from "./deployDummyToken";
import { deploySummitPresaleFactory } from "./deploySummitPresaleFactory";

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
  createPresaleFee: BigNumber,
  serviceFeeReciever: string,
  router0: string,
  router1: string,
  raisedToken: string,
  pairToken: string,
  tokenDetails: TokenDetails,
  bnbAmounts: BnbAmounts,
  liquidityLockTime: number,
  startPresaleTime: number,
  endPresaleTime: number,
  refundType: number,
  listingChoice: number,
  isWhiteListPhase: boolean
) {
  const summitFactoryPresale = await deploySummitPresaleFactory(createPresaleFee, serviceFeeReciever);
  const dummyToken = await deployDummyToken();

  console.log("Approving Factory");
  await dummyToken.approve(summitFactoryPresale.address, MAX_VALUE);

  console.log("Factory Approved");
  console.log("Starting to deploy SummitCustomPresale");

  const presaleTokenAmount = Number(tokenDetails.presalePrice) * Number(bnbAmounts.hardCap);
  const tokensForLiquidity =
    Number(tokenDetails.liquidityPrecentage / 100) * Number(bnbAmounts.hardCap) * Number(tokenDetails.listingPrice);
  const tokenAmount = presaleTokenAmount + tokensForLiquidity;

  const tokenDecimals = await dummyToken.decimals();

  const presale = await summitFactoryPresale.createPresale(
    [dummyToken.address, raisedToken, pairToken, router0, router1],
    [
      parseUnits(tokenAmount.toString(), tokenDecimals),
      parseEther(tokenDetails.presalePrice),
      parseEther(tokenDetails.listingPrice),
      tokenDetails.liquidityPrecentage,
    ],
    [
      parseEther(bnbAmounts.minBuyBnb),
      parseEther(bnbAmounts.maxBuyBnb),
      parseEther(bnbAmounts.softCap),
      parseEther(bnbAmounts.hardCap),
    ],
    liquidityLockTime,
    startPresaleTime,
    endPresaleTime,
    refundType,
    listingChoice,
    isWhiteListPhase,
    {
      value: createPresaleFee,
    }
  );

  await presale.wait();

  const presaleAddress = (await summitFactoryPresale.getTokenPresales(dummyToken.address))[0];

  console.log("CustomPresale deployed to:", presaleAddress);

  return presale;
}

async function main() {
  const createPresaleFee = parseEther("0.0001");
  const serviceFeeReciever = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";
  const router0 = environment.SUMMITSWAP_ROUTER ?? "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B";
  const router1 = environment.PANCAKESWAP_ROUTER ?? "0x10ed43c718714eb63d5aa57b78b54704e256024e";
  const raisedToken = ZERO_ADDRESS; // raisedToken == ZERO_ADDRESS ? native coin to be raised: raisedToken
  const pairToken = ZERO_ADDRESS; // pairToken == ZERO_ADDRESS ? native coin to be paired: pairToken
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
  const refundType = 0;
  const listingChoice = 0;
  const isWhiteListPhase = false;

  await deployCustomPresale(
    createPresaleFee,
    serviceFeeReciever,
    router0,
    router1,
    raisedToken,
    pairToken,
    { presalePrice, listingPrice, liquidityPrecentage },
    { minBuyBnb, maxBuyBnb, softCap, hardCap },
    liquidityLockTime,
    startPresaleTime,
    endPresaleTime,
    refundType,
    listingChoice,
    isWhiteListPhase
  );
}

if (require.main === module) {
  main();
}
