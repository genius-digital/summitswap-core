import hre, { ethers } from "hardhat";
import { environment } from "../environment";
import { tryVerify } from "./utils/verify";

export async function deploySummitswapFactory(feeToSetter: string) {
  console.log("Starting to deploy SummitswapFactory");

  const SummitswapFactory = await ethers.getContractFactory("SummitswapFactory");
  const summitswapFactory = await SummitswapFactory.deploy(feeToSetter);
  await summitswapFactory.deployed();

  console.log("SummitswapFactory deployed to:", summitswapFactory.address);

  await tryVerify(summitswapFactory.address, [feeToSetter]);

  return summitswapFactory;
}

async function main() {
  const [wallet1] = await ethers.getSigners();

  await deploySummitswapFactory(wallet1.address);
}

if (require.main === module) {
  main();
}
