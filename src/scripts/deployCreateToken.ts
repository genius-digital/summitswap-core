import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deployTokenFactory() {
  console.log("Starting to deploy TokenFactory");

  const TokenFactoryContract = await ethers.getContractFactory("TokenFactory");
  const tokenFactoryDeploy = await TokenFactoryContract.deploy();
  await tokenFactoryDeploy.deployed();

  console.log("TokenFactory deployed to:", tokenFactoryDeploy.address);

  await tryVerify(tokenFactoryDeploy.address);

  return tokenFactoryDeploy;
}

async function main() {
  await deployTokenFactory();
}

if (require.main === module) {
  main();
}
