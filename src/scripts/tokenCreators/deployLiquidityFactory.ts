import { ethers } from "hardhat";
import { tryVerify } from "../utils/verify";

export async function deployTokenFactory() {
  console.log("Starting to deploy TokenFactory");

  const TokenFactoryContract = await ethers.getContractFactory("LiquidityFactory");
  const tokenFactoryDeploy = await TokenFactoryContract.deploy("0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F");
  await tokenFactoryDeploy.deployed();

  console.log("LiquidityFactory deployed to:", tokenFactoryDeploy.address);

  await tryVerify(tokenFactoryDeploy.address, ["0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F"]);

  return tokenFactoryDeploy;
}

async function main() {
  await deployTokenFactory();
}

if (require.main === module) {
  main();
}
