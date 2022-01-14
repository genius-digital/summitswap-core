import hre, { ethers } from "hardhat";
import { env } from "process";
import { environment } from "../environment";

async function main() {
  const SummitswapFactory = await ethers.getContractFactory("SummitswapFactory");

  const [feeToSetter] = await ethers.getSigners();

  const summitswapFactory = await SummitswapFactory.deploy(feeToSetter.address);

  if (environment.IS_VERIFY_SUPPORTED) {
    await hre.run("verify:verify", {
      address: summitswapFactory.address,
      constructorArguments: [feeToSetter.address],
    });
  }
}

main();
