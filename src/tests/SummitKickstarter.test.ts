import dayjs from "dayjs";
import { assert, expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { ethers, waffle } from "hardhat";

import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import SummitKickstarterFactoryArtifact from "@built-contracts/SummitKickstarterFactory.sol/SummitKickstarterFactory.json";
import { DummyToken, SummitKickstarter, SummitKickstarterFactory } from "build/typechain";
import { KickstarterStruct } from "build/typechain/SummitKickstarter";
import { ZERO_ADDRESS } from "src/environment";
import { getGasCostByTx } from "./utils";

const { deployContract, provider } = waffle;

describe("summitKickstarter", () => {
  const [owner, otherWallet, factoryAdminWallet, adminWallet] = provider.getWallets();

  enum ApprovalStatus {
    PENDING = 0,
    APPROVED = 1,
    REJECTED = 2,
  }

  const TITLE = "Lorem Ipsum";
  const CREATOR = "John Doe";
  const IMAGE_URL = "https://images.com/example.png";
  const PROJECT_DESCRIPTION = "This is a project description";
  const REWARD_DESCRIPTION = "This is a reward description";

  const MIN_CONTRIBUTION = 1000;
  const PROJECT_GOALS = 1000000;
  const START_TIMESTAMP = dayjs().unix();
  const END_TIMESTAMP = dayjs().add(1, "week").unix();
  const REWARD_DISTRIBUTION_TIMESTAMP = dayjs().add(2, "week").unix();

  const SERVICE_FEE = parseEther("0.1");

  const EMAIL = "john.doe@example.com";
  const REJECT_REASON = "This is Reject Reason";

  const FEE_DENOMINATOR = 10000;
  const PERCENTAGE_FEE_AMOUNT = 2000;
  const FIX_FEE_AMOUNT = 100;

  const NEW_TITLE = "New Title";
  const NEW_CREATOR = "New Creator";
  const NEW_IMAGE_URL = "https://images.com/new-example.png";
  const NEW_PROJECT_DESCRIPTION = "New Project Description";
  const NEW_REWARD_DESCRIPTION = "New Reward Description";
  const NEW_MIN_CONTRIBUTION = MIN_CONTRIBUTION * 2;
  const NEW_PROJECT_GOALS = PROJECT_GOALS * 2;
  const NEW_REWARD_DISTRIBUTION_TIMESTAMP = REWARD_DISTRIBUTION_TIMESTAMP + 1;
  const NEW_START_TIMESTAMP = START_TIMESTAMP + 1;
  const NEW_END_TIMESTAMP = END_TIMESTAMP + 1;

  let tokenA: DummyToken;
  let summitKickstarterFactory: SummitKickstarterFactory;
  let summitKickstarterWithBnbPayment: SummitKickstarter;
  let summitKickstarterWithTokenAPayment: SummitKickstarter;

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

  const getNewKickstarter = (paymentToken = ZERO_ADDRESS) => {
    const kickstarter: KickstarterStruct = {
      paymentToken: paymentToken,
      title: NEW_TITLE,
      creator: NEW_CREATOR,
      imageUrl: NEW_IMAGE_URL,
      projectDescription: NEW_PROJECT_DESCRIPTION,
      rewardDescription: NEW_REWARD_DESCRIPTION,
      minContribution: NEW_MIN_CONTRIBUTION,
      projectGoals: NEW_PROJECT_GOALS,
      rewardDistributionTimestamp: NEW_REWARD_DISTRIBUTION_TIMESTAMP,
      startTimestamp: NEW_START_TIMESTAMP,
      endTimestamp: NEW_END_TIMESTAMP,
    };
    return kickstarter;
  };

  beforeEach(async () => {
    tokenA = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
    summitKickstarterFactory = (await deployContract(owner, SummitKickstarterFactoryArtifact, [
      SERVICE_FEE,
    ])) as SummitKickstarterFactory;

    await summitKickstarterFactory.setAdmins([factoryAdminWallet.address], true);

    await summitKickstarterFactory.createProject(getKickstarter(), { value: SERVICE_FEE });
    await summitKickstarterFactory.createProject(getKickstarter(tokenA.address), { value: SERVICE_FEE });

    const projectWithBnbPaymentAddress = await summitKickstarterFactory.projects(0);
    const projectWithTokenAPaymentAddress = await summitKickstarterFactory.projects(1);

    const SummitKickstarterContract = await ethers.getContractFactory("SummitKickstarter");
    summitKickstarterWithBnbPayment = SummitKickstarterContract.attach(projectWithBnbPaymentAddress);
    summitKickstarterWithTokenAPayment = SummitKickstarterContract.attach(projectWithTokenAPaymentAddress);

    await summitKickstarterWithBnbPayment.setAdmins([adminWallet.address], true);
    await summitKickstarterWithTokenAPayment.setAdmins([adminWallet.address], true);

    await tokenA.transfer(otherWallet.address, parseEther("100"));

    await tokenA.approve(summitKickstarterWithTokenAPayment.address, parseEther("1"));
    await tokenA.connect(otherWallet).approve(summitKickstarterWithTokenAPayment.address, parseEther("1"));
  });

  describe("owner", async () => {
    it("should not be nonOwner", async () => {
      assert.notEqual(await summitKickstarterWithBnbPayment.owner(), otherWallet.address);
    });

    it("should be owner", async () => {
      assert.equal(await summitKickstarterWithBnbPayment.owner(), owner.address);
    });
  });

  describe("transferOwnership", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).transferOwnership(otherWallet.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should transfer ownership to otherWallet", async () => {
      assert.equal(await summitKickstarterWithBnbPayment.owner(), owner.address);
      await summitKickstarterWithBnbPayment.transferOwnership(otherWallet.address);
      assert.equal(await summitKickstarterWithBnbPayment.owner(), otherWallet.address);
    });
  });

  describe("isAdmin", async () => {
    it("should be false when we check otherWallet", async () => {
      const isAdmin = await summitKickstarterWithBnbPayment.isAdmin(otherWallet.address);
      assert.isFalse(isAdmin);
    });
    it("should be able to set otherWallet to be the admin", async () => {
      let isAdmin = await summitKickstarterWithBnbPayment.isAdmin(otherWallet.address);
      assert.isFalse(isAdmin);

      await summitKickstarterWithBnbPayment.setAdmins([otherWallet.address], true);
      isAdmin = await summitKickstarterWithBnbPayment.isAdmin(otherWallet.address);
      assert.isTrue(isAdmin);
    });
    it("should be able to set multiple wallet to be the admin", async () => {
      let isOwnerAdmin = await summitKickstarterWithBnbPayment.isAdmin(owner.address);
      let isOtherWalletAdmin = await summitKickstarterWithBnbPayment.isAdmin(otherWallet.address);
      assert.isFalse(isOwnerAdmin);
      assert.isFalse(isOtherWalletAdmin);

      await summitKickstarterWithBnbPayment.setAdmins([owner.address, otherWallet.address], true);
      isOwnerAdmin = await summitKickstarterWithBnbPayment.isAdmin(owner.address);
      isOtherWalletAdmin = await summitKickstarterWithBnbPayment.isAdmin(otherWallet.address);
      assert.isTrue(isOwnerAdmin);
      assert.isTrue(isOtherWalletAdmin);
    });
  });

  describe("factory", async () => {
    it("should be summitFactory address", async () => {
      const factory = await summitKickstarterWithBnbPayment.factory();
      assert.equal(factory, summitKickstarterFactory.address);
    });
  });

  describe("percentageFeeAmount", async () => {
    it("should be 0", async () => {
      const percentageFeeAmount = await summitKickstarterWithBnbPayment.percentageFeeAmount();
      assert.equal(percentageFeeAmount.toString(), "0");
    });
  });

  describe("fixFeeAmount", async () => {
    it("should be 0", async () => {
      const fixFeeAmount = await summitKickstarterWithBnbPayment.fixFeeAmount();
      assert.equal(fixFeeAmount.toString(), "0");
    });
  });

  describe("approvalStatus", async () => {
    it(`should be pending`, async () => {
      const approvalStatus = await summitKickstarterWithBnbPayment.approvalStatus();
      assert.equal(approvalStatus.toString(), ApprovalStatus.PENDING.toString());
    });
  });

  describe("title", async () => {
    it(`should be ${TITLE}`, async () => {
      const title = (await summitKickstarterWithBnbPayment.kickstarter()).title;
      assert.equal(title.toString(), TITLE.toString());
    });
  });

  describe("creator", async () => {
    it(`should be ${CREATOR}`, async () => {
      const creator = (await summitKickstarterWithBnbPayment.kickstarter()).creator;
      assert.equal(creator.toString(), CREATOR.toString());
    });
  });

  describe("imageUrl", async () => {
    it(`should be ${IMAGE_URL}`, async () => {
      const imageUrl = (await summitKickstarterWithBnbPayment.kickstarter()).imageUrl;
      assert.equal(imageUrl.toString(), IMAGE_URL.toString());
    });
  });

  describe("projectDescription", async () => {
    it(`should be ${PROJECT_DESCRIPTION}`, async () => {
      const projectDescription = (await summitKickstarterWithBnbPayment.kickstarter()).projectDescription;
      assert.equal(projectDescription.toString(), PROJECT_DESCRIPTION.toString());
    });
  });

  describe("rewardDescription", async () => {
    it(`should be ${REWARD_DESCRIPTION}`, async () => {
      const rewardDescription = (await summitKickstarterWithBnbPayment.kickstarter()).rewardDescription;
      assert.equal(rewardDescription.toString(), REWARD_DESCRIPTION.toString());
    });
  });

  describe("minContribution", async () => {
    it(`should be ${MIN_CONTRIBUTION}`, async () => {
      const minContribution = (await summitKickstarterWithBnbPayment.kickstarter()).minContribution;
      assert.equal(minContribution.toString(), MIN_CONTRIBUTION.toString());
    });
  });

  describe("projectGoals", async () => {
    it(`should be ${PROJECT_GOALS}`, async () => {
      const projectGoals = (await summitKickstarterWithBnbPayment.kickstarter()).projectGoals;
      assert.equal(projectGoals.toString(), PROJECT_GOALS.toString());
    });
  });

  describe("startTimestamp", async () => {
    it(`should be ${START_TIMESTAMP}`, async () => {
      const startTimestamp = (await summitKickstarterWithBnbPayment.kickstarter()).startTimestamp;
      assert.equal(startTimestamp.toString(), START_TIMESTAMP.toString());
    });
  });

  describe("endTimestamp", async () => {
    it(`should be ${END_TIMESTAMP}`, async () => {
      const endTimestamp = (await summitKickstarterWithBnbPayment.kickstarter()).endTimestamp;
      assert.equal(endTimestamp.toString(), END_TIMESTAMP.toString());
    });
  });

  describe("rewardDistributionTimestamp", async () => {
    it(`should be ${REWARD_DISTRIBUTION_TIMESTAMP}`, async () => {
      const rewardDistributionTimestamp = (await summitKickstarterWithBnbPayment.kickstarter())
        .rewardDistributionTimestamp;
      assert.equal(rewardDistributionTimestamp.toString(), REWARD_DISTRIBUTION_TIMESTAMP.toString());
    });
  });

  describe("setPercentageFeeAmount", async () => {
    it("should not set setPercentageFeeAmount when called by nonFactoryOwner or nonFactoryAdmin", async () => {
      await expect(summitKickstarterWithBnbPayment.connect(otherWallet).setPercentageFeeAmount(1)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
      await expect(summitKickstarterWithBnbPayment.connect(adminWallet).setPercentageFeeAmount(1)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
    });
    it("should be reverted if set more than FEE_DENOMINATOR", async () => {
      await expect(summitKickstarterWithBnbPayment.setPercentageFeeAmount(FEE_DENOMINATOR + 1)).to.be.revertedWith(
        "percentageFeeAmount should be less than FEE_DENOMINATOR"
      );
    });
    it("should be reverted if set fee more than projectGoals", async () => {
      await summitKickstarterWithBnbPayment.setFixFeeAmount(1);
      await expect(summitKickstarterWithBnbPayment.setPercentageFeeAmount(FEE_DENOMINATOR)).to.be.revertedWith(
        "Withdrawal fee should not more than project goals"
      );
    });
    it("should be able to setPercentageFeeAmount by FactoryOwner or FactoryAdmin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.percentageFeeAmount()).toString(), "0");
      await summitKickstarterWithBnbPayment.setPercentageFeeAmount("1");
      assert.equal((await summitKickstarterWithBnbPayment.percentageFeeAmount()).toString(), "1");
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setPercentageFeeAmount("2");
      assert.equal((await summitKickstarterWithBnbPayment.percentageFeeAmount()).toString(), "2");
    });
  });

  describe("setFixFeeAmount", async () => {
    it("should not set setFixFeeAmount when called by nonFactoryOwner or nonFactoryAdmin", async () => {
      await expect(summitKickstarterWithBnbPayment.connect(otherWallet).setFixFeeAmount(1)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
      await expect(summitKickstarterWithBnbPayment.connect(adminWallet).setFixFeeAmount(1)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
    });
    it("should be reverted if set fee more than projectGoals", async () => {
      await expect(summitKickstarterWithBnbPayment.setFixFeeAmount(PROJECT_GOALS + 1)).to.be.revertedWith(
        "Withdrawal fee should not more than project goals"
      );
    });
    it("should be able to setFixFeeAmount by FactoryOwner or FactoryAdmin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.fixFeeAmount()).toString(), "0");
      await summitKickstarterWithBnbPayment.setFixFeeAmount("1");
      assert.equal((await summitKickstarterWithBnbPayment.fixFeeAmount()).toString(), "1");
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setFixFeeAmount("2");
      assert.equal((await summitKickstarterWithBnbPayment.fixFeeAmount()).toString(), "2");
    });
  });

  describe("setTitle", async () => {
    it("should not set setTitle when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(summitKickstarterWithBnbPayment.connect(otherWallet).setTitle(NEW_TITLE)).to.be.revertedWith(
        "Only admin can call this function"
      );
    });
    it("should set setTitle by Factory Owner", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).title, TITLE);
      await summitKickstarterWithBnbPayment.setTitle(NEW_TITLE);
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).title, NEW_TITLE);
    });
    it("should set setTitle by FactoryAdmin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).title, TITLE);
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setTitle(NEW_TITLE);
      assert.equal((await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).title, NEW_TITLE);
    });
    it("should set setTitle by Admin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).title, TITLE);
      await summitKickstarterWithBnbPayment.connect(adminWallet).setTitle(NEW_TITLE);
      assert.equal((await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).title, NEW_TITLE);
    });
  });

  describe("setCreator", async () => {
    it("should not set setCreator when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(summitKickstarterWithBnbPayment.connect(otherWallet).setCreator(NEW_CREATOR)).to.be.revertedWith(
        "Only admin can call this function"
      );
    });
    it("should set setCreator by Factory Owner", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).creator, CREATOR);
      await summitKickstarterWithBnbPayment.setCreator(NEW_CREATOR);
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).creator, NEW_CREATOR);
    });
    it("should set setCreator by FactoryAdmin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).creator, CREATOR);
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setCreator(NEW_CREATOR);
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).creator,
        NEW_CREATOR
      );
    });
    it("should set setCreator by Admin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).creator, CREATOR);
      await summitKickstarterWithBnbPayment.connect(adminWallet).setCreator(NEW_CREATOR);
      assert.equal((await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).creator, NEW_CREATOR);
    });
  });

  describe("setImageUrl", async () => {
    it("should not set setImageUrl when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(summitKickstarterWithBnbPayment.connect(otherWallet).setImageUrl(NEW_IMAGE_URL)).to.be.revertedWith(
        "Only admin can call this function"
      );
    });
    it("should set setImageUrl by Factory Owner", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).imageUrl, IMAGE_URL);
      await summitKickstarterWithBnbPayment.setImageUrl(NEW_IMAGE_URL);
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).imageUrl, NEW_IMAGE_URL);
    });
    it("should set setImageUrl by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).imageUrl,
        IMAGE_URL
      );
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setImageUrl(NEW_IMAGE_URL);
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).imageUrl,
        NEW_IMAGE_URL
      );
    });
    it("should set setImageUrl by Admin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).imageUrl, IMAGE_URL);
      await summitKickstarterWithBnbPayment.connect(adminWallet).setImageUrl(NEW_IMAGE_URL);
      assert.equal((await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).imageUrl, NEW_IMAGE_URL);
    });
  });

  describe("setProjectDescription", async () => {
    it("should not set setProjectDescription when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).setProjectDescription(NEW_PROJECT_DESCRIPTION)
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should set setProjectDescription by Factory Owner", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).projectDescription, PROJECT_DESCRIPTION);
      await summitKickstarterWithBnbPayment.setProjectDescription(NEW_PROJECT_DESCRIPTION);
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).projectDescription, NEW_PROJECT_DESCRIPTION);
    });
    it("should set setProjectDescription by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).projectDescription,
        PROJECT_DESCRIPTION
      );
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setProjectDescription(NEW_PROJECT_DESCRIPTION);
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).projectDescription,
        NEW_PROJECT_DESCRIPTION
      );
    });
    it("should set setProjectDescription by Admin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).projectDescription,
        PROJECT_DESCRIPTION
      );
      await summitKickstarterWithBnbPayment.connect(adminWallet).setProjectDescription(NEW_PROJECT_DESCRIPTION);
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).projectDescription,
        NEW_PROJECT_DESCRIPTION
      );
    });
  });

  describe("setRewardDescription", async () => {
    it("should not set setRewardDescription when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).setRewardDescription(NEW_REWARD_DESCRIPTION)
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should set setRewardDescription by Factory Owner", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).rewardDescription, REWARD_DESCRIPTION);
      await summitKickstarterWithBnbPayment.setRewardDescription(NEW_REWARD_DESCRIPTION);
      assert.equal((await summitKickstarterWithBnbPayment.kickstarter()).rewardDescription, NEW_REWARD_DESCRIPTION);
    });
    it("should set setRewardDescription by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).rewardDescription,
        REWARD_DESCRIPTION
      );
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setRewardDescription(NEW_REWARD_DESCRIPTION);
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).rewardDescription,
        NEW_REWARD_DESCRIPTION
      );
    });
    it("should set setRewardDescription by Admin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).rewardDescription,
        REWARD_DESCRIPTION
      );
      await summitKickstarterWithBnbPayment.connect(adminWallet).setRewardDescription(NEW_REWARD_DESCRIPTION);
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).rewardDescription,
        NEW_REWARD_DESCRIPTION
      );
    });
  });

  describe("setMinContribution", async () => {
    it("should not set setMinContribution when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).setMinContribution(NEW_MIN_CONTRIBUTION.toString())
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should set setMinContribution by Factory Owner", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).minContribution.toString(),
        MIN_CONTRIBUTION.toString()
      );
      await summitKickstarterWithBnbPayment.setMinContribution(NEW_MIN_CONTRIBUTION.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).minContribution.toString(),
        NEW_MIN_CONTRIBUTION.toString()
      );
    });
    it("should set setMinContribution by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).minContribution.toString(),
        MIN_CONTRIBUTION.toString()
      );
      await summitKickstarterWithBnbPayment
        .connect(factoryAdminWallet)
        .setMinContribution(NEW_MIN_CONTRIBUTION.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).minContribution.toString(),
        NEW_MIN_CONTRIBUTION.toString()
      );
    });
    it("should set setMinContribution by Admin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).minContribution.toString(),
        MIN_CONTRIBUTION.toString()
      );
      await summitKickstarterWithBnbPayment.connect(adminWallet).setMinContribution(NEW_MIN_CONTRIBUTION.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).minContribution.toString(),
        NEW_MIN_CONTRIBUTION.toString()
      );
    });
  });

  describe("setProjectGoals", async () => {
    it("should not set setProjectGoals when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).setProjectGoals(NEW_PROJECT_GOALS.toString())
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should set setProjectGoals by Factory Owner", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).projectGoals.toString(),
        PROJECT_GOALS.toString()
      );
      await summitKickstarterWithBnbPayment.setProjectGoals(NEW_PROJECT_GOALS.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).projectGoals.toString(),
        NEW_PROJECT_GOALS.toString()
      );
    });
    it("should set setProjectGoals by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).projectGoals.toString(),
        PROJECT_GOALS.toString()
      );
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setProjectGoals(NEW_PROJECT_GOALS.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).projectGoals.toString(),
        NEW_PROJECT_GOALS.toString()
      );
    });
    it("should set setProjectGoals by Admin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).projectGoals.toString(),
        PROJECT_GOALS.toString()
      );
      await summitKickstarterWithBnbPayment.connect(adminWallet).setProjectGoals(NEW_PROJECT_GOALS.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).projectGoals.toString(),
        NEW_PROJECT_GOALS.toString()
      );
    });
  });

  describe("setRewardDistributionTimestamp", async () => {
    it("should not set setRewardDistributionTimestamp when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment
          .connect(otherWallet)
          .setRewardDistributionTimestamp(NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString())
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should set setRewardDistributionTimestamp by Factory Owner", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).rewardDistributionTimestamp.toString(),
        REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment.setRewardDistributionTimestamp(
        NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).rewardDistributionTimestamp.toString(),
        NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
    });
    it("should set setRewardDistributionTimestamp by FactoryAdmin", async () => {
      assert.equal(
        (
          await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()
        ).rewardDistributionTimestamp.toString(),
        REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment
        .connect(factoryAdminWallet)
        .setRewardDistributionTimestamp(NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString());
      assert.equal(
        (
          await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()
        ).rewardDistributionTimestamp.toString(),
        NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
    });
    it("should set setRewardDistributionTimestamp by Admin", async () => {
      assert.equal(
        (
          await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()
        ).rewardDistributionTimestamp.toString(),
        REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment
        .connect(adminWallet)
        .setRewardDistributionTimestamp(NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString());
      assert.equal(
        (
          await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()
        ).rewardDistributionTimestamp.toString(),
        NEW_REWARD_DISTRIBUTION_TIMESTAMP.toString()
      );
    });
  });

  describe("setStartTimestamp", async () => {
    it("should not set setStartTimestamp when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).setStartTimestamp(NEW_START_TIMESTAMP.toString())
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should not set more than or equal to END_TIMESTAMP", async () => {
      await expect(summitKickstarterWithBnbPayment.setStartTimestamp(END_TIMESTAMP.toString())).to.be.revertedWith(
        "Start timestamp must be before end timestamp"
      );
    });
    it("should set setStartTimestamp by Factory Owner", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).startTimestamp.toString(),
        START_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment.setStartTimestamp(NEW_START_TIMESTAMP.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).startTimestamp.toString(),
        NEW_START_TIMESTAMP.toString()
      );
    });
    it("should set setStartTimestamp by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).startTimestamp.toString(),
        START_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment
        .connect(factoryAdminWallet)
        .setStartTimestamp(NEW_START_TIMESTAMP.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).startTimestamp.toString(),
        NEW_START_TIMESTAMP.toString()
      );
    });
    it("should set setStartTimestamp by Admin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).startTimestamp.toString(),
        START_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment.connect(adminWallet).setStartTimestamp(NEW_START_TIMESTAMP.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).startTimestamp.toString(),
        NEW_START_TIMESTAMP.toString()
      );
    });
  });

  describe("setEndTimestamp", async () => {
    it("should not set setEndTimestamp when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).setEndTimestamp(NEW_END_TIMESTAMP.toString())
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should set setEndTimestamp by Factory Owner", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).endTimestamp.toString(),
        END_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment.setEndTimestamp(NEW_END_TIMESTAMP.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.kickstarter()).endTimestamp.toString(),
        NEW_END_TIMESTAMP.toString()
      );
    });
    it("should not set less than or equal to START_TIMESTAMP", async () => {
      await expect(summitKickstarterWithBnbPayment.setEndTimestamp(START_TIMESTAMP.toString())).to.be.revertedWith(
        "End timestamp must be after start timestamp"
      );
    });
    it("should set setEndTimestamp by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).endTimestamp.toString(),
        END_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).setEndTimestamp(NEW_END_TIMESTAMP.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).kickstarter()).endTimestamp.toString(),
        NEW_END_TIMESTAMP.toString()
      );
    });
    it("should set setEndTimestamp by Admin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).endTimestamp.toString(),
        END_TIMESTAMP.toString()
      );
      await summitKickstarterWithBnbPayment.connect(adminWallet).setEndTimestamp(NEW_END_TIMESTAMP.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.connect(adminWallet).kickstarter()).endTimestamp.toString(),
        NEW_END_TIMESTAMP.toString()
      );
    });
  });

  describe("setApprovalStatus", async () => {
    it("should not set setApprovalStatus when called by nonFactoryOwner or nonFactoryAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).setApprovalStatus(ApprovalStatus.APPROVED.toString())
      ).to.be.revertedWith("Only factory admin can call this function");
      await expect(
        summitKickstarterWithBnbPayment.connect(adminWallet).setApprovalStatus(ApprovalStatus.APPROVED.toString())
      ).to.be.revertedWith("Only factory admin can call this function");
    });
    it("should be able to setApprovalStatus to 1 when called by FactoryOwner", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.approvalStatus()).toString(),
        ApprovalStatus.PENDING.toString()
      );
      await summitKickstarterWithBnbPayment.setApprovalStatus(ApprovalStatus.APPROVED.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.approvalStatus()).toString(),
        ApprovalStatus.APPROVED.toString()
      );
    });
    it("should be able to setApprovalStatus to 1 when called by FactoryAdmin", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.approvalStatus()).toString(),
        ApprovalStatus.PENDING.toString()
      );
      await summitKickstarterWithBnbPayment
        .connect(factoryAdminWallet)
        .setApprovalStatus(ApprovalStatus.REJECTED.toString());
      assert.equal(
        (await summitKickstarterWithBnbPayment.approvalStatus()).toString(),
        ApprovalStatus.REJECTED.toString()
      );
    });
  });

  describe("approve", async () => {
    it("should not set approve when called by nonFactoryOwner or nonFactoryAdmin", async () => {
      await expect(summitKickstarterWithBnbPayment.connect(otherWallet).approve(1, 1)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
      await expect(summitKickstarterWithBnbPayment.connect(adminWallet).approve(1, 1)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
    });
    it("should be able to approve when called by factory owner", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "0");
      assert.equal((await summitKickstarterWithBnbPayment.percentageFeeAmount()).toString(), "0");
      assert.equal((await summitKickstarterWithBnbPayment.fixFeeAmount()).toString(), "0");

      await summitKickstarterWithBnbPayment.approve(PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT);

      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "1");
      assert.equal(
        (await summitKickstarterWithBnbPayment.percentageFeeAmount()).toString(),
        PERCENTAGE_FEE_AMOUNT.toString()
      );
      assert.equal((await summitKickstarterWithBnbPayment.fixFeeAmount()).toString(), FIX_FEE_AMOUNT.toString());
    });
    it("should be able to approve when called by factory admin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "0");
      assert.equal((await summitKickstarterWithBnbPayment.percentageFeeAmount()).toString(), "0");
      assert.equal((await summitKickstarterWithBnbPayment.fixFeeAmount()).toString(), "0");

      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).approve(PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT);

      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "1");
      assert.equal(
        (await summitKickstarterWithBnbPayment.percentageFeeAmount()).toString(),
        PERCENTAGE_FEE_AMOUNT.toString()
      );
      assert.equal((await summitKickstarterWithBnbPayment.fixFeeAmount()).toString(), FIX_FEE_AMOUNT.toString());
    });
  });

  describe("reject", async () => {
    it("should not set reject when called by nonFactoryOwner or nonFactoryAdmin", async () => {
      await expect(summitKickstarterWithBnbPayment.connect(otherWallet).reject(REJECT_REASON)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
      await expect(summitKickstarterWithBnbPayment.connect(adminWallet).reject(REJECT_REASON)).to.be.revertedWith(
        "Only factory admin can call this function"
      );
    });
    it("should be able to reject when called by factory owner", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "0");
      assert.equal((await summitKickstarterWithBnbPayment.rejectedReason()).toString(), "");

      await summitKickstarterWithBnbPayment.reject(REJECT_REASON);

      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "2");
      assert.equal((await summitKickstarterWithBnbPayment.rejectedReason()).toString(), REJECT_REASON);
    });
    it("should be able to approve when called by factory admin", async () => {
      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "0");
      assert.equal((await summitKickstarterWithBnbPayment.rejectedReason()).toString(), "");

      await summitKickstarterWithBnbPayment.connect(factoryAdminWallet).reject(REJECT_REASON);

      assert.equal((await summitKickstarterWithBnbPayment.approvalStatus()).toString(), "2");
      assert.equal((await summitKickstarterWithBnbPayment.rejectedReason()).toString(), REJECT_REASON);
    });
  });

  describe("configProjectInfo", async () => {
    it("should not set configProjectInfo when called by nonFactoryOwner or nonFactoryAdmin or nonAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment
          .connect(otherWallet)
          ["configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256))"](
            getKickstarter()
          )
      ).to.be.revertedWith("Only admin can call this function");
    });
    it("should not set configProjectInfo if start date is greater than end date", async () => {
      const kickstarter = getKickstarter();
      kickstarter.startTimestamp = END_TIMESTAMP;
      kickstarter.endTimestamp = START_TIMESTAMP;
      await expect(
        summitKickstarterWithBnbPayment[
          "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256))"
        ](kickstarter)
      ).to.be.revertedWith("Start timestamp must be before end timestamp");
    });
    it("should not change paymentToken after approval", async () => {
      await summitKickstarterWithBnbPayment.setApprovalStatus(ApprovalStatus.APPROVED.toString());
      await expect(
        summitKickstarterWithBnbPayment[
          "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256))"
        ](getKickstarter(tokenA.address))
      ).to.be.revertedWith("You can't change payment token after Approval");
    });
    it("should set configProjectInfo", async () => {
      let kickstarter = await summitKickstarterWithBnbPayment.kickstarter();
      assert.equal(kickstarter.toString(), Object.values(getKickstarter()).toString());

      await summitKickstarterWithBnbPayment[
        "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256))"
      ](getNewKickstarter(tokenA.address));

      kickstarter = await summitKickstarterWithBnbPayment.kickstarter();
      assert.equal(kickstarter.toString(), Object.values(getNewKickstarter(tokenA.address)).toString());
    });
  });

  describe("configProjectInfo by FactoryAdmin or FactoryOwner", async () => {
    it("should not set configProjectInfo when called by nonFactoryOwner or nonFactoryAdmin", async () => {
      await expect(
        summitKickstarterWithBnbPayment
          .connect(otherWallet)
          [
            "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
          ](getNewKickstarter(tokenA.address), ApprovalStatus.APPROVED, PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT)
      ).to.be.revertedWith("Only factory admin can call this function");
      await expect(
        summitKickstarterWithBnbPayment
          .connect(adminWallet)
          [
            "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
          ](getNewKickstarter(tokenA.address), ApprovalStatus.APPROVED, PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT)
      ).to.be.revertedWith("Only factory admin can call this function");
    });
    it("should not set configProjectInfo if start date is greater than end date", async () => {
      const kickstarter = getKickstarter();
      kickstarter.startTimestamp = END_TIMESTAMP;
      kickstarter.endTimestamp = START_TIMESTAMP;
      await expect(
        summitKickstarterWithBnbPayment[
          "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
        ](kickstarter, ApprovalStatus.APPROVED, PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT)
      ).to.be.revertedWith("Start timestamp must be before end timestamp");
    });
    it("should not change paymentToken after approval", async () => {
      await summitKickstarterWithBnbPayment.setApprovalStatus(ApprovalStatus.APPROVED.toString());
      await expect(
        summitKickstarterWithBnbPayment[
          "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
        ](getNewKickstarter(tokenA.address), ApprovalStatus.APPROVED, PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT)
      ).to.be.revertedWith("You can't change payment token after Approval");
    });
    it("should not set fee more than project goals", async () => {
      await expect(
        summitKickstarterWithBnbPayment[
          "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
        ](getNewKickstarter(tokenA.address), ApprovalStatus.APPROVED, FEE_DENOMINATOR, 1)
      ).to.be.revertedWith("Withdrawal fee should not more than project goals");

      await expect(
        summitKickstarterWithBnbPayment[
          "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
        ](getNewKickstarter(tokenA.address), ApprovalStatus.APPROVED, 0, PROJECT_GOALS + 1)
      ).to.be.revertedWith("Withdrawal fee should not more than project goals");
    });
    it("should set configProjectInfo by FactoryOwner", async () => {
      let kickstarter = await summitKickstarterWithBnbPayment.kickstarter();
      let percentageFeeAmount = await summitKickstarterWithBnbPayment.percentageFeeAmount();
      let fixFeeAmount = await summitKickstarterWithBnbPayment.fixFeeAmount();

      assert.equal(kickstarter.toString(), Object.values(getKickstarter()).toString());
      assert.equal(percentageFeeAmount.toString(), "0");
      assert.equal(fixFeeAmount.toString(), "0");

      await summitKickstarterWithBnbPayment[
        "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
      ](getNewKickstarter(tokenA.address), ApprovalStatus.APPROVED, PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT);

      kickstarter = await summitKickstarterWithBnbPayment.kickstarter();
      percentageFeeAmount = await summitKickstarterWithBnbPayment.percentageFeeAmount();
      fixFeeAmount = await summitKickstarterWithBnbPayment.fixFeeAmount();

      assert.equal(kickstarter.toString(), Object.values(getNewKickstarter(tokenA.address)).toString());
      assert.equal(percentageFeeAmount.toString(), PERCENTAGE_FEE_AMOUNT.toString());
      assert.equal(fixFeeAmount.toString(), FIX_FEE_AMOUNT.toString());
    });
    it("should set configProjectInfo by FactoryAdmin", async () => {
      let kickstarter = await summitKickstarterWithBnbPayment.kickstarter();
      let percentageFeeAmount = await summitKickstarterWithBnbPayment.percentageFeeAmount();
      let fixFeeAmount = await summitKickstarterWithBnbPayment.fixFeeAmount();

      assert.equal(kickstarter.toString(), Object.values(getKickstarter()).toString());
      assert.equal(percentageFeeAmount.toString(), "0");
      assert.equal(fixFeeAmount.toString(), "0");

      await summitKickstarterWithBnbPayment
        .connect(factoryAdminWallet)
        [
          "configProjectInfo((address,string,string,string,string,string,uint256,uint256,uint256,uint256,uint256),uint8,uint256,uint256)"
        ](getNewKickstarter(tokenA.address), ApprovalStatus.APPROVED, PERCENTAGE_FEE_AMOUNT, FIX_FEE_AMOUNT);

      kickstarter = await summitKickstarterWithBnbPayment.kickstarter();
      percentageFeeAmount = await summitKickstarterWithBnbPayment.percentageFeeAmount();
      fixFeeAmount = await summitKickstarterWithBnbPayment.fixFeeAmount();

      assert.equal(kickstarter.toString(), Object.values(getNewKickstarter(tokenA.address)).toString());
      assert.equal(percentageFeeAmount.toString(), PERCENTAGE_FEE_AMOUNT.toString());
      assert.equal(fixFeeAmount.toString(), FIX_FEE_AMOUNT.toString());
    });
  });

  describe("contribute", async () => {
    it("should be reverted if kickstarter is not approved", async () => {
      assert.equal(
        (await summitKickstarterWithBnbPayment.approvalStatus()).toString(),
        ApprovalStatus.PENDING.toString()
      );
      await expect(
        summitKickstarterWithBnbPayment.contribute(EMAIL, parseEther("0.01").toString(), {
          value: parseEther("0.01").toString(),
        })
      ).to.be.revertedWith("Kickstarter is not Approved");
    });

    describe("Approved Kickstarter", async () => {
      beforeEach(async () => {
        await summitKickstarterWithBnbPayment.approve(0, 0);
        await summitKickstarterWithTokenAPayment.approve(0, 0);
      });

      it("should be reverted if Insufficient Amount", async () => {
        await expect(
          summitKickstarterWithBnbPayment.contribute(EMAIL, MIN_CONTRIBUTION + 1, {
            value: MIN_CONTRIBUTION.toString(),
          })
        ).to.be.revertedWith("Insufficient contribution amount");
      });

      it("should be reverted if contribute less than minimum contribution", async () => {
        const contributionAmount = MIN_CONTRIBUTION - 1;
        await expect(
          summitKickstarterWithBnbPayment.contribute(EMAIL, contributionAmount, {
            value: contributionAmount.toString(),
          })
        ).to.be.revertedWith("Amount should be greater than minimum contribution");
      });

      it("should be reverted if contribute before startTimestamp", async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        await summitKickstarterWithBnbPayment.setStartTimestamp(dayjs().add(100, "minute").unix());
        await expect(
          summitKickstarterWithBnbPayment.contribute(EMAIL, MIN_CONTRIBUTION, { value: MIN_CONTRIBUTION.toString() })
        ).to.be.revertedWith("You can contribute only after start time");
      });

      it("should be reverted if contribute after endTimestamp", async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        await summitKickstarterWithBnbPayment.setStartTimestamp(dayjs().subtract(6, "minute").unix());
        await summitKickstarterWithBnbPayment.setEndTimestamp(dayjs().subtract(5, "minute").unix());
        await expect(
          summitKickstarterWithBnbPayment.contribute(EMAIL, MIN_CONTRIBUTION, { value: MIN_CONTRIBUTION.toString() })
        ).to.be.revertedWith("You can contribute only before end time");
      });

      it("should be able to contribute BNB", async () => {
        const initialTotalContribution = await summitKickstarterWithBnbPayment.totalContribution();
        assert.equal(initialTotalContribution.toString(), "0");

        const expectedOwnerContribution = MIN_CONTRIBUTION;
        const expectedOtherWalletContribution = MIN_CONTRIBUTION * 2;
        await summitKickstarterWithBnbPayment.contribute(EMAIL, expectedOwnerContribution, {
          value: expectedOwnerContribution.toString(),
        });
        await summitKickstarterWithBnbPayment
          .connect(otherWallet)
          .contribute(EMAIL, expectedOtherWalletContribution, { value: expectedOtherWalletContribution.toString() });

        const currentContractBalance = await provider.getBalance(summitKickstarterWithBnbPayment.address);
        assert.equal(
          currentContractBalance.toString(),
          (expectedOwnerContribution + expectedOtherWalletContribution).toString()
        );

        assert.equal(await summitKickstarterWithBnbPayment.emails(owner.address), EMAIL);
        assert.equal(await summitKickstarterWithBnbPayment.emails(otherWallet.address), EMAIL);

        const totalContribution = await summitKickstarterWithBnbPayment.totalContribution();
        assert.equal(
          totalContribution.toString(),
          (expectedOwnerContribution + expectedOtherWalletContribution).toString()
        );

        const ownerContribution = await summitKickstarterWithBnbPayment.contributions(owner.address);
        assert.equal(ownerContribution.toString(), expectedOwnerContribution.toString());

        const otherWalletContribution = await summitKickstarterWithBnbPayment.contributions(otherWallet.address);
        assert.equal(otherWalletContribution.toString(), expectedOtherWalletContribution.toString());

        const ownerContributionIndex = await summitKickstarterWithBnbPayment.contributorIndexes(owner.address);
        assert.equal(ownerContributionIndex.toString(), "0");

        const otherWalletContributionIndex = await summitKickstarterWithBnbPayment.contributorIndexes(
          otherWallet.address
        );
        assert.equal(otherWalletContributionIndex.toString(), "1");

        const ownerContributor = await summitKickstarterWithBnbPayment.contributors(ownerContributionIndex);
        assert.equal(ownerContributor.toString(), owner.address);

        const otherWalletContributor = await summitKickstarterWithBnbPayment.contributors(otherWalletContributionIndex);
        assert.equal(otherWalletContributor.toString(), otherWallet.address);

        const contributors = await summitKickstarterWithBnbPayment.getContributors();
        assert.equal(contributors.length.toString(), "2");

        assert.equal(contributors[0], owner.address);
        assert.equal(contributors[1], otherWallet.address);
      });

      it("should be able to contribute Token", async () => {
        const initialTotalContribution = await summitKickstarterWithTokenAPayment.totalContribution();
        assert.equal(initialTotalContribution.toString(), "0");

        const expectedOwnerContribution = MIN_CONTRIBUTION;
        const expectedOtherWalletContribution = MIN_CONTRIBUTION * 2;

        await summitKickstarterWithTokenAPayment.contribute(EMAIL, expectedOwnerContribution);
        await summitKickstarterWithTokenAPayment
          .connect(otherWallet)
          .contribute(EMAIL, expectedOtherWalletContribution);

        const currentContractBalance = await tokenA.balanceOf(summitKickstarterWithTokenAPayment.address);
        assert.equal(
          currentContractBalance.toString(),
          (expectedOwnerContribution + expectedOtherWalletContribution).toString()
        );

        const totalContribution = await summitKickstarterWithTokenAPayment.totalContribution();
        assert.equal(
          totalContribution.toString(),
          (expectedOwnerContribution + expectedOtherWalletContribution).toString()
        );

        const ownerContribution = await summitKickstarterWithTokenAPayment.contributions(owner.address);
        assert.equal(ownerContribution.toString(), expectedOwnerContribution.toString());

        const otherWalletContribution = await summitKickstarterWithTokenAPayment.contributions(otherWallet.address);
        assert.equal(otherWalletContribution.toString(), expectedOtherWalletContribution.toString());

        const ownerContributionIndex = await summitKickstarterWithTokenAPayment.contributorIndexes(owner.address);
        assert.equal(ownerContributionIndex.toString(), "0");

        const otherWalletContributionIndex = await summitKickstarterWithTokenAPayment.contributorIndexes(
          otherWallet.address
        );
        assert.equal(otherWalletContributionIndex.toString(), "1");

        const ownerContributor = await summitKickstarterWithTokenAPayment.contributors(ownerContributionIndex);
        assert.equal(ownerContributor.toString(), owner.address);

        const otherWalletContributor = await summitKickstarterWithTokenAPayment.contributors(
          otherWalletContributionIndex
        );
        assert.equal(otherWalletContributor.toString(), otherWallet.address);

        const contributors = await summitKickstarterWithTokenAPayment.getContributors();
        assert.equal(contributors.length.toString(), "2");

        assert.equal(contributors[0], owner.address);
        assert.equal(contributors[1], otherWallet.address);
      });
    });
  });

  describe("withdraw", async () => {
    beforeEach(async () => {
      await summitKickstarterWithBnbPayment.approve(0, 0);
      await summitKickstarterWithTokenAPayment.approve(0, 0);

      await summitKickstarterWithBnbPayment.setFixFeeAmount(FIX_FEE_AMOUNT);
      await summitKickstarterWithTokenAPayment.setPercentageFeeAmount(PERCENTAGE_FEE_AMOUNT);

      await summitKickstarterWithBnbPayment.contribute(EMAIL, MIN_CONTRIBUTION, { value: MIN_CONTRIBUTION });
      await summitKickstarterWithTokenAPayment.contribute(EMAIL, MIN_CONTRIBUTION);
    });

    it("should not withdrawBNB when called by nonOwner", async () => {
      await expect(
        summitKickstarterWithBnbPayment.connect(otherWallet).withdraw("1", owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(
        summitKickstarterWithBnbPayment.connect(factoryAdminWallet).withdraw("1", owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(
        summitKickstarterWithBnbPayment.connect(adminWallet).withdraw("1", owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not withdrawBNB more than the contract have", async () => {
      await expect(summitKickstarterWithBnbPayment.withdraw(MIN_CONTRIBUTION + 1, owner.address)).to.be.revertedWith(
        "You cannot withdraw more than you have"
      );
    });

    it("should be able to withdraw BNB", async () => {
      const walletBalance = await provider.getBalance(owner.address);

      const currentContractBalance = await provider.getBalance(summitKickstarterWithBnbPayment.address);
      assert.equal(currentContractBalance.toString(), MIN_CONTRIBUTION.toString());

      const fixFeeAmount = await summitKickstarterWithBnbPayment.fixFeeAmount();
      const percentageFeeAmount = await summitKickstarterWithBnbPayment.percentageFeeAmount();
      const withdrawalFee = fixFeeAmount.add(percentageFeeAmount.mul(MIN_CONTRIBUTION).div(FEE_DENOMINATOR));

      const withdrawAmount = MIN_CONTRIBUTION - withdrawalFee.toNumber();

      const tx = await summitKickstarterWithBnbPayment.withdraw(MIN_CONTRIBUTION.toString(), owner.address);
      const gasCost = await getGasCostByTx(tx);

      assert.equal(
        walletBalance.add(withdrawAmount).sub(gasCost).toString(),
        (await provider.getBalance(owner.address)).toString()
      );

      const newContractBalance = await provider.getBalance(summitKickstarterWithBnbPayment.address);
      assert.equal(newContractBalance.toString(), "0");
    });

    it("should be able to withdraw Token", async () => {
      const summitFactoryBalance = await tokenA.balanceOf(summitKickstarterFactory.address);
      const walletBalance = await tokenA.balanceOf(owner.address);

      const currentContractBalance = await tokenA.balanceOf(summitKickstarterWithTokenAPayment.address);
      assert.equal(currentContractBalance.toString(), MIN_CONTRIBUTION.toString());

      await summitKickstarterWithTokenAPayment.withdraw(MIN_CONTRIBUTION.toString(), owner.address);

      const fixFeeAmount = await summitKickstarterWithTokenAPayment.fixFeeAmount();
      const percentageFeeAmount = await summitKickstarterWithTokenAPayment.percentageFeeAmount();
      const withdrawalFee = fixFeeAmount.add(percentageFeeAmount.mul(MIN_CONTRIBUTION).div(FEE_DENOMINATOR));

      const withdrawAmount = MIN_CONTRIBUTION - withdrawalFee.toNumber();

      assert.equal(walletBalance.add(withdrawAmount).toString(), (await tokenA.balanceOf(owner.address)).toString());
      assert.equal(
        summitFactoryBalance.add(withdrawalFee).toString(),
        (await tokenA.balanceOf(summitKickstarterFactory.address)).toString()
      );

      const newContractBalance = await tokenA.balanceOf(summitKickstarterWithTokenAPayment.address);
      assert.equal(newContractBalance.toString(), "0");
    });
  });
});
