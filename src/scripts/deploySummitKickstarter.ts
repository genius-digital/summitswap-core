import dayjs from "dayjs";
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
  const CONTACT_METHOD = "email";
  const CONTACT_VALUE = "john.doe@example.com";
  const MIN_CONTRIBUTION = utils.parseEther("0.01");
  const PROJECT_GOALS = utils.parseEther("0.1");
  const START_TIMESTAMP = dayjs().unix();
  const END_TIMESTAMP = dayjs().add(1, "week").unix();
  const REWARD_DISTRIBUTION_TIMESTAMP = dayjs().add(2, "week").unix();

  const SummitKickstarter = await ethers.getContractFactory("SummitKickstarter");
  const kickstarter: KickstarterStruct = {
    paymentToken: ZERO_ADDRESS,
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

  const summitKickstarter = await SummitKickstarter.deploy(OWNER, kickstarter, CONTACT_METHOD, CONTACT_VALUE);
  await summitKickstarter.deployed();

  console.log("SummitKickstarter deployed to:", summitKickstarter.address);

  await tryVerify(summitKickstarter.address, [OWNER, kickstarter, CONTACT_METHOD, CONTACT_VALUE]);

  return summitKickstarter;
}

async function main() {
  await deploySummitKickstarter();
}

if (require.main === module) {
  main();
}
