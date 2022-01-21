import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deployDummyToken() {
  console.log("Starting to deploy DummyToken");

  const DummyToken = await ethers.getContractFactory("DummyToken");
  const dummyToken = await DummyToken.deploy();
  await dummyToken.deployed();

  console.log("DummyToken deployed to:", dummyToken.address);

  await tryVerify(dummyToken.address);

  return dummyToken;
}

async function main() {
  await deployDummyToken();
}

if (require.main === module) {
  main();
}
