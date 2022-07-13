import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { tryVerify } from "../utils/verify";

export async function deployStandardTokenFactory(serviceFee: BigNumber, serviceFeeAddress: string) {
  console.log("Starting to deploy StandardTokenFactory");

  const TokenFactoryContract = await ethers.getContractFactory("StandardTokenFactory");
  const tokenFactoryDeploy = await TokenFactoryContract.deploy(serviceFee, serviceFeeAddress);
  await tokenFactoryDeploy.deployed();

  console.log("StandardTokenFactory deployed to:", tokenFactoryDeploy.address);

  await tryVerify(tokenFactoryDeploy.address, [serviceFee, serviceFeeAddress]);

  return tokenFactoryDeploy;
}

async function main() {
  const serviceFee = parseEther("0.0001");
  const serviceFeeReciever = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";
  await deployStandardTokenFactory(serviceFee, serviceFeeReciever);
}

if (require.main === module) {
  main();
}
