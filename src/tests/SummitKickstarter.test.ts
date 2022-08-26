import { ethers, waffle } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, utils } from "ethers";

import SummitKickstarterFactoryArtifact from "@built-contracts/SummitKickstarterFactory.sol/SummitKickstarterFactory.json";
import { SummitKickstarter, SummitKickstarterFactory } from "build/typechain";

const { deployContract, provider } = waffle;

describe("summitKickstarter", () => {
  const [owner, otherWallet] = provider.getWallets();

  const TITLE = "Lorem Ipsum";
  const CREATOR = "John Doe";
  const IMAGE_URL = "https://images.com/example.png";
  const PROJECT_DESCRIPTION = "This is a project description";
  const REWARD_DESCRIPTION = "This is a reward description";

  const MIN_CONTRIBUTION = 1000;
  const PROJECT_GOALS = 1000000;
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);
  const END_TIMESTAMP = START_TIMESTAMP + 60 * 60 * 24 * 7; // one week from now
  const REWARD_DISTRIBUTION_TIMESTAMP = END_TIMESTAMP + 60 * 60 * 24 * 7; // one week after the end date

  const NEW_HAS_DISTRIBUTED_REWARD = true;

  const SERVICE_FEE = utils.parseEther("0.1");

  const NEW_TITLE = "New Title";
  const NEW_CREATOR = "New Creator";
  const NEW_IMAGE_URL = "https://images.com/new-example.png";
  const NEW_PROJECT_DESCRIPTION = "New Project Description";
  const NEW_REWARD_DESCRIPTION = "New Reward Description";
  const NEW_MIN_CONTRIBUTION = 12345678;
  const NEW_PROJECT_GOALS = 12345678;
  const NEW_REWARD_DISTRIBUTION_TIMESTAMP = 12345678;
  const NEW_START_TIMESTAMP = 12345678;
  const NEW_END_TIMESTAMP = 12345678;

  let summitKickstarterFactory: SummitKickstarterFactory;
  let summitKickstarter: SummitKickstarter;

  const getTimestampFromMinutes = (minutes: number) => minutes * 60;

  beforeEach(async () => {
    summitKickstarterFactory = (await deployContract(owner, SummitKickstarterFactoryArtifact, [
      SERVICE_FEE,
    ])) as SummitKickstarterFactory;

    await summitKickstarterFactory.createProject(
      TITLE,
      CREATOR,
      IMAGE_URL,
      PROJECT_DESCRIPTION,
      REWARD_DESCRIPTION,
      MIN_CONTRIBUTION.toString(),
      PROJECT_GOALS.toString(),
      REWARD_DISTRIBUTION_TIMESTAMP.toString(),
      START_TIMESTAMP.toString(),
      END_TIMESTAMP.toString(),
      { value: SERVICE_FEE.add(1) }
    );

    const projectAddress = await summitKickstarterFactory.projects(0);
    const projects = await summitKickstarterFactory.getProjects();
    assert.equal(projects.length, 1);
    assert.equal(projects[0], projectAddress);

    const userProjects = await summitKickstarterFactory.getProjectsOf(owner.address);
    assert.equal(userProjects.length, 1);
    assert.equal(userProjects[0], projectAddress);

    const SummitKickstarterContract = await ethers.getContractFactory("SummitKickstarter");
    summitKickstarter = SummitKickstarterContract.attach(projectAddress);
  });

  describe("owner", async () => {
    it("should not be nonOwner", async () => {
      assert.notEqual(await summitKickstarter.owner(), otherWallet.address);
    });

    it("should be owner", async () => {
      assert.equal(await summitKickstarter.owner(), owner.address);
    });
  });

  describe("transferOwnership", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(summitKickstarter.connect(otherWallet).transferOwnership(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should transfer ownership to otherWallet", async () => {
      assert.equal(await summitKickstarter.owner(), owner.address);
      await summitKickstarter.transferOwnership(otherWallet.address);
      assert.equal(await summitKickstarter.owner(), otherWallet.address);
    });
  });

  describe("title", async () => {
    it(`should be ${TITLE}`, async () => {
      const title = await summitKickstarter.title();
      assert.equal(title.toString(), TITLE.toString());
    });
  });

  describe("creator", async () => {
    it(`should be ${CREATOR}`, async () => {
      const creator = await summitKickstarter.creator();
      assert.equal(creator.toString(), CREATOR.toString());
    });
  });

  describe("imageUrl", async () => {
    it(`should be ${IMAGE_URL}`, async () => {
      const imageUrl = await summitKickstarter.imageUrl();
      assert.equal(imageUrl.toString(), IMAGE_URL.toString());
    });
  });

  describe("projectDescription", async () => {
    it(`should be ${PROJECT_DESCRIPTION}`, async () => {
      const projectDescription = await summitKickstarter.projectDescription();
      assert.equal(projectDescription.toString(), PROJECT_DESCRIPTION.toString());
    });
  });

  describe("rewardDescription", async () => {
    it(`should be ${REWARD_DESCRIPTION}`, async () => {
      const rewardDescription = await summitKickstarter.rewardDescription();
      assert.equal(rewardDescription.toString(), REWARD_DESCRIPTION.toString());
    });
  });

  describe("minContribution", async () => {
    it(`should be ${MIN_CONTRIBUTION}`, async () => {
      const minContribution = await summitKickstarter.minContribution();
      assert.equal(minContribution.toString(), MIN_CONTRIBUTION.toString());
    });
  });

  describe("projectGoals", async () => {
    it(`should be ${PROJECT_GOALS}`, async () => {
      const projectGoals = await summitKickstarter.projectGoals();
      assert.equal(projectGoals.toString(), PROJECT_GOALS.toString());
    });
  });

  describe("startTimestamp", async () => {
    it(`should be ${START_TIMESTAMP}`, async () => {
      const startTimestamp = await summitKickstarter.startTimestamp();
      assert.equal(startTimestamp.toString(), START_TIMESTAMP.toString());
    });
  });

  describe("endTimestamp", async () => {
    it(`should be ${END_TIMESTAMP}`, async () => {
      const endTimestamp = await summitKickstarter.endTimestamp();
      assert.equal(endTimestamp.toString(), END_TIMESTAMP.toString());
    });
  });

  describe("rewardDistributionTimestamp", async () => {
    it(`should be ${REWARD_DISTRIBUTION_TIMESTAMP}`, async () => {
      const rewardDistributionTimestamp = await summitKickstarter.rewardDistributionTimestamp();
      assert.equal(rewardDistributionTimestamp.toString(), REWARD_DISTRIBUTION_TIMESTAMP.toString());
    });
  });

  describe("hasDistributedRewards", async () => {
    it("should be false", async () => {
      const hasDistributedRewards = await summitKickstarter.hasDistributedRewards();
      assert.equal(hasDistributedRewards, false);
    });
  });

  describe("setTitle", async () => {
    it("should not set setTitle when called by nonOwner", async () => {
      await expect(summitKickstarter.connect(otherWallet).setTitle(NEW_TITLE)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should set setTitle", async () => {
      await summitKickstarter.setTitle(NEW_TITLE);
      assert.equal(await summitKickstarter.title(), NEW_TITLE);
    });
  });

  describe("setCreator", async () => {
    it("should not set setCreator when called by nonOwner", async () => {
      await expect(summitKickstarter.connect(otherWallet).setCreator(NEW_CREATOR)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should set setCreator", async () => {
      await summitKickstarter.setCreator(NEW_CREATOR);
      assert.equal(await summitKickstarter.creator(), NEW_CREATOR);
    });
  });

  describe("setImageUrl", async () => {
    it("should not set setImageUrl when called by nonOwner", async () => {
      await expect(summitKickstarter.connect(otherWallet).setImageUrl(NEW_IMAGE_URL)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should set setImageUrl", async () => {
      await summitKickstarter.setImageUrl(NEW_IMAGE_URL);
      assert.equal(await summitKickstarter.imageUrl(), NEW_IMAGE_URL);
    });
  });

  describe("setProjectDescription", async () => {
    it("should not set setProjectDescription when called by nonOwner", async () => {
      await expect(
        summitKickstarter.connect(otherWallet).setProjectDescription(NEW_PROJECT_DESCRIPTION)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should set setProjectDescription", async () => {
      await summitKickstarter.setProjectDescription(NEW_PROJECT_DESCRIPTION);
      assert.equal(await summitKickstarter.projectDescription(), NEW_PROJECT_DESCRIPTION);
    });
  });

  describe("setRewardDescription", async () => {
    it("should not set setRewardDescription when called by nonOwner", async () => {
      await expect(
        summitKickstarter.connect(otherWallet).setRewardDescription(NEW_REWARD_DESCRIPTION)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should set setRewardDescription", async () => {
      await summitKickstarter.setRewardDescription(NEW_REWARD_DESCRIPTION);
      assert.equal(await summitKickstarter.rewardDescription(), NEW_REWARD_DESCRIPTION);
    });
  });

  describe("setMinContribution", async () => {
    it("should not set minContribution when called by nonOwner", async () => {
      await expect(
        summitKickstarter.connect(otherWallet).setMinContribution((MIN_CONTRIBUTION * 2).toString())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should set minContribution when called by owner", async () => {
      const doubleMinContribution = (MIN_CONTRIBUTION * 2).toString();

      const minContribution = await summitKickstarter.minContribution();
      assert.equal(minContribution.toString(), MIN_CONTRIBUTION.toString());

      await summitKickstarter.setMinContribution(doubleMinContribution);

      const newMinContribution = await summitKickstarter.minContribution();
      assert.equal(newMinContribution.toString(), doubleMinContribution);
    });
  });

  describe("setProjectGoals", async () => {
    it("should not set setProjectGoals when called by nonOwner", async () => {
      await expect(
        summitKickstarter.connect(otherWallet).setProjectGoals(NEW_PROJECT_GOALS.toString())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should set setProjectGoals", async () => {
      await summitKickstarter.setProjectGoals(NEW_PROJECT_GOALS.toString());
      assert.equal((await summitKickstarter.projectGoals()).toString(), NEW_PROJECT_GOALS.toString());
    });
  });

  describe("setRewardDistributionTimestamp", async () => {
    it("should not set setRewardDistributionTimestamp when called by nonOwner", async () => {
      await expect(
        summitKickstarter
          .connect(otherWallet)
          .setRewardDistributionTimestamp(NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should set setRewardDistributionTimestamp", async () => {
      await summitKickstarter.setRewardDistributionTimestamp(NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString());
      assert.equal(
        (await summitKickstarter.rewardDistributionTimestamp()).toString(),
        NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
    });
  });

  describe("setStartTimestamp", async () => {
    it("should not set startTimestamp when called by nonOwner", async () => {
      await expect(
        summitKickstarter.connect(otherWallet).setStartTimestamp(END_TIMESTAMP.toString())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not set more than or equal to END_TIMESTAMP", async () => {
      await expect(summitKickstarter.setStartTimestamp(END_TIMESTAMP.toString())).to.be.revertedWith(
        "Start timestamp must be before end timestamp"
      );
    });

    it("should be able to set startTimestamp", async () => {
      const expectedStartTimestamp = (END_TIMESTAMP - 1).toString();

      const startTimestamp = await summitKickstarter.startTimestamp();
      assert.equal(startTimestamp.toString(), START_TIMESTAMP.toString());

      await summitKickstarter.setStartTimestamp(expectedStartTimestamp);

      const newStartTimestamp = await summitKickstarter.startTimestamp();
      assert.equal(newStartTimestamp.toString(), expectedStartTimestamp);
    });
  });

  describe("setEndTimestamp", async () => {
    it("should not set endTimestamp when called by nonOwner", async () => {
      await expect(
        summitKickstarter.connect(otherWallet).setEndTimestamp(START_TIMESTAMP.toString())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not set less than or equal to START_TIMESTAMP", async () => {
      await expect(summitKickstarter.setEndTimestamp(START_TIMESTAMP.toString())).to.be.revertedWith(
        "End timestamp must be after start timestamp"
      );
    });

    it("should be able to set endTimestamp", async () => {
      const expectedEndTimestamp = (START_TIMESTAMP + 1).toString();

      const endTimestamp = await summitKickstarter.endTimestamp();
      assert.equal(endTimestamp.toString(), END_TIMESTAMP.toString());

      await summitKickstarter.setEndTimestamp(expectedEndTimestamp);

      const newStartTimestamp = await summitKickstarter.endTimestamp();
      assert.equal(newStartTimestamp.toString(), expectedEndTimestamp);
    });
  });

  describe("setHasDistributedRewards", async () => {
    it("should not set hasDistributedRewards when called by nonOwner", async () => {
      await expect(summitKickstarter.connect(otherWallet).setHasDistributedRewards(true)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should set hasDistributedRewards", async () => {
      await summitKickstarter.setHasDistributedRewards(true);
      assert.equal(await summitKickstarter.hasDistributedRewards(), true);
    });
  });

  describe("configProjectInfo", async () => {
    it("should not set configProjectInfo when called by nonOwner", async () => {
      await expect(
        summitKickstarter
          .connect(otherWallet)
          .configProjectInfo(
            NEW_TITLE,
            NEW_CREATOR,
            NEW_IMAGE_URL,
            NEW_PROJECT_DESCRIPTION,
            NEW_REWARD_DESCRIPTION,
            NEW_MIN_CONTRIBUTION,
            NEW_PROJECT_GOALS,
            NEW_REWARD_DISTRIBUTION_TIMESTAMP,
            NEW_START_TIMESTAMP,
            NEW_END_TIMESTAMP,
            NEW_HAS_DISTRIBUTED_REWARD
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should not set configProjectInfo if start date is greater than end date", async () => {
      await expect(
        summitKickstarter.configProjectInfo(
          NEW_TITLE,
          NEW_CREATOR,
          NEW_IMAGE_URL,
          NEW_PROJECT_DESCRIPTION,
          NEW_REWARD_DESCRIPTION,
          NEW_MIN_CONTRIBUTION,
          NEW_PROJECT_GOALS,
          NEW_REWARD_DISTRIBUTION_TIMESTAMP,
          END_TIMESTAMP,
          START_TIMESTAMP,
          NEW_HAS_DISTRIBUTED_REWARD
        )
      ).to.be.revertedWith("Start timestamp must be before end timestamp");
    });
    it("should set configProjectInfo", async () => {
      let title = await summitKickstarter.title();
      let creator = await summitKickstarter.creator();
      let imageUrl = await summitKickstarter.imageUrl();
      let projectDescription = await summitKickstarter.projectDescription();
      let rewardDescription = await summitKickstarter.rewardDescription();
      let minContribution = await summitKickstarter.minContribution();
      let projectGoals = await summitKickstarter.projectGoals();
      let rewardDistributionTimestamp = await summitKickstarter.rewardDistributionTimestamp();
      let startTimestamp = await summitKickstarter.startTimestamp();
      let endTimestamp = await summitKickstarter.endTimestamp();
      let hasDistributedRewards = await summitKickstarter.hasDistributedRewards();

      assert(title, TITLE);
      assert(creator, CREATOR);
      assert(imageUrl, IMAGE_URL);
      assert(projectDescription, PROJECT_DESCRIPTION);
      assert(rewardDescription, REWARD_DESCRIPTION);
      assert(minContribution.toString(), MIN_CONTRIBUTION.toString());
      assert(projectGoals.toString(), PROJECT_GOALS.toString());
      assert(rewardDistributionTimestamp.toString(), REWARD_DISTRIBUTION_TIMESTAMP.toString());
      assert(startTimestamp.toString(), START_TIMESTAMP.toString());
      assert(endTimestamp.toString(), END_TIMESTAMP.toString());
      assert.isFalse(hasDistributedRewards);

      await summitKickstarter.configProjectInfo(
        NEW_TITLE,
        NEW_CREATOR,
        IMAGE_URL,
        NEW_PROJECT_DESCRIPTION,
        NEW_REWARD_DESCRIPTION,
        NEW_MIN_CONTRIBUTION,
        NEW_PROJECT_GOALS,
        NEW_REWARD_DISTRIBUTION_TIMESTAMP,
        NEW_START_TIMESTAMP,
        NEW_END_TIMESTAMP,
        NEW_HAS_DISTRIBUTED_REWARD
      );

      title = await summitKickstarter.title();
      creator = await summitKickstarter.creator();
      imageUrl = await summitKickstarter.imageUrl();
      projectDescription = await summitKickstarter.projectDescription();
      rewardDescription = await summitKickstarter.rewardDescription();
      minContribution = await summitKickstarter.minContribution();
      projectGoals = await summitKickstarter.projectGoals();
      rewardDistributionTimestamp = await summitKickstarter.rewardDistributionTimestamp();
      startTimestamp = await summitKickstarter.startTimestamp();
      endTimestamp = await summitKickstarter.endTimestamp();
      hasDistributedRewards = await summitKickstarter.hasDistributedRewards();

      assert(title, NEW_TITLE);
      assert(creator, NEW_CREATOR);
      assert(imageUrl, IMAGE_URL);
      assert(projectDescription, NEW_PROJECT_DESCRIPTION);
      assert(rewardDescription, NEW_REWARD_DESCRIPTION);
      assert(minContribution.toString(), NEW_MIN_CONTRIBUTION.toString());
      assert(projectGoals.toString(), NEW_PROJECT_GOALS.toString());
      assert(rewardDistributionTimestamp.toString(), NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString());
      assert(startTimestamp.toString(), NEW_START_TIMESTAMP.toString());
      assert(endTimestamp.toString(), NEW_END_TIMESTAMP.toString());
      assert.isTrue(hasDistributedRewards);
    });
  });

  describe("contribute", async () => {
    it("should be reverted if contribute less than minContribution", async () => {
      await expect(summitKickstarter.contribute({ value: (MIN_CONTRIBUTION - 1).toString() })).to.be.revertedWith(
        "Contribution must be greater than or equal to minContribution"
      );
    });

    it("should be reverted if contribute before startTimestamp", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      await summitKickstarter.setStartTimestamp(currentTime + getTimestampFromMinutes(100));
      await expect(summitKickstarter.contribute({ value: MIN_CONTRIBUTION.toString() })).to.be.revertedWith(
        "You can contribute only after start time"
      );
    });

    it("should be reverted if contribute after endTimestamp", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      await summitKickstarter.setStartTimestamp(currentTime - getTimestampFromMinutes(6));
      await summitKickstarter.setEndTimestamp(currentTime - getTimestampFromMinutes(5));
      await expect(summitKickstarter.contribute({ value: MIN_CONTRIBUTION.toString() })).to.be.revertedWith(
        "You can contribute only before end time"
      );
    });

    it("should be able to contribute", async () => {
      const initialTotalContribution = await summitKickstarter.totalContribution();
      assert.equal(initialTotalContribution.toString(), "0");

      const expectedOwnerContribution = MIN_CONTRIBUTION;
      const expectedOtherWalletContribution = MIN_CONTRIBUTION * 2;
      await summitKickstarter.contribute({ value: expectedOwnerContribution.toString() });
      await summitKickstarter.connect(otherWallet).contribute({ value: expectedOtherWalletContribution.toString() });

      const totalContribution = await summitKickstarter.totalContribution();
      assert.equal(
        totalContribution.toString(),
        (expectedOwnerContribution + expectedOtherWalletContribution).toString()
      );

      const ownerContribution = await summitKickstarter.contributions(owner.address);
      assert.equal(ownerContribution.toString(), expectedOwnerContribution.toString());

      const otherWalletContribution = await summitKickstarter.contributions(otherWallet.address);
      assert.equal(otherWalletContribution.toString(), expectedOtherWalletContribution.toString());

      const ownerContributionIndex = await summitKickstarter.contributorIndexes(owner.address);
      assert.equal(ownerContributionIndex.toString(), "0");

      const otherWalletContributionIndex = await summitKickstarter.contributorIndexes(otherWallet.address);
      assert.equal(otherWalletContributionIndex.toString(), "1");

      const ownerContributor = await summitKickstarter.contributors(ownerContributionIndex);
      assert.equal(ownerContributor.toString(), owner.address);

      const otherWalletContributor = await summitKickstarter.contributors(otherWalletContributionIndex);
      assert.equal(otherWalletContributor.toString(), otherWallet.address);

      const contributors = await summitKickstarter.getContributors();
      assert.equal(contributors.length.toString(), "2");

      assert.equal(contributors[0], owner.address);
      assert.equal(contributors[1], otherWallet.address);
    });
  });

  describe("withdrawBNB", async () => {
    it("should not withdrawBNB when called by nonOwner", async () => {
      await expect(summitKickstarter.connect(otherWallet).withdrawBNB("1", owner.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should not withdrawBNB more than the contract have", async () => {
      await expect(summitKickstarter.withdrawBNB("1", owner.address)).to.be.revertedWith(
        "You cannot withdraw more than you have"
      );
    });

    it("should be able to withdrawBNB", async () => {
      const expectedOwnerContribution = MIN_CONTRIBUTION;
      await summitKickstarter.contribute({ value: expectedOwnerContribution.toString() });

      const currentContractBalance = await provider.getBalance(summitKickstarter.address);
      assert.equal(currentContractBalance.toString(), expectedOwnerContribution.toString());

      await summitKickstarter.withdrawBNB(expectedOwnerContribution.toString(), owner.address);

      const newContractBalance = await provider.getBalance(summitKickstarter.address);
      assert.equal(newContractBalance.toString(), "0");
    });
  });
});
