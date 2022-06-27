import { ethers } from "hardhat";
import { BigNumber } from "ethers";

export async function deployCustumPresale(
  addresses: [string, string],
  tokenDetails: [BigNumber, BigNumber, BigNumber, BigNumber],
  bnbAmounts: [BigNumber, BigNumber, BigNumber, BigNumber],
  liquidityLockTime: BigNumber,
  startPresaleTime: BigNumber,
  endPresaleTime: BigNumber,
  feeType: number,
  refundType: number,
  isWhiteListPhase: boolean
) {
  console.log("Starting to deploy SummitCustomPresale");

  const SummitFactoryPresale = await ethers.getContractFactory("SummitFactoryPresale");
  const summitFactoryPresale = await SummitFactoryPresale.attach(""); // Factory address

  const Token = await ethers.getContractFactory("ERC20");
  const token = await Token.attach("");

  console.log("Approving Factory");

  const approveTransaction = await token.approve(
    "", // Factory Address
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // Approve Token Value
  );

  console.log("Factory Approved");

  await approveTransaction.wait();

  try {
    console.log("Creating SummitCustomPresale");

    const createPresaleTransaction = await summitFactoryPresale.createPresale(
      addresses,
      tokenDetails,
      bnbAmounts,
      liquidityLockTime,
      startPresaleTime,
      endPresaleTime,
      feeType,
      refundType,
      isWhiteListPhase,
      {
        value: BigNumber.from("100000000000000"),
      }
    );

    await createPresaleTransaction.wait();
  } catch (e) {
    console.log(e);
  }

  const presaleAddress = await summitFactoryPresale.tokenPresales(""); // tokenAddress

  console.log("CustomPresale deployed to:", presaleAddress);

  return summitFactoryPresale;
}

async function main() {
  await deployCustumPresale(
    ["", "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B"], // tokenAddress, routerAddresss
    [
      BigNumber.from(10000000000000),
      BigNumber.from(10000000000000),
      BigNumber.from(12000000000000),
      BigNumber.from(56),
    ],
    [
      BigNumber.from(10000000000000),
      BigNumber.from(20000000000000),
      BigNumber.from(10000000000000),
      BigNumber.from(20000000000000),
    ],
    BigNumber.from(700),
    BigNumber.from(1656529800), // presale startTime
    BigNumber.from(1657134600), // presale endTime
    0,
    0,
    false
  );
}

if (require.main === module) {
  main();
}
