import { utils } from "ethers";
import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deploySummitKickstarter() {
  console.log("Starting to deploy SummitKickstarter");

  const OWNER = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  const TITLE = "SummitSwap Kickstarter";
  const CREATOR = "Summitswap";
  const PROJECT_DESCRIPTION = "SummitSwap Kickstarter";
  const REWARD_DESCRIPTION = "SummitSwap Kickstarter";
  const MIN_CONTRIBUTION = utils.parseEther("0.01");
  const PROJECT_GOALS = utils.parseEther("0.1");
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);
  const END_TIMESTAMP = START_TIMESTAMP + 60 * 60 * 24 * 7;
  const REWARD_DISTRIBUTION_TIMESTAMP = END_TIMESTAMP + 60 * 60 * 24 * 7;

  const SummitKickstarter = await ethers.getContractFactory("SummitKickstarter");
  const summitKickstarter = await SummitKickstarter.deploy(
    OWNER,
    TITLE,
    CREATOR,
    PROJECT_DESCRIPTION,
    REWARD_DESCRIPTION,
    MIN_CONTRIBUTION,
    PROJECT_GOALS,
    REWARD_DISTRIBUTION_TIMESTAMP,
    START_TIMESTAMP,
    END_TIMESTAMP
  );
  await summitKickstarter.deployed();

  console.log("SummitKickstarter deployed to:", summitKickstarter.address);

  await tryVerify(summitKickstarter.address, [
    OWNER,
    TITLE,
    CREATOR,
    PROJECT_DESCRIPTION,
    REWARD_DESCRIPTION,
    MIN_CONTRIBUTION,
    PROJECT_GOALS,
    REWARD_DISTRIBUTION_TIMESTAMP,
    START_TIMESTAMP,
    END_TIMESTAMP,
  ]);

  return summitKickstarter;
}

async function main() {
  await deploySummitKickstarter();
}

if (require.main === module) {
  main();
}
