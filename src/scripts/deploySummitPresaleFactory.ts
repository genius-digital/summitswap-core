import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deploySummitPresaleFactory(serviceFee: BigNumber, serviceFeeAddress: string, admin: string) {
  console.log("Starting to deploy SummitPresaleFactory");

  const SummitFactoryPresale = await ethers.getContractFactory("SummitFactoryPresale");
  const summitFactoryPresale = await SummitFactoryPresale.deploy(serviceFee, serviceFeeAddress, admin);
  await summitFactoryPresale.deployed();

  console.log("summitFactoryPresale deployed to:", summitFactoryPresale.address);

  await tryVerify(summitFactoryPresale.address, [serviceFee, serviceFeeAddress, admin]);

  return summitFactoryPresale;
}

async function main() {
  const serviceFee = parseEther("0.0001");
  const serviceFeeReciever = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";
  const admin = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";

  await deploySummitPresaleFactory(serviceFee, serviceFeeReciever, admin);
}

if (require.main === module) {
  main();
}
