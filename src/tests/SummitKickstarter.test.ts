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
  const PROJECT_DESCRIPTION = "This is a project description";
  const REWARD_DESCRIPTION = "This is a reward description";

  const MIN_CONTRIBUTION = 1000;
  const PROJECT_GOALS = 1000000;
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);
  const END_TIMESTAMP = START_TIMESTAMP + 60 * 60 * 24 * 7; // one week from now
  const REWARD_DISTRIBUTION_TIMESTAMP = END_TIMESTAMP + 60 * 60 * 24 * 7; // one week after the end date

  const SERVICE_FEE = utils.parseEther("0.1");

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

  describe("setTitle", async () => {
    const NEW_TITLE = "New Title";
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
    const NEW_CREATOR = "New Creator";
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

  describe("setProjectDescription", async () => {
    const NEW_PROJECT_DESCRIPTION = "New Project Description";
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
    const NEW_REWARD_DESCRIPTION = "New Reward Description";
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

  describe("contribute", async () => {
    it("should be reverted if contribute less than minContribution", async () => {
      await expect(summitKickstarter.contribute({ value: (MIN_CONTRIBUTION - 1).toString() })).to.be.revertedWith(
        "Contribution must be greater than or equal to minContribution"
      );
    });

    it("should be reverted if contribute before startTimestamp", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      await summitKickstarter.setStartTimestamp(currentTime + getTimestampFromMinutes(5));
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

  describe("refund", async () => {
    beforeEach(async () => {
      const initialTotalContribution = await summitKickstarter.totalContribution();
      assert.equal(initialTotalContribution.toString(), "0");

      const expectedOwnerContribution = MIN_CONTRIBUTION;
      await summitKickstarter.contribute({ value: expectedOwnerContribution.toString() });

      const totalContribution = await summitKickstarter.totalContribution();
      assert.equal(totalContribution.toString(), expectedOwnerContribution.toString());

      const ownerContribution = await summitKickstarter.contributions(owner.address);
      assert.equal(ownerContribution.toString(), expectedOwnerContribution.toString());
    });

    it("should not refund when called by nonOwner", async () => {
      await expect(summitKickstarter.connect(otherWallet).refund(owner.address, "1")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should not refund than the user contribution", async () => {
      await expect(summitKickstarter.refund(owner.address, (MIN_CONTRIBUTION + 1).toString())).to.be.revertedWith(
        "You cannot refund more than you have contributed"
      );
    });

    it("should not be able to refund more than the contract balance", async () => {
      await summitKickstarter.withdrawBNB("1", owner.address);
      await expect(summitKickstarter.refund(owner.address, MIN_CONTRIBUTION.toString())).to.be.revertedWith(
        "You cannot withdraw more than you have"
      );
    });

    it("should be able to refund half of the contribution", async () => {
      const halfOfContribution = MIN_CONTRIBUTION / 2;
      await summitKickstarter.refund(owner.address, halfOfContribution.toString());

      const totalContribution = await summitKickstarter.totalContribution();
      assert.equal(totalContribution.toString(), halfOfContribution.toString());

      const ownerContribution = await summitKickstarter.contributions(owner.address);
      assert.equal(ownerContribution.toString(), halfOfContribution.toString());

      const contributors = await summitKickstarter.getContributors();
      assert(contributors.length.toString(), "1");

      const ownerContributionIndex = await summitKickstarter.contributorIndexes(owner.address);
      assert.equal(ownerContributionIndex.toString(), "0");
    });

    it("should be able to refund all of the contribution", async () => {
      const allOfContribution = MIN_CONTRIBUTION;
      await summitKickstarter.refund(owner.address, allOfContribution.toString());

      const totalContribution = await summitKickstarter.totalContribution();
      assert.equal(totalContribution.toString(), "0");

      const ownerContribution = await summitKickstarter.contributions(owner.address);
      assert.equal(ownerContribution.toString(), "0");

      const contributors = await summitKickstarter.getContributors();
      assert(contributors.length.toString(), "0");

      const ownerContributionIndex = await summitKickstarter.contributorIndexes(owner.address);
      assert.equal(ownerContributionIndex.toString(), "0");
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
