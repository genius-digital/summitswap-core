import { ethers } from "hardhat";
import { tryVerify } from "../utils/verify";

export async function deployTokenFactory() {
  console.log("Starting to deploy TokenFactory");

  const BuyBackBabyTokenFactoryContract = await ethers.getContractFactory("BuyBackBabyTokenFactory");
  const BuyBackBabyTokenFactoryDeploy = await BuyBackBabyTokenFactoryContract.deploy(
    "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F"
  );
  await BuyBackBabyTokenFactoryDeploy.deployed();

  console.log("BuyBackBabyTokenFactory deployed to:", BuyBackBabyTokenFactoryDeploy.address);

  await tryVerify(BuyBackBabyTokenFactoryDeploy.address, ["0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F"]);

  return BuyBackBabyTokenFactoryDeploy;
}

async function main() {
  await deployTokenFactory();
}

if (require.main === module) {
  main();
}
