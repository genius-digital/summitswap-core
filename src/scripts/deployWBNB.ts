import { ethers } from "hardhat";

async function main() {
  const WBNB = await ethers.getContractFactory("WBNB");
  const wbnb = await WBNB.deploy();
  await wbnb.deployed();

  console.log("Contract deployed to:", wbnb.address);
}

main();
