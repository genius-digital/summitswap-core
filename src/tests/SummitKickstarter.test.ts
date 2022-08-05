import { waffle } from "hardhat";
import { expect, assert } from "chai";

import SummitKickstarterFactoryArtifact from "@built-contracts/SummitKickstarterFactory.sol/SummitKickstarterFactory.json";
import { SummitKickstarterFactory } from "build/typechain";
import { utils } from "ethers";

const { deployContract, provider } = waffle;

describe("summitswapKickstarter", () => {
  const [owner, otherWallet, feeReceiverWallet] = provider.getWallets();
  const SERVICE_FEE = utils.parseEther("0.1");
  const MIN_CONTRIBUTION = 1000;
  const PROJECT_GOAL = 1000000;
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);
  const END_TIMESTAMP = START_TIMESTAMP + 60 * 60 * 24 * 7; // one week from now
  const REWARD_DISTRIBUTION_TIMESTAMP = END_TIMESTAMP + 60 * 60 * 24 * 7; // one week after the end date

  let summitKickstarterFactory: SummitKickstarterFactory;

  const getTimestampFromMinutes = (minutes: number) => minutes * 60;

  beforeEach(async () => {
    summitKickstarterFactory = (await deployContract(owner, SummitKickstarterFactoryArtifact, [
      SERVICE_FEE,
      feeReceiverWallet.address,
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

  describe("serviceFeeReceiver", async () => {
    it("should return feeReceiverWallet", async () => {
      const serviceFeeReceiver = await summitKickstarterFactory.serviceFeeReceiver();
      assert.equal(serviceFeeReceiver, feeReceiverWallet.address);
    });
  });

  describe("setServiceFeeReceiver", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(
        summitKickstarterFactory.connect(otherWallet).setServiceFeeReceiver(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should be able to set serviceFeeReceiver to owner address", async () => {
      let serviceFeeReceiver = await summitKickstarterFactory.serviceFeeReceiver();
      assert.equal(serviceFeeReceiver, feeReceiverWallet.address);

      await summitKickstarterFactory.setServiceFeeReceiver(owner.address);

      serviceFeeReceiver = await summitKickstarterFactory.serviceFeeReceiver();
      assert.equal(serviceFeeReceiver, owner.address);
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
          PROJECT_GOAL.toString(),
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
          "Lorem Ipsum",
          "John Doe",
          "This is a project description",
          "This is a reward description",
          MIN_CONTRIBUTION.toString(),
          PROJECT_GOAL.toString(),
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
    it("should be able to create project", async () => {});
  });

  // describe("minContribution", async () => {
  //   it(`should be ${MIN_CONTRIBUTION}`, async () => {
  //     const minContribution = await summitswapKickstarter.minContribution();
  //     assert.equal(minContribution.toString(), MIN_CONTRIBUTION.toString());
  //   });
  // });

  // describe("startTimestamp", async () => {
  //   it(`should be ${START_TIMESTAMP}`, async () => {
  //     const startTimestamp = await summitswapKickstarter.startTimestamp();
  //     assert.equal(startTimestamp.toString(), START_TIMESTAMP.toString());
  //   });
  // });

  // describe("endTimestamp", async () => {
  //   it(`should be ${END_TIMESTAMP}`, async () => {
  //     const endTimestamp = await summitswapKickstarter.endTimestamp();
  //     assert.equal(endTimestamp.toString(), END_TIMESTAMP.toString());
  //   });
  // });

  // describe("setMinContribution", async () => {
  //   it("should not set minContribution when called by nonOwner", async () => {
  //     await expect(
  //       summitswapKickstarter.connect(otherWallet).setMinContribution((MIN_CONTRIBUTION * 2).toString())
  //     ).to.be.revertedWith("Ownable: caller is not the owner");
  //   });

  //   it("should set minContribution when called by owner", async () => {
  //     const doubleMinContribution = (MIN_CONTRIBUTION * 2).toString();

  //     const minContribution = await summitswapKickstarter.minContribution();
  //     assert.equal(minContribution.toString(), MIN_CONTRIBUTION.toString());

  //     await summitswapKickstarter.setMinContribution(doubleMinContribution);

  //     const newMinContribution = await summitswapKickstarter.minContribution();
  //     assert.equal(newMinContribution.toString(), doubleMinContribution);
  //   });
  // });

  // describe("setStartTimestamp", async () => {
  //   it("should not set startTimestamp when called by nonOwner", async () => {
  //     await expect(
  //       summitswapKickstarter.connect(otherWallet).setStartTimestamp(END_TIMESTAMP.toString())
  //     ).to.be.revertedWith("Ownable: caller is not the owner");
  //   });

  //   it("should not set more than or equal to END_TIMESTAMP", async () => {
  //     await expect(summitswapKickstarter.setStartTimestamp(END_TIMESTAMP.toString())).to.be.revertedWith(
  //       "Start timestamp must be before end timestamp"
  //     );
  //   });

  //   it("should be able to set startTimestamp", async () => {
  //     const expectedStartTimestamp = (END_TIMESTAMP - 1).toString();

  //     const startTimestamp = await summitswapKickstarter.startTimestamp();
  //     assert.equal(startTimestamp.toString(), START_TIMESTAMP.toString());

  //     await summitswapKickstarter.setStartTimestamp(expectedStartTimestamp);

  //     const newStartTimestamp = await summitswapKickstarter.startTimestamp();
  //     assert.equal(newStartTimestamp.toString(), expectedStartTimestamp);
  //   });
  // });

  // describe("setEndTimestamp", async () => {
  //   it("should not set endTimestamp when called by nonOwner", async () => {
  //     await expect(
  //       summitswapKickstarter.connect(otherWallet).setEndTimestamp(START_TIMESTAMP.toString())
  //     ).to.be.revertedWith("Ownable: caller is not the owner");
  //   });

  //   it("should not set less than or equal to START_TIMESTAMP", async () => {
  //     await expect(summitswapKickstarter.setEndTimestamp(START_TIMESTAMP.toString())).to.be.revertedWith(
  //       "End timestamp must be after start timestamp"
  //     );
  //   });

  //   it("should be able to set endTimestamp", async () => {
  //     const expectedEndTimestamp = (START_TIMESTAMP + 1).toString();

  //     const endTimestamp = await summitswapKickstarter.endTimestamp();
  //     assert.equal(endTimestamp.toString(), END_TIMESTAMP.toString());

  //     await summitswapKickstarter.setEndTimestamp(expectedEndTimestamp);

  //     const newStartTimestamp = await summitswapKickstarter.endTimestamp();
  //     assert.equal(newStartTimestamp.toString(), expectedEndTimestamp);
  //   });
  // });

  // describe("contribute", async () => {
  //   it("should be reverted if contribute less than minContribution", async () => {
  //     await expect(summitswapKickstarter.contribute({ value: (MIN_CONTRIBUTION - 1).toString() })).to.be.revertedWith(
  //       "Contribution must be greater than or equal to minContribution"
  //     );
  //   });

  //   it("should be reverted if contribute before startTimestamp", async () => {
  //     const currentTime = Math.floor(Date.now() / 1000);
  //     await summitswapKickstarter.setStartTimestamp(currentTime + getTimestampFromMinutes(5));
  //     await expect(summitswapKickstarter.contribute({ value: MIN_CONTRIBUTION.toString() })).to.be.revertedWith(
  //       "You can contribute only after start time"
  //     );
  //   });

  //   it("should be reverted if contribute after endTimestamp", async () => {
  //     const currentTime = Math.floor(Date.now() / 1000);
  //     await summitswapKickstarter.setStartTimestamp(currentTime - getTimestampFromMinutes(6));
  //     await summitswapKickstarter.setEndTimestamp(currentTime - getTimestampFromMinutes(5));
  //     await expect(summitswapKickstarter.contribute({ value: MIN_CONTRIBUTION.toString() })).to.be.revertedWith(
  //       "You can contribute only before end time"
  //     );
  //   });

  //   it("should be able to contribute", async () => {
  //     const initialTotalContribution = await summitswapKickstarter.totalContribution();
  //     assert.equal(initialTotalContribution.toString(), "0");

  //     const expectedOwnerContribution = MIN_CONTRIBUTION;
  //     const expectedOtherWalletContribution = MIN_CONTRIBUTION * 2;
  //     await summitswapKickstarter.contribute({ value: expectedOwnerContribution.toString() });
  //     await summitswapKickstarter
  //       .connect(otherWallet)
  //       .contribute({ value: expectedOtherWalletContribution.toString() });

  //     const totalContribution = await summitswapKickstarter.totalContribution();
  //     assert.equal(
  //       totalContribution.toString(),
  //       (expectedOwnerContribution + expectedOtherWalletContribution).toString()
  //     );

  //     const ownerContribution = await summitswapKickstarter.contributions(owner.address);
  //     assert.equal(ownerContribution.toString(), expectedOwnerContribution.toString());

  //     const otherWalletContribution = await summitswapKickstarter.contributions(otherWallet.address);
  //     assert.equal(otherWalletContribution.toString(), expectedOtherWalletContribution.toString());

  //     const ownerContributionIndex = await summitswapKickstarter.contributorIndexes(owner.address);
  //     assert.equal(ownerContributionIndex.toString(), "0");

  //     const otherWalletContributionIndex = await summitswapKickstarter.contributorIndexes(otherWallet.address);
  //     assert.equal(otherWalletContributionIndex.toString(), "1");

  //     const ownerContributor = await summitswapKickstarter.contributors(ownerContributionIndex);
  //     assert.equal(ownerContributor.toString(), owner.address);

  //     const otherWalletContributor = await summitswapKickstarter.contributors(otherWalletContributionIndex);
  //     assert.equal(otherWalletContributor.toString(), otherWallet.address);

  //     const contributors = await summitswapKickstarter.getContributors();
  //     assert.equal(contributors.length.toString(), "2");

  //     assert.equal(contributors[0], owner.address);
  //     assert.equal(contributors[1], otherWallet.address);
  //   });
  // });

  // describe("refund", async () => {
  //   beforeEach(async () => {
  //     const initialTotalContribution = await summitswapKickstarter.totalContribution();
  //     assert.equal(initialTotalContribution.toString(), "0");

  //     const expectedOwnerContribution = MIN_CONTRIBUTION;
  //     await summitswapKickstarter.contribute({ value: expectedOwnerContribution.toString() });

  //     const totalContribution = await summitswapKickstarter.totalContribution();
  //     assert.equal(totalContribution.toString(), expectedOwnerContribution.toString());

  //     const ownerContribution = await summitswapKickstarter.contributions(owner.address);
  //     assert.equal(ownerContribution.toString(), expectedOwnerContribution.toString());
  //   });

  //   it("should not refund when called by nonOwner", async () => {
  //     await expect(summitswapKickstarter.connect(otherWallet).refund(owner.address, "1")).to.be.revertedWith(
  //       "Ownable: caller is not the owner"
  //     );
  //   });

  //   it("should not refund than the user contribution", async () => {
  //     await expect(summitswapKickstarter.refund(owner.address, (MIN_CONTRIBUTION + 1).toString())).to.be.revertedWith(
  //       "You cannot refund more than you have contributed"
  //     );
  //   });

  //   it("should not be able to refund more than the contract balance", async () => {
  //     await summitswapKickstarter.withdrawBNB("1", owner.address);
  //     await expect(summitswapKickstarter.refund(owner.address, MIN_CONTRIBUTION.toString())).to.be.revertedWith(
  //       "You cannot withdraw more than you have"
  //     );
  //   });

  //   it("should be able to refund half of the contribution", async () => {
  //     const halfOfContribution = MIN_CONTRIBUTION / 2;
  //     await summitswapKickstarter.refund(owner.address, halfOfContribution.toString());

  //     const totalContribution = await summitswapKickstarter.totalContribution();
  //     assert.equal(totalContribution.toString(), halfOfContribution.toString());

  //     const ownerContribution = await summitswapKickstarter.contributions(owner.address);
  //     assert.equal(ownerContribution.toString(), halfOfContribution.toString());

  //     const contributors = await summitswapKickstarter.getContributors();
  //     assert(contributors.length.toString(), "1");

  //     const ownerContributionIndex = await summitswapKickstarter.contributorIndexes(owner.address);
  //     assert.equal(ownerContributionIndex.toString(), "0");
  //   });

  //   it("should be able to refund all of the contribution", async () => {
  //     const allOfContribution = MIN_CONTRIBUTION;
  //     await summitswapKickstarter.refund(owner.address, allOfContribution.toString());

  //     const totalContribution = await summitswapKickstarter.totalContribution();
  //     assert.equal(totalContribution.toString(), "0");

  //     const ownerContribution = await summitswapKickstarter.contributions(owner.address);
  //     assert.equal(ownerContribution.toString(), "0");

  //     const contributors = await summitswapKickstarter.getContributors();
  //     assert(contributors.length.toString(), "0");

  //     const ownerContributionIndex = await summitswapKickstarter.contributorIndexes(owner.address);
  //     assert.equal(ownerContributionIndex.toString(), "0");
  //   });
  // });

  // describe("withdrawBNB", async () => {
  //   it("should not withdrawBNB when called by nonOwner", async () => {
  //     await expect(summitswapKickstarter.connect(otherWallet).withdrawBNB("1", owner.address)).to.be.revertedWith(
  //       "Ownable: caller is not the owner"
  //     );
  //   });

  //   it("should not withdrawBNB more than the contract have", async () => {
  //     await expect(summitswapKickstarter.withdrawBNB("1", owner.address)).to.be.revertedWith(
  //       "You cannot withdraw more than you have"
  //     );
  //   });

  //   it("should be able to withdrawBNB", async () => {
  //     const expectedOwnerContribution = MIN_CONTRIBUTION;
  //     await summitswapKickstarter.contribute({ value: expectedOwnerContribution.toString() });

  //     const currentContractBalance = await provider.getBalance(summitswapKickstarter.address);
  //     assert.equal(currentContractBalance.toString(), expectedOwnerContribution.toString());

  //     await summitswapKickstarter.withdrawBNB(expectedOwnerContribution.toString(), owner.address);

  //     const newContractBalance = await provider.getBalance(summitswapKickstarter.address);
  //     assert.equal(newContractBalance.toString(), "0");
  //   });
  // });
});
