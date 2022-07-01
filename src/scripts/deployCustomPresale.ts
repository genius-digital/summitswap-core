import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { environment } from "src/environment";
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

  const summitFactoryPresale = await deploySummitPresaleFactory(createPresaleFee, serviceFeeReciever);
  const dummyToken = await deployDummyToken();

  console.log("Approving Factory");
  await dummyToken.approve(summitFactoryPresale.address, MAX_APPROVE_AMOUNT);

  console.log("Factory Approved");
  console.log("Starting to deploy SummitCustomPresale");

  const presaleTokenAmount = Number(tokenDetails.presalePrice) * Number(bnbAmounts.hardCap);
  const tokensForLiquidity =
    Number(tokenDetails.liquidityPrecentage / 100) * Number(bnbAmounts.hardCap) * Number(tokenDetails.listingPrice);
  const feeTokens = feeType === 0 ? 0 : (presaleTokenAmount * BNB_FEE_TYPE_1) / FEE_DENOMINATOR;
  const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;

  const tokenDecimals = await dummyToken.decimals();

  const presale = await summitFactoryPresale.createPresale(
    [dummyToken.address, router],
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
    feeType,
    refundType,
    isWhiteListPhase,
    {
      value: createPresaleFee,
    }
  );

  await presale.wait();

  const presaleAddress = await summitFactoryPresale.tokenPresales(dummyToken.address);

  console.log("CustomPresale deployed to:", presaleAddress);

  return presale;
}

async function main() {
  const createPresaleFee = parseEther("0.0001");
  const serviceFeeReciever = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";

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
    environment.SUMMITSWAP_ROUTER ?? "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B",
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
