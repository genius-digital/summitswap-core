import dayjs from "dayjs";
import { assert, expect } from "chai";
import { ethers, waffle } from "hardhat";

import SummitKickstarterFactoryArtifact from "@built-contracts/SummitKickstarterFactory.sol/SummitKickstarterFactory.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import { DummyToken, SummitKickstarter, SummitKickstarterFactory } from "build/typechain";
import { KickstarterStruct } from "build/typechain/SummitKickstarter";
import { parseEther } from "ethers/lib/utils";
import { ZERO_ADDRESS } from "src/environment";
import { getGasCostByTx } from "./utils";

const { deployContract, provider } = waffle;

describe("summitswapKickstarterFactory", () => {
  const [owner, otherWallet, adminWallet] = provider.getWallets();
  const SERVICE_FEE = parseEther("0.1");

  const TITLE = "Lorem Ipsum";
  const CREATOR = "John Doe";
  const IMAGE_URL = "https://images.com/example.png";
  const PROJECT_DESCRIPTION = "This is a project description";
  const REWARD_DESCRIPTION = "This is a reward description";
  const CONTACT_METHOD = "email";
  const CONTACT_VALUE = "john.doe@example.com";

  const MIN_CONTRIBUTION = 1000;
  const PROJECT_GOALS = 1000000;
  const START_TIMESTAMP = dayjs().unix();
  const END_TIMESTAMP = dayjs().add(1, "week").unix();
  const REWARD_DISTRIBUTION_TIMESTAMP = dayjs().add(2, "week").unix();

  let tokenA: DummyToken;
  let summitKickstarterFactory: SummitKickstarterFactory;

  const getKickstarter = (paymentToken = ZERO_ADDRESS) => {
    const kickstarter: KickstarterStruct = {
      paymentToken: paymentToken,
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
    return kickstarter;
  };

  beforeEach(async () => {
    tokenA = (await deployContract(owner, TokenArtifact, [])) as DummyToken;

    summitKickstarterFactory = (await deployContract(owner, SummitKickstarterFactoryArtifact, [
      SERVICE_FEE,
    ])) as SummitKickstarterFactory;

    await summitKickstarterFactory.setAdmins([adminWallet.address], true);
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

  describe("isAdmin", async () => {
    it("should be false when we check otherWallet", async () => {
      const isAdmin = await summitKickstarterFactory.isAdmin(otherWallet.address);
      assert.isFalse(isAdmin);
    });
    it("should be able to set otherWallet to be the admin", async () => {
      let isAdmin = await summitKickstarterFactory.isAdmin(otherWallet.address);
      assert.isFalse(isAdmin);

      await summitKickstarterFactory.setAdmins([otherWallet.address], true);
      isAdmin = await summitKickstarterFactory.isAdmin(otherWallet.address);
      assert.isTrue(isAdmin);
    });
    it("should be able to set multiple wallet to be the admin", async () => {
      let isOwnerAdmin = await summitKickstarterFactory.isAdmin(owner.address);
      let isOtherWalletAdmin = await summitKickstarterFactory.isAdmin(otherWallet.address);
      assert.isFalse(isOwnerAdmin);
      assert.isFalse(isOtherWalletAdmin);

      await summitKickstarterFactory.setAdmins([owner.address, otherWallet.address], true);
      isOwnerAdmin = await summitKickstarterFactory.isAdmin(owner.address);
      isOtherWalletAdmin = await summitKickstarterFactory.isAdmin(otherWallet.address);
      assert.isTrue(isOwnerAdmin);
      assert.isTrue(isOtherWalletAdmin);
    });
  });

  describe("setServiceFee", async () => {
    it("should revert when called by nonOwner or nonAdmin", async () => {
      await expect(summitKickstarterFactory.connect(otherWallet).setServiceFee(1)).to.be.revertedWith(
        "Only admin or owner can call this function"
      );
    });
    it("should be able to set serviceFee to 100 by the owner", async () => {
      let serviceFee = await summitKickstarterFactory.serviceFee();
      assert.equal(serviceFee.toString(), SERVICE_FEE.toString());

      const newServiceFee = 100;
      await summitKickstarterFactory.setServiceFee(newServiceFee.toString());

      serviceFee = await summitKickstarterFactory.serviceFee();
      assert.equal(serviceFee.toString(), newServiceFee.toString());
    });
    it("should be able to set serviceFee to 100 by the owner", async () => {
      let serviceFee = await summitKickstarterFactory.serviceFee();
      assert.equal(serviceFee.toString(), SERVICE_FEE.toString());

      const newServiceFee = 100;
      await summitKickstarterFactory.connect(adminWallet).setServiceFee(newServiceFee.toString());

      serviceFee = await summitKickstarterFactory.serviceFee();
      assert.equal(serviceFee.toString(), newServiceFee.toString());
    });
  });

  describe("createProject", async () => {
    it("should not be able to create project if pay less than service fee", async () => {
      await expect(
        summitKickstarterFactory.createProject(getKickstarter(), CONTACT_METHOD, CONTACT_VALUE)
      ).to.be.revertedWith("Service Fee is not enough");
    });
    it("should be able to get refund excessive fee if pay more than service fee", async () => {
      const walletBalance = await provider.getBalance(otherWallet.address);
      const kickstarterContractBalance = await provider.getBalance(summitKickstarterFactory.address);

      const tx = await summitKickstarterFactory
        .connect(otherWallet)
        .createProject(getKickstarter(), CONTACT_METHOD, CONTACT_VALUE, { value: SERVICE_FEE.add(1) });

      const gasCost = await getGasCostByTx(tx);
      assert.equal(
        walletBalance.sub(SERVICE_FEE).sub(gasCost).toString(),
        (await provider.getBalance(otherWallet.address)).toString()
      );
      assert.equal(
        kickstarterContractBalance.add(SERVICE_FEE).toString(),
        (await provider.getBalance(summitKickstarterFactory.address)).toString()
      );
    });
    it("should be able to create project with BNB Payment", async () => {
      await summitKickstarterFactory
        .connect(otherWallet)
        .createProject(getKickstarter(), CONTACT_METHOD, CONTACT_VALUE, { value: SERVICE_FEE });

      const projectAddress = await summitKickstarterFactory.projects(0);
      const projects = await summitKickstarterFactory.getProjects();
      assert.equal(projects.length, 1);
      assert.equal(projects[0], projectAddress);

      const userProjects = await summitKickstarterFactory.getProjectsOf(otherWallet.address);
      assert.equal(userProjects.length, 1);
      assert.equal(userProjects[0], projectAddress);

      const SummitKickstarterContract = await ethers.getContractFactory("SummitKickstarter");
      const summitKickstarter = SummitKickstarterContract.attach(projectAddress) as SummitKickstarter;

      const kickstarter: KickstarterStruct = await summitKickstarter.kickstarter();
      assert.equal(kickstarter.toString(), Object.values(getKickstarter()).toString());
    });
    it("should be able to create project with Token A Payment", async () => {
      await summitKickstarterFactory
        .connect(otherWallet)
        .createProject(getKickstarter(tokenA.address), CONTACT_METHOD, CONTACT_VALUE, { value: SERVICE_FEE });

      const projectAddress = await summitKickstarterFactory.projects(0);
      const projects = await summitKickstarterFactory.getProjects();
      assert.equal(projects.length, 1);
      assert.equal(projects[0], projectAddress);

      const userProjects = await summitKickstarterFactory.getProjectsOf(otherWallet.address);
      assert.equal(userProjects.length, 1);
      assert.equal(userProjects[0], projectAddress);

      const SummitKickstarterContract = await ethers.getContractFactory("SummitKickstarter");
      const summitKickstarter = SummitKickstarterContract.attach(projectAddress) as SummitKickstarter;

      const kickstarter = await summitKickstarter.kickstarter();
      assert.equal(kickstarter.toString(), Object.values(getKickstarter(tokenA.address)).toString());
    });
  });

  describe("withdraw", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(summitKickstarterFactory.connect(otherWallet).withdraw(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to withdraw as a owner", async () => {
      await summitKickstarterFactory
        .connect(otherWallet)
        .createProject(getKickstarter(tokenA.address), CONTACT_METHOD, CONTACT_VALUE, { value: SERVICE_FEE });

      const walletBalance = await provider.getBalance(owner.address);
      let contractBalance = await provider.getBalance(summitKickstarterFactory.address);
      assert.equal(contractBalance.toString(), SERVICE_FEE.toString());

      const tx = await summitKickstarterFactory.withdraw(owner.address);
      const gasCost = await getGasCostByTx(tx);

      contractBalance = await provider.getBalance(summitKickstarterFactory.address);
      assert.equal(contractBalance.toString(), "0");

      assert.equal(
        walletBalance.add(SERVICE_FEE).sub(gasCost).toString(),
        (await provider.getBalance(owner.address)).toString()
      );
    });
  });
});
