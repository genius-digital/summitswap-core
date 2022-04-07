import { waffle } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, utils } from "ethers";
import RoyaltyFeeManagerArtifact from "@built-contracts/RoyaltyFeeManager.sol/Royalty_Fee_Manager.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import { DummyToken, RoyaltyFeeManager } from "build/typechain";
import { ZERO_ADDRESS } from "src/environment";

const { deployContract, provider } = waffle;

describe("royaltyFeeManager", () => {
  const [owner, otherWallet, otherWallet1, otherWallet2] = provider.getWallets();
  let kapexToken: DummyToken;
  let royaltyFeeManager: RoyaltyFeeManager;

  beforeEach(async () => {
    kapexToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
    royaltyFeeManager = (await deployContract(owner, RoyaltyFeeManagerArtifact, [])) as RoyaltyFeeManager;

    await royaltyFeeManager.setKapexToken(kapexToken.address);
    assert.equal(await royaltyFeeManager.kapexToken(), kapexToken.address);
  });

  describe("d_owner", async () => {
    it("should not be nonOwner", async () => {
      assert.notEqual(await royaltyFeeManager.d_owner(), otherWallet.address);
    });
    it("should be owner", async () => {
      assert.equal(await royaltyFeeManager.d_owner(), owner.address);
    });
  });

  describe("transferOwnership", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(royaltyFeeManager.connect(otherWallet).transferOwnership(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should transfer ownership to otherWallet", async () => {
      assert.equal(await royaltyFeeManager.d_owner(), owner.address);
      await royaltyFeeManager.transferOwnership(otherWallet.address);
      assert.equal(await royaltyFeeManager.d_owner(), otherWallet.address);
    });
  });

  describe("setAllowance", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(royaltyFeeManager.connect(otherWallet).setAllowance(otherWallet.address, "0")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should revert when setAllowance for zero address ", async () => {
      await expect(royaltyFeeManager.setAllowance(ZERO_ADDRESS, "0")).to.be.revertedWith(
        "Royalty_Fee_Manager: Whale address is the zero address"
      );
    });
    it("should revert when setAllowance with zero sharesAmount ", async () => {
      await expect(royaltyFeeManager.setAllowance(otherWallet.address, "0")).to.be.revertedWith(
        "Royalty_Fee_Manager: shares amount is zero"
      );
    });
    it("should be able to setAllowance", async () => {
      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      let sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);
      assert.equal((await royaltyFeeManager.missedRewards(sharesHistoryLastIndex)).toString(), "0");
      assert.equal(await royaltyFeeManager.sharesAddressHistories(sharesHistoryLastIndex), otherWallet.address);
      assert.equal((await royaltyFeeManager.sharesAmountHistories(sharesHistoryLastIndex)).toString(), "25");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet.address)).toString(), "25");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "25");

      await kapexToken.transfer(royaltyFeeManager.address, "50");

      await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);
      assert.equal((await royaltyFeeManager.missedRewards(sharesHistoryLastIndex)).toString(), "50");
      assert.equal(await royaltyFeeManager.sharesAddressHistories(sharesHistoryLastIndex), otherWallet1.address);
      assert.equal((await royaltyFeeManager.sharesAmountHistories(sharesHistoryLastIndex)).toString(), "10");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet1.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "35");

      await kapexToken.transfer(royaltyFeeManager.address, "50");

      await royaltyFeeManager.setAllowance(otherWallet2.address, "15");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);
      assert.equal((await royaltyFeeManager.missedRewards(sharesHistoryLastIndex)).toString(), "100");
      assert.equal(await royaltyFeeManager.sharesAddressHistories(sharesHistoryLastIndex), otherWallet2.address);
      assert.equal((await royaltyFeeManager.sharesAmountHistories(sharesHistoryLastIndex)).toString(), "15");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet2.address)).toString(), "15");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "50");

      await kapexToken.transfer(royaltyFeeManager.address, "50");

      await royaltyFeeManager.setAllowance(otherWallet.address, "35");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);
      assert.equal((await royaltyFeeManager.missedRewards(sharesHistoryLastIndex)).toString(), "150");
      assert.equal(await royaltyFeeManager.sharesAddressHistories(sharesHistoryLastIndex), otherWallet.address);
      assert.equal((await royaltyFeeManager.sharesAmountHistories(sharesHistoryLastIndex)).toString(), "10");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet.address)).toString(), "35");

      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);
      assert.equal((await royaltyFeeManager.missedRewards(sharesHistoryLastIndex)).toString(), "150");
      assert.equal(await royaltyFeeManager.sharesAddressHistories(sharesHistoryLastIndex), otherWallet.address);
      assert.equal((await royaltyFeeManager.sharesAmountHistories(sharesHistoryLastIndex)).toString(), "0");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet.address)).toString(), "25");
    });
  });

  describe("getRemainingRewards", async () => {
    it("should have remainings rewards", async () => {
      // Test otherWallet
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
      await kapexToken.transfer(royaltyFeeManager.address, "50");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "50");

      // Test otherWallet2 & otherWallet1
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      await kapexToken.transfer(royaltyFeeManager.address, "50");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "14");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "14"); // 50 * 14 / 35 = 14
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "85"); // 50 + (50 * 25 / 35) = 85

      // Test otherWallet3 & otherWallet2 & otherWallet1
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
      await royaltyFeeManager.setAllowance(otherWallet2.address, "15");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
      await kapexToken.transfer(royaltyFeeManager.address, "50");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "15"); // 50 * 15 / 50 = 15
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "24"); // 14 + (50 * 10 / 50) = 28
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "110"); // 85 + (50 * 25 / 50) = 110
    });
  });

  describe("claimAllRewards", async () => {
    beforeEach("should have remaining rewards", async () => {
      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      await kapexToken.transfer(royaltyFeeManager.address, "50");
      await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
      await kapexToken.transfer(royaltyFeeManager.address, "50");
      await royaltyFeeManager.setAllowance(otherWallet2.address, "15");
      await kapexToken.transfer(royaltyFeeManager.address, "50");

      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "15");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "24");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "110");
    });

    it("otherWallet should be able to claim all rewards", async () => {
      await royaltyFeeManager.connect(otherWallet).claimAllRewards();
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "24");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "15");
      assert.equal((await kapexToken.balanceOf(otherWallet.address)).toString(), "110");
    });
    it("otherWallet2 should be able to claim all rewards", async () => {
      await royaltyFeeManager.connect(otherWallet1).claimAllRewards();
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "110");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "15");
      assert.equal((await kapexToken.balanceOf(otherWallet1.address)).toString(), "24");
    });
    it("otherWallet3 should be able to claim all rewards", async () => {
      await royaltyFeeManager.connect(otherWallet2).claimAllRewards();
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "110");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "24");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
      assert.equal((await kapexToken.balanceOf(otherWallet2.address)).toString(), "15");
    });
  });

  // describe("claim", async () => {
  //   beforeEach(async () => {
  //     await royaltyFeeManager.setAllowance(otherWallet.address, "25");
  //     await kapexToken.transfer(royaltyFeeManager.address, "50");
  //     await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
  //     await kapexToken.transfer(royaltyFeeManager.address, "50");
  //     await royaltyFeeManager.setAllowance(otherWallet2.address, "15");
  //     await kapexToken.transfer(royaltyFeeManager.address, "50");
  //   });

  //   it("should able to claim all rewards", async () => {
  //     await royaltyFeeManager.claim(otherWallet.address);
  //     assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
  //     assert.equal((await kapexToken.balanceOf(otherWallet.address)).toString(), "50");

  //     await royaltyFeeManager.claim(otherWallet1.address);
  //     assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
  //     assert.equal((await kapexToken.balanceOf(otherWallet1.address)).toString(), "50");

  //     await royaltyFeeManager.claim(otherWallet2.address);
  //     assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
  //     assert.equal((await kapexToken.balanceOf(otherWallet2.address)).toString(), "50");
  //   });
  // });
});
