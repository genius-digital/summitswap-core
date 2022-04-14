import { ethers } from "hardhat";
import { environment } from "src/environment";
import { deploySummitswapFactory } from "./deploySummitswapFactory";
import { deployWBNB } from "./deployWBNB";
import { tryVerify } from "./utils/verify";

export async function deploySummitswapLocker() {
  const [wallet1] = await ethers.getSigners();

  console.log("Deploying SummitswapLockerCalculator");
  const SummitswapLockerCalculator = await ethers.getContractFactory("SummitswapLockerCalculator");
  const summitswapLockerCalculator = await SummitswapLockerCalculator.deploy();
  await summitswapLockerCalculator.deployed();
  console.log("SummitswapLockerCalculator deployed to:", summitswapLockerCalculator.address);

  await tryVerify(summitswapLockerCalculator.address);

  console.log("Starting to deploy SummitswapLocker");
  const factory =
    process.env.FACTORY_ADDRESS ??
    environment.SUMMITSWAP_FACTORY ??
    (await deploySummitswapFactory(wallet1.address)).address;
  const wbnb = process.env.WBNB_ADDRESS ?? environment.WBNB ?? (await deployWBNB()).address;
  console.log("Deploying SummitswapLocker");
  const SummitswapLocker = await ethers.getContractFactory("SummitswapLocker");
  const summitswapLocker = await SummitswapLocker.deploy(
    factory,
    summitswapLockerCalculator.address,
    wallet1.address,
    wbnb
  );
  await summitswapLocker.deployed();
  console.log(`SummitswapLocker deployed to: ${summitswapLocker.address}`);

  await tryVerify(summitswapLocker.address, [factory, summitswapLockerCalculator.address, wallet1.address, wbnb]);

  return summitswapLocker;
}

async function main() {
  await deploySummitswapLocker();
}

if (require.main === module) {
  main();
}
