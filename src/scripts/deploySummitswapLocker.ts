import { ethers } from "hardhat";
import { environment } from "src/environment";
import { deploySummitswapFactory } from "./deploySummitswapFactory";
import { deployWBNB } from "./deployWBNB";
import { tryVerify } from "./utils/verify";

export async function deploySummitswapLocker() {
  const [wallet1] = await ethers.getSigners();

  console.log("Deploying FeesCalculator");
  const FeesCalculator = await ethers.getContractFactory("FeesCalculator");
  const feesCalculator = await FeesCalculator.deploy();
  await feesCalculator.deployed();
  console.log("FeesCalculator deployed to:", feesCalculator.address);

  await tryVerify(feesCalculator.address);

  console.log("Starting to deploy SummitswapLocker");
  const factory =
    process.env.FACTORY_ADDRESS ??
    environment.SUMMITSWAP_FACTORY ??
    (await deploySummitswapFactory(wallet1.address)).address;
  const wbnb = process.env.WBNB_ADDRESS ?? environment.WBNB ?? (await deployWBNB()).address;
  console.log("Deploying SummitswapLocker");
  const SummitswapLocker = await ethers.getContractFactory("SummitswapLocker");
  const summitswapLocker = await SummitswapLocker.deploy(factory, feesCalculator.address, wallet1.address, wbnb);
  await summitswapLocker.deployed();
  console.log(`SummitswapLocker deployed to: ${summitswapLocker.address}`);

  await tryVerify(summitswapLocker.address, [factory, feesCalculator.address, wallet1.address, wbnb]);

  return summitswapLocker;
}

async function main() {
  await deploySummitswapLocker();
}

if (require.main === module) {
  main();
}
