import { ethers } from "hardhat";
import { environment } from "../environment";
import { deploySummitswapFactory } from "./deploySummitswapFactory";
import { deployWBNB } from "./deployWBNB";
import { deploySummitswapRouter02 } from "./deploySummitswapRouter02";
import { tryVerify } from "./utils/verify";
import { deploySummitReferral } from "./deploySummitReferral";

export async function deploySummitswapMiddleman() {
  const [wallet1] = await ethers.getSigners();

  const wbnb = process.env.WBNB_ADDRESS ?? environment.WBNB ?? (await deployWBNB()).address;
  let factory = process.env.FACTORY_ADDRESS ?? environment.SUMMITSWAP_FACTORY;
  let router = process.env.ROUTER_ADDRESS ?? environment.SUMMITSWAP_ROUTER;
  let referral = process.env.REFERRAL_ADDRESS ?? environment.SUMMITSWAP_REFERRAL;

  if (factory === "-1" || !factory) {
    factory = (await deploySummitswapFactory(wallet1.address)).address;
  }

  if (router === "-1" || !router) {
    router = (await deploySummitswapRouter02()).address;
  }

  if (referral === "-1" || !referral) {
    referral = (await deploySummitReferral()).address;
  }

  console.log("Starting to deploy SummitswapMiddleman");

  const SummitswapMiddleman = await ethers.getContractFactory("SummitswapMiddleman");
  const summitswapMiddleman = await SummitswapMiddleman.deploy(wbnb, factory, router, referral);
  await summitswapMiddleman.deployed();

  console.log("SummitswapMiddleman deployed to:", summitswapMiddleman.address);

  await tryVerify(summitswapMiddleman.address, [wbnb, factory, router, referral]);

  return summitswapMiddleman;
}

async function main() {
  await deploySummitswapMiddleman();
}

if (require.main === module) {
  main();
}
