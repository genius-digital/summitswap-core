import hre, { ethers } from "hardhat";
import { environment } from "../environment";
import { deploySummitswapFactory } from "./deploySummitswapFactory";
import { deployWBNB } from "./deployWBNB";

export async function deploySummitswapRouter02() {
  const [wallet1] = await ethers.getSigners();

  const factory = process.env.FACTORY_ADDRESS ?? (await deploySummitswapFactory(wallet1.address)).address;
  const wbnb = process.env.WBNB_ADDRESS ?? (await deployWBNB()).address;

  console.log("Starting to deploy SummitswapRouter02");

  const SummitswapRouter02 = await ethers.getContractFactory("SummitswapRouter02");
  const summitswapRouter02 = await SummitswapRouter02.deploy(factory, wbnb);
  await summitswapRouter02.deployed();

  console.log("SummitswapRouter02 deployed to:", summitswapRouter02.address);

  if (environment.IS_VERIFY_SUPPORTED) {
    try {
      await hre.run("verify:verify", {
        address: summitswapRouter02.address,
        constructorArguments: [factory, wbnb],
      });
    } catch (err: any) {
      if (err.message.includes("Already Verified")) {
        console.log("Already Verified");
      } else {
        console.log(err);
      }
    }
  }
}

async function main() {
  await deploySummitswapRouter02();
}

if (require.main === module) {
  main();
}
