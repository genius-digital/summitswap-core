import { KickstarterStruct } from "build/typechain/SummitKickstarter";
import { utils } from "ethers";
import { ethers } from "hardhat";
import { ZERO_ADDRESS } from "src/environment";
import { tryVerify } from "./utils/verify";

export async function deploySummitKickstarter() {
  console.log("Starting to deploy SummitKickstarter");

  const OWNER = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  const TITLE = "SummitSwap Kickstarter";
  const CREATOR = "Summitswap";
  const IMAGE_URL = "https://images.com/example.png";
  const PROJECT_DESCRIPTION = "SummitSwap Kickstarter";
  const REWARD_DESCRIPTION = "SummitSwap Kickstarter";
  const MIN_CONTRIBUTION = utils.parseEther("0.01");
  const PROJECT_GOALS = utils.parseEther("0.1");
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);
  const END_TIMESTAMP = START_TIMESTAMP + 60 * 60 * 24 * 7;
  const REWARD_DISTRIBUTION_TIMESTAMP = END_TIMESTAMP + 60 * 60 * 24 * 7;

  const SummitKickstarter = await ethers.getContractFactory("SummitKickstarter");
  const kickstarter: KickstarterStruct = {
    paymentToken: ZERO_ADDRESS,
    owner: OWNER,
    title: TITLE,
    creator: CREATOR,
    imageUrl: IMAGE_URL,
    projectDescription: PROJECT_DESCRIPTION,
    rewardDescription: REWARD_DESCRIPTION,
    minContribution: MIN_CONTRIBUTION,
    projectGoals: PROJECT_GOALS,
    rewardDistributionTimestamp: REWARD_DISTRIBUTION_TIMESTAMP,
    startTimestamp: START_TIMESTAMP,
    endTimestamp: END_TIMESTAMP,
  };

  const summitKickstarter = await SummitKickstarter.deploy(kickstarter);
  await summitKickstarter.deployed();

  console.log("SummitKickstarter deployed to:", summitKickstarter.address);

  await tryVerify(summitKickstarter.address, [kickstarter]);

  return summitKickstarter;
}

async function main() {
  await deploySummitKickstarter();
}

if (require.main === module) {
  main();
}
