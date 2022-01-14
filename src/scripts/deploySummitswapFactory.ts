import hre, { ethers } from "hardhat";
import { environment } from "../environment";

export async function deploySummitswapFactory(feeToSetter: string) {
  console.log("Starting to deploy SummitswapFactory");

  const SummitswapFactory = await ethers.getContractFactory("SummitswapFactory");
  const summitswapFactory = await SummitswapFactory.deploy(feeToSetter);
  await summitswapFactory.deployed();

  console.log("SummitswapFactory deployed to:", summitswapFactory.address);

  if (environment.IS_VERIFY_SUPPORTED) {
    try {
      await hre.run("verify:verify", {
        address: summitswapFactory.address,
        constructorArguments: [feeToSetter],
      });
    } catch (err: any) {
      if (err.message.includes("Already Verified")) {
        console.log("Already Verified");
      } else {
        console.log(err);
      }
    }
  }

  return summitswapFactory;
}

async function main() {
  const [wallet1] = await ethers.getSigners();

  await deploySummitswapFactory(wallet1.address);
}

if (require.main === module) {
  main();
}
