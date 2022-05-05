import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deploySummitswapOnboarding() {
  console.log("Starting to deploy SummitswapOnboarding");

  const SummitswapOnboarding = await ethers.getContractFactory("SummitswapOnboarding");
  const summitswapOnboarding = await SummitswapOnboarding.deploy();
  await summitswapOnboarding.deployed();

  console.log("SummitswapOnboarding deployed to:", summitswapOnboarding.address);

  await tryVerify(summitswapOnboarding.address);

  return summitswapOnboarding;
}

async function main() {
  await deploySummitswapOnboarding();
}

if (require.main === module) {
  main();
}
