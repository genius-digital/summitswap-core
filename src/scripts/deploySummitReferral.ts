import { ethers } from "hardhat";
import { SummitswapRouter02 } from "../../build/typechain";
import { environment } from "../environment";
import { deploySummitswapRouter02 } from "./deploySummitswapRouter02";
import { tryVerify } from "./utils/verify";

export async function deploySummitReferral() {
  const SummitswapRouter02 = await ethers.getContractFactory("SummitswapRouter02");

  let summitswapRouter02Address = process.env.ROUTER_ADDRESS ?? environment.SUMMITSWAP_ROUTER;

  let summitswapRouter02: SummitswapRouter02;

  if (summitswapRouter02Address === "-1" || !summitswapRouter02Address) {
    summitswapRouter02 = await deploySummitswapRouter02();
    summitswapRouter02Address = summitswapRouter02.address;
  } else {
    summitswapRouter02 = SummitswapRouter02.attach(summitswapRouter02Address);
  }

  console.log("Starting to deploy SummitReferral");

  const SummitReferral = await ethers.getContractFactory("SummitReferral");
  const summitReferral = await SummitReferral.deploy();
  await summitReferral.deployed();

  await tryVerify(summitReferral.address);

  await summitReferral.setRouter(summitswapRouter02Address);
  await summitswapRouter02.setSummitReferral(summitReferral.address);

  console.log("SummitReferral deployed to:", summitReferral.address);
}

async function main() {
  await deploySummitReferral();
}

if (require.main === module) {
  main();
}