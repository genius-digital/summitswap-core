import { ethers } from "hardhat";
import { environment } from "src/environment";
import { deploySummitReferral } from "./deploySummitReferral";
import { deploySummitswapFactory } from "./deploySummitswapFactory";
import { deploySummitswapLocker } from "./deploySummitswapLocker";
import { deploySummitswapRouter02 } from "./deploySummitswapRouter02";
import { deployWBNB } from "./deployWBNB";
import { tryVerify } from "./utils/verify";

export async function deploySummitswapOnboarding() {
  const [wallet1] = await ethers.getSigners();

  console.log("Starting to deploy SummitswapOnboarding");

  const router =
    process.env.ROUTER_ADDRESS ?? environment.SUMMITSWAP_ROUTER ?? (await deploySummitswapRouter02()).address;
  const locker =
    process.env.LOCKER_ADDRESS ?? environment.SUMMITSWAP_LOCKER ?? (await deploySummitswapLocker()).address;
  const factory =
    process.env.FACTORY_ADDRESS ??
    environment.SUMMITSWAP_FACTORY ??
    (await deploySummitswapFactory(wallet1.address)).address;
  const wbnb = process.env.WBNB_ADDRESS ?? environment.WBNB ?? (await deployWBNB()).address;
  const koda = process.env.KODA_ADDRESS ?? environment.KODA;
  const referral =
    process.env.REFERRAL_ADDRESS ?? environment.SUMMITSWAP_REFERRAL ?? (await deploySummitReferral()).address;
  const SummitswapOnboarding = await ethers.getContractFactory("SummitswapOnboarding");
  const summitswapOnboarding = await SummitswapOnboarding.deploy(router, locker, factory, wbnb, koda, referral);
  await summitswapOnboarding.deployed();

  console.log("SummitswapOnboarding deployed to:", summitswapOnboarding.address);

  await tryVerify(summitswapOnboarding.address, [router, locker, factory, wbnb, koda, referral]);

  return summitswapOnboarding;
}

async function main() {
  await deploySummitswapOnboarding();
}

if (require.main === module) {
  main();
}
