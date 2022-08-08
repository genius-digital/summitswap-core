import { utils } from "ethers";
import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deploySummitKickstarterFactory() {
  console.log("Starting to deploy SummitKickstarterFactory");

  const SERVICE_FEE = utils.parseEther("0.01");

  const SummitKickstarterFactory = await ethers.getContractFactory("SummitKickstarterFactory");
  const summitKickstarterFactory = await SummitKickstarterFactory.deploy(SERVICE_FEE);
  await summitKickstarterFactory.deployed();

  console.log("SummitKickstarterFactory deployed to:", summitKickstarterFactory.address);

  await tryVerify(summitKickstarterFactory.address, [SERVICE_FEE]);

  return summitKickstarterFactory;
}

async function main() {
  await deploySummitKickstarterFactory();
}

if (require.main === module) {
  main();
}
