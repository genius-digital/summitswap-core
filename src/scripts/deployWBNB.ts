import hre, { ethers } from "hardhat";

async function main() {
  const WBNB = await ethers.getContractFactory("WBNB");
  const wbnb = await WBNB.deploy();

  console.log("Contract deployed to:", wbnb.address);

  await hre.run("verify:verify", {
    address: wbnb.address,
  });
}

main();
