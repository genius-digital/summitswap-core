import { waffle } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, utils } from "ethers";
import RoyaltyFeeManagerArtifact from "@built-contracts/RoyaltyFeeManager.sol/Royalty_Fee_Manager.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import { DummyToken, RoyaltyFeeManager } from "build/typechain";
import { ZERO_ADDRESS } from "src/environment";

const { deployContract, provider } = waffle;

describe("royaltyFeeManager", () => {
  const [owner, otherWallet] = provider.getWallets();
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

  // describe("setAllowance", async () => {
  //   it("should revert when called by nonOwner")
  //   it("should not use zero address ", async () => {
  //     await expect(royaltyFeeManager.connect(otherWallet).transferOwnership(otherWallet.address)).to.be.revertedWith(
  //       "Royalty_Fee_Manager: Whale address is the zero address"
  //     );
  //   });
  // });
});
