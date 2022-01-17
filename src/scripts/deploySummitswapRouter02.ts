import { ethers } from "hardhat";
import { environment } from "../environment";
import { deploySummitswapFactory } from "./deploySummitswapFactory";
import { deployWBNB } from "./deployWBNB";
import { tryVerify } from "./utils/verify";

export async function deploySummitswapRouter02() {
  const [wallet1] = await ethers.getSigners();

  const wbnb = process.env.WBNB_ADDRESS ?? environment.WBNB ?? (await deployWBNB()).address;
  const factory =
    process.env.FACTORY_ADDRESS ??
    environment.SUMMITSWAP_FACTORY ??
    (await deploySummitswapFactory(wallet1.address)).address;

  console.log("Starting to deploy SummitswapRouter02");

  const SummitswapRouter02 = await ethers.getContractFactory("SummitswapRouter02");
  const summitswapRouter02 = await SummitswapRouter02.deploy(factory, wbnb);
  await summitswapRouter02.deployed();

  console.log("SummitswapRouter02 deployed to:", summitswapRouter02.address);

  await tryVerify(summitswapRouter02.address, [factory, wbnb]);

  return summitswapRouter02;
}

async function main() {
  await deploySummitswapRouter02();
}

if (require.main === module) {
  main();
}
