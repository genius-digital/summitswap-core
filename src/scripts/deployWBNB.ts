import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deployWBNB() {
  console.log("Starting to deploy WBNB");

  const WBNB = await ethers.getContractFactory("WBNB");
  const wbnb = await WBNB.deploy();
  await wbnb.deployed();

  console.log("WBNB deployed to:", wbnb.address);

  await tryVerify(wbnb.address);

  return wbnb;
}

async function main() {
  await deployWBNB();
}

if (require.main === module) {
  main();
}
