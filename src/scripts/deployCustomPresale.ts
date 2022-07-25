import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { environment, MAX_VALUE, ZERO_ADDRESS } from "src/environment";
import { deployDummyToken } from "./deployDummyToken";
import { deploySummitPresaleFactory } from "./deploySummitPresaleFactory";

interface TokenDetails {
  presalePrice: string;
  listingPrice: string;
  liquidityPrecentage: number;
  maxClaimPercentage: number;
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
  admin: string,
  router0: string,
  router1: string,
  raisedToken: string,
  pairToken: string,
  tokenDetails: TokenDetails,
  bnbAmounts: BnbAmounts,
  presaleTimeDetails: [number, number, number, number, number],
  refundType: number,
  listingChoice: number,
  isWhiteListPhase: boolean,
  isVestingEnabled: boolean,
  projectDetails: string[]
) {
  const summitFactoryPresale = await deploySummitPresaleFactory(createPresaleFee, serviceFeeReciever, admin);
  const dummyToken = await deployDummyToken();

  console.log("Approving Factory");
  await dummyToken.approve(summitFactoryPresale.address, MAX_VALUE);

  console.log("Factory Approved");
  console.log("Starting to deploy SummitCustomPresaleLibrary");

  const SummitCustomPresaleLibrary = await ethers.getContractFactory("SummitCustomPresale");
  const summitCustomPresaleLibrary = await SummitCustomPresaleLibrary.deploy();
  await summitCustomPresaleLibrary.deployed();

  console.log("SummitCustomPresaleLibrary deployed to:", summitCustomPresaleLibrary.address);

  console.log("Setting library Address for factory Presale");

  await summitFactoryPresale.setLibraryAddress(summitCustomPresaleLibrary.address);

  console.log("Library Address for factory Presale set to: ", summitCustomPresaleLibrary.address);

  console.log("Starting to deploy SummitCustomPresale");

  const presaleTokenAmount = Number(tokenDetails.presalePrice) * Number(bnbAmounts.hardCap);
  const tokensForLiquidity =
    Number(tokenDetails.liquidityPrecentage / 100) * Number(bnbAmounts.hardCap) * Number(tokenDetails.listingPrice);
  const tokenAmount = presaleTokenAmount + tokensForLiquidity;

  const tokenDecimals = await dummyToken.decimals();

  const presale = await summitFactoryPresale.createPresale(
    projectDetails,
    [dummyToken.address, raisedToken, pairToken, router0, router1, admin],
    [
      parseUnits(tokenAmount.toString(), tokenDecimals),
      parseEther(tokenDetails.presalePrice),
      parseEther(tokenDetails.listingPrice),
      tokenDetails.liquidityPrecentage,
      tokenDetails.maxClaimPercentage,
    ],
    [
      parseEther(bnbAmounts.minBuyBnb),
      parseEther(bnbAmounts.maxBuyBnb),
      parseEther(bnbAmounts.softCap),
      parseEther(bnbAmounts.hardCap),
    ],
    presaleTimeDetails,
    [refundType, listingChoice],
    [isWhiteListPhase, isVestingEnabled],
    {
      value: createPresaleFee,
    }
  );

  await presale.wait();

  const presaleAddress = (await summitFactoryPresale.getTokenPresales(dummyToken.address))[0];

  console.log("CustomPresale deployed to:", presaleAddress);

  const summitCustomPresale = SummitCustomPresaleLibrary.attach(presaleAddress);

  return summitCustomPresale;
}

async function main() {
  const createPresaleFee = parseEther("0.0001");
  const serviceFeeReciever = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";
  const admin = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";
  const router0 = environment.SUMMITSWAP_ROUTER ?? "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B";
  const router1 = environment.PANCAKESWAP_ROUTER ?? "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
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
  const maxClaimPercentage = 100;
  const startPresaleTime = dayjs().add(1, "day").unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const dayClaimInterval = 15;
  const hourClaimInterval = 16;
  const refundType = 0;
  const listingChoice = 0;
  const isWhiteListPhase = false;
  const isVestingEnabled = false;
  const projectDetails = ["icon_Url", "Name", "Contact", "Position", "Telegram Id", "Discord Id", "Email", "Twitter"];

  await deployCustomPresale(
    createPresaleFee,
    serviceFeeReciever,
    admin,
    router0,
    router1,
    raisedToken,
    pairToken,
    { presalePrice, listingPrice, liquidityPrecentage, maxClaimPercentage },
    { minBuyBnb, maxBuyBnb, softCap, hardCap },
    [startPresaleTime, endPresaleTime, dayClaimInterval, hourClaimInterval, liquidityLockTime],
    refundType,
    listingChoice,
    isWhiteListPhase,
    isVestingEnabled,
    projectDetails
  );
}

if (require.main === module) {
  main();
}
