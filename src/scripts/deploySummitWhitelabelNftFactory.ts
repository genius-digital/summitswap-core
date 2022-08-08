import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deploySummitWhitelabelNftFactory(serviceFee: BigNumber, serviceFeeReceiver: string) {
  console.log("Starting to deploy SummitWhitelabelNftFactory");

  const SummitWhitelabelNftFactory = await ethers.getContractFactory("SummitWhitelabelNftFactory");
  const summitWhitelabelNftFactory = await SummitWhitelabelNftFactory.deploy(serviceFee, serviceFeeReceiver);
  await summitWhitelabelNftFactory.deployed();

  console.log("SummitWhitelabelNftFactory deployed to:", summitWhitelabelNftFactory.address);

  await tryVerify(summitWhitelabelNftFactory.address, [serviceFee, serviceFeeReceiver]);

  return summitWhitelabelNftFactory;
}

async function main() {
  const serviceFee = parseEther("0.001");
  const serviceFeeReceiver = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";

  await deploySummitWhitelabelNftFactory(serviceFee, serviceFeeReceiver);
}

if (require.main === module) {
  main();
}
