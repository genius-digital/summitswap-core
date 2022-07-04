import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { tryVerify } from "../utils/verify";

export async function deployTokenFactory(serviceFee: BigNumber, serviceFeeAddress: string) {
  console.log("Starting to deploy StandardTokenFactory");

  const TokenFactoryContract = await ethers.getContractFactory("StandardTokenFactory");
  const tokenFactoryDeploy = await TokenFactoryContract.deploy(serviceFee, serviceFeeAddress);
  await tokenFactoryDeploy.deployed();

  console.log("StandardFactory deployed to:", tokenFactoryDeploy.address);

  await tryVerify(tokenFactoryDeploy.address, [serviceFee, serviceFeeAddress]);

  return tokenFactoryDeploy;
}

async function main() {
  const serviceFee = parseEther("0.0001");
  const serviceFeeReciever = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  await deployTokenFactory(serviceFee, serviceFeeReciever);
}

if (require.main === module) {
  main();
}
