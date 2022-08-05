import { ethers, waffle } from "hardhat";
import { expect, assert } from "chai";

import SummitKickstarterFactoryArtifact from "@built-contracts/SummitKickstarterFactory.sol/SummitKickstarterFactory.json";
import { SummitKickstarterFactory, SummitKickstarter } from "build/typechain";
import { utils } from "ethers";

const { deployContract, provider } = waffle;

describe("summitswapKickstarter", () => {
  const [owner, otherWallet] = provider.getWallets();
  const SERVICE_FEE = utils.parseEther("0.1");

  const TITLE = "Lorem Ipsum";
  const CREATOR = "John Doe";
  const PROJECT_DESCRIPTION = "This is a project description";
  const REWARD_DESCRIPTION = "This is a reward description";

  const MIN_CONTRIBUTION = 1000;
  const PROJECT_GOALS = 1000000;
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);
  const END_TIMESTAMP = START_TIMESTAMP + 60 * 60 * 24 * 7; // one week from now
  const REWARD_DISTRIBUTION_TIMESTAMP = END_TIMESTAMP + 60 * 60 * 24 * 7; // one week after the end date

  let summitKickstarterFactory: SummitKickstarterFactory;

  beforeEach(async () => {
    summitKickstarterFactory = (await deployContract(owner, SummitKickstarterFactoryArtifact, [
      SERVICE_FEE,
    ])) as SummitKickstarterFactory;
  });

  describe("owner", async () => {
    it("should not be nonOwner", async () => {
      assert.notEqual(await summitKickstarterFactory.owner(), otherWallet.address);
    });

    it("should be owner", async () => {
      assert.equal(await summitKickstarterFactory.owner(), owner.address);
    });
  });

  describe("transferOwnership", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(
        summitKickstarterFactory.connect(otherWallet).transferOwnership(otherWallet.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should transfer ownership to otherWallet", async () => {
      assert.equal(await summitKickstarterFactory.owner(), owner.address);
      await summitKickstarterFactory.transferOwnership(otherWallet.address);
      assert.equal(await summitKickstarterFactory.owner(), otherWallet.address);
    });
  });

  describe("serviceFee", async () => {
    it("should return SERVICE_FEE", async () => {
      const serviceFee = await summitKickstarterFactory.serviceFee();
      assert.equal(serviceFee.toString(), SERVICE_FEE.toString());
    });
  });

  describe("setServiceFee", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(summitKickstarterFactory.connect(otherWallet).setServiceFee(1)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to set serviceFee to 100", async () => {
      let serviceFee = await summitKickstarterFactory.serviceFee();
      assert.equal(serviceFee.toString(), SERVICE_FEE.toString());

      const newServiceFee = 100;
      await summitKickstarterFactory.setServiceFee(newServiceFee.toString());

      serviceFee = await summitKickstarterFactory.serviceFee();
      assert.equal(serviceFee.toString(), newServiceFee.toString());
    });
  });

  describe("createProject", async () => {
    it("should not be able to create project if pay less than service fee", async () => {
      await expect(
        summitKickstarterFactory.createProject(
          "Lorem Ipsum",
          "John Doe",
          "This is a project description",
          "This is a reward description",
          MIN_CONTRIBUTION.toString(),
          PROJECT_GOALS.toString(),
          REWARD_DISTRIBUTION_TIMESTAMP.toString(),
          START_TIMESTAMP.toString(),
          END_TIMESTAMP.toString()
        )
      ).to.be.revertedWith("Service Fee is not enough");
    });
    it("should be able to get refund excessive fee if pay more than service fee", async () => {
      const walletBalance = await provider.getBalance(otherWallet.address);
      const kickstarterContractBalance = await provider.getBalance(summitKickstarterFactory.address);

      const tx = await summitKickstarterFactory
        .connect(otherWallet)
        .createProject(
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

      const txReceipt = await tx.wait();
      const gasUsed = txReceipt.gasUsed;
      const gasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasUsed.mul(gasPrice);
      assert.equal(
        walletBalance.sub(SERVICE_FEE).sub(gasCost).toString(),
        (await provider.getBalance(otherWallet.address)).toString()
      );
      assert.equal(
        kickstarterContractBalance.add(SERVICE_FEE).toString(),
        (await provider.getBalance(summitKickstarterFactory.address)).toString()
      );
    });
    it("should be able to create project", async () => {
      await summitKickstarterFactory
        .connect(otherWallet)
        .createProject(
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

      const userProjects = await summitKickstarterFactory.getProjectsOf(otherWallet.address);
      assert.equal(userProjects.length, 1);
      assert.equal(userProjects[0], projectAddress);

      const SummitKickstarterContract = await ethers.getContractFactory("SummitKickstarter");
      const summitKickstarter = SummitKickstarterContract.attach(projectAddress) as SummitKickstarter;

      const owner = await summitKickstarter.owner();
      const title = await summitKickstarter.title();
      const creator = await summitKickstarter.creator();
      const projectDescription = await summitKickstarter.projectDescription();
      const rewardDescription = await summitKickstarter.rewardDescription();
      const minContribution = await summitKickstarter.minContribution();
      const projectGoals = await summitKickstarter.projectGoals();
      const rewardDistributionTimestamp = await summitKickstarter.rewardDistributionTimestamp();
      const startTimestamp = await summitKickstarter.startTimestamp();
      const endTimestamp = await summitKickstarter.endTimestamp();

      assert(owner, otherWallet.address);
      assert(title, TITLE);
      assert(creator, CREATOR);
      assert(projectDescription, PROJECT_DESCRIPTION);
      assert(rewardDescription, REWARD_DESCRIPTION);
      assert(minContribution.toString(), MIN_CONTRIBUTION.toString());
      assert(projectGoals.toString(), PROJECT_GOALS.toString());
      assert(rewardDistributionTimestamp.toString(), REWARD_DISTRIBUTION_TIMESTAMP.toString());
      assert(startTimestamp.toString(), START_TIMESTAMP.toString());
      assert(endTimestamp.toString(), END_TIMESTAMP.toString());
    });
  });
});
