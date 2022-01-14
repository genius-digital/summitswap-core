import hre, { ethers } from "hardhat";
import { environment } from "../environment";

export async function deployWBNB() {
  console.log("Starting to deploy WBNB");

  const WBNB = await ethers.getContractFactory("WBNB");
  const wbnb = await WBNB.deploy();
  await wbnb.deployed();

  console.log("WBNB deployed to:", wbnb.address);

  if (environment.IS_VERIFY_SUPPORTED) {
    try {
      await hre.run("verify:verify", {
        address: wbnb.address,
      });
    } catch (err: any) {
      if (err.message.includes("Already Verified")) {
        console.log("Already Verified");
      } else {
        console.log(err);
      }
    }
  }

  return wbnb;
}

async function main() {
  await deployWBNB();
}

if (require.main === module) {
  main();
}
