import hre, { ethers } from "hardhat";
import { environment } from "../environment";

async function main() {
  const WBNB = await ethers.getContractFactory("WBNB");
  const wbnb = await WBNB.deploy();

  console.log("Contract deployed to:", wbnb.address);

  if (environment.IS_VERIFY_SUPPORTED) {
    await hre.run("verify:verify", {
      address: wbnb.address,
    });
  }
}

main();
