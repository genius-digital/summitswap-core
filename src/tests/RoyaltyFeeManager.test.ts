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
      let shareHistory;

      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      let sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);

      shareHistory = await royaltyFeeManager.shareHistories(sharesHistoryLastIndex);
      assert.equal(shareHistory.missedRewards.toString(), "0");
      assert.equal(shareHistory.sharesAddress, otherWallet.address);
      assert.equal(shareHistory.sharesAmount.toString(), "25");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet.address)).toString(), "25");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "25");

      await kapexToken.transfer(royaltyFeeManager.address, "50");

      await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);

      shareHistory = await royaltyFeeManager.shareHistories(sharesHistoryLastIndex);
      assert.equal(shareHistory.missedRewards.toString(), "50");
      assert.equal(shareHistory.sharesAddress, otherWallet1.address);
      assert.equal(shareHistory.sharesAmount.toString(), "10");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet1.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "35");

      await kapexToken.transfer(royaltyFeeManager.address, "50");

      await royaltyFeeManager.setAllowance(otherWallet2.address, "15");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);

      shareHistory = await royaltyFeeManager.shareHistories(sharesHistoryLastIndex);
      assert.equal(shareHistory.missedRewards.toString(), "100");
      assert.equal(shareHistory.sharesAddress, otherWallet2.address);
      assert.equal(shareHistory.sharesAmount.toString(), "15");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet2.address)).toString(), "15");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "50");

      await kapexToken.transfer(royaltyFeeManager.address, "50");

      await royaltyFeeManager.setAllowance(otherWallet.address, "35");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);

      shareHistory = await royaltyFeeManager.shareHistories(sharesHistoryLastIndex);
      assert.equal(shareHistory.missedRewards.toString(), "150");
      assert.equal(shareHistory.sharesAddress, otherWallet.address);
      assert.equal(shareHistory.sharesAmount.toString(), "10");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet.address)).toString(), "35");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "60");

      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      sharesHistoryLastIndex = (await royaltyFeeManager.historyCount()).sub(1);

      shareHistory = await royaltyFeeManager.shareHistories(sharesHistoryLastIndex);
      assert.equal(shareHistory.missedRewards.toString(), "150");
      assert.equal(shareHistory.sharesAddress, otherWallet.address);
      assert.equal(shareHistory.sharesAmount.toString(), "0");
      assert.equal((await royaltyFeeManager.walletShares(otherWallet.address)).toString(), "25");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "50");
    });
  });

  describe("getRemainingRewards", async () => {
    it("should have remainings rewards", async () => {
      // Test otherWallet
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
      await kapexToken.transfer(royaltyFeeManager.address, "10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "10");

      // Test otherWallet & otherWallet1
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      await kapexToken.transfer(royaltyFeeManager.address, "10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "2");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "17"); // 10 + (10 * 25 / 35) = 17

      // Test otherWallet & otherWallet1 & otherWallet2
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
      await royaltyFeeManager.setAllowance(otherWallet2.address, "15");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
      await kapexToken.transfer(royaltyFeeManager.address, "50");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "15");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "25");
    });
  });

  describe("claimAllRewards", async () => {
    beforeEach("should have remaining rewards", async () => {
      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      await kapexToken.transfer(royaltyFeeManager.address, "10");
      await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
      await royaltyFeeManager.setAllowance(otherWallet2.address, "15");

      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
    });

    it("otherWallet should be able to claim all rewards", async () => {
      await royaltyFeeManager.connect(otherWallet).claimAllRewards();
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
      assert.equal((await kapexToken.balanceOf(otherWallet.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.totalClaimedRewards()).toString(), "10");
      await kapexToken.transfer(royaltyFeeManager.address, "100");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "15");
      await royaltyFeeManager.connect(otherWallet).claimAllRewards();
      assert.equal((await royaltyFeeManager.totalClaimedRewards()).toString(), "0");
    });
    it("otherWallet2 should be able to claim all rewards", async () => {
      await kapexToken.transfer(royaltyFeeManager.address, "100");
      await royaltyFeeManager.connect(otherWallet1).claimAllRewards();
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "25");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "15");
      assert.equal((await kapexToken.balanceOf(otherWallet1.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.totalClaimedRewards()).toString(), "0");
      assert.equal((await royaltyFeeManager.totalShares()).toString(), "40");
    });
  });

  describe("claim", async () => {
    beforeEach(async () => {
      await royaltyFeeManager.setAllowance(otherWallet.address, "25");
      await kapexToken.transfer(royaltyFeeManager.address, "10");
      await royaltyFeeManager.setAllowance(otherWallet1.address, "10");
      await royaltyFeeManager.setAllowance(otherWallet2.address, "15");

      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet2.address)).toString(), "0");
    });

    it("should not claim more than remaining amount", async () => {
      await expect(royaltyFeeManager.connect(otherWallet).claim("23")).to.be.revertedWith(
        "Royalty_Fee_Manager: Whale address can not claim more than remaining rewards"
      );
    });

    it("otherWallet should be able to claim rewards", async () => {
      await royaltyFeeManager.connect(otherWallet).claim("10");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "0");
      assert.equal((await kapexToken.balanceOf(otherWallet.address)).toString(), "10");
      assert.equal((await royaltyFeeManager.totalClaimedRewards()).toString(), "10");
      await kapexToken.transfer(royaltyFeeManager.address, "25");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet.address)).toString(), "12"); // (25 * (25 / 50)) = 12
    });
    it("otherWallet2 should be able to claim rewards", async () => {
      await kapexToken.transfer(royaltyFeeManager.address, "100");
      let totalShares = await royaltyFeeManager.totalShares();
      await royaltyFeeManager.connect(otherWallet1).claim("9");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "1");
      assert.equal((await kapexToken.balanceOf(otherWallet1.address)).toString(), "9");
      assert.equal((await royaltyFeeManager.totalClaimedRewards()).toString(), "9");
      await royaltyFeeManager.connect(otherWallet1).claim("1");
      assert.equal((await royaltyFeeManager.getRemainingRewards(otherWallet1.address)).toString(), "0");
      assert.equal((await kapexToken.balanceOf(otherWallet1.address)).toString(), "10");
      await expect(royaltyFeeManager.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "Royalty_Fee_Manager: Whale address has no shares"
      );
      totalShares = totalShares.sub(10);
      assert.equal((await royaltyFeeManager.totalShares()).toString(), totalShares.toString());
      assert.equal((await royaltyFeeManager.totalClaimedRewards()).toString(), "0");
    });
  });
});
