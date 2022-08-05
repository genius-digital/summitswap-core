import SummitWhitelabelNftFactoryArtifact from "@built-contracts/whitelabelNft/SummitWhitelabelNftFactory.sol/SummitWhitelableNftFactory.json";
import { SummitWhitelableNftFactory } from "build/typechain";
import { TokenInfoStruct } from "build/typechain/SummitWhitelableNftFactory";
import { assert, expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { waffle } from "hardhat";

const { deployContract, provider } = waffle;

describe("SummitWhitelabelNftFactory", () => {
  const [owner, signer, serviceFeeReceiver, wallet1, wallet2, withdrawReceiver, withdrawOperator] =
    provider.getWallets();

  let summitWhitelabelNftFactory: SummitWhitelableNftFactory;

  const serviceFee = parseEther("0.001");
  const baseUri = "ipfs://QmSAo4kt2N9mdgwTF5MREgSWHoF3CxwwmbhZV5M3u83SVg/";
  const tokenInfo: TokenInfoStruct = {
    name: "Test Token",
    symbol: "TST",
    maxSupply: 100,
    whitelistMintPrice: parseEther("0.001"),
    publicMintPrice: parseEther("0.02"),
    startTokenId: 0,
    signer: signer.address,
    phase: 0, // 0 = paused, 1 = whitelisted, 2 = public
  };

  beforeEach(async () => {
    summitWhitelabelNftFactory = (await deployContract(owner, SummitWhitelabelNftFactoryArtifact, [
      serviceFee,
      serviceFeeReceiver.address,
    ])) as SummitWhitelableNftFactory;
  });

  describe("constructor", () => {
    it("should match with deployed values", async () => {
      assert.equal((await summitWhitelabelNftFactory.serviceFee()).toString(), serviceFee.toString());
      assert.equal(await summitWhitelabelNftFactory.serviceFeeReceiver(), serviceFeeReceiver.address);
    });
  });

  describe("createNft()", () => {
    it("should be reverted if not enough fee", async () => {
      await expect(
        summitWhitelabelNftFactory.createNft(tokenInfo, baseUri, {
          value: serviceFee.sub("1"),
        })
      ).to.be.revertedWith("Not enough serviceFee sent");
    });
    it("should be able to deploy a new NFT", async () => {
      await summitWhitelabelNftFactory.connect(wallet1).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });

      assert.equal((await summitWhitelabelNftFactory.getNfts()).length, 1);
      assert.equal((await summitWhitelabelNftFactory.nftsOf(wallet1.address)).length, 1);
    });
    it("should refund excess fee", async () => {
      const excessFee = parseEther("1");

      const initialWallet1Balance = await provider.getBalance(wallet1.address);

      const tx = await summitWhitelabelNftFactory.connect(wallet1).createNft(tokenInfo, baseUri, {
        value: serviceFee.add(excessFee),
      });

      const txReceipt = await tx.wait();
      const gasUsed = txReceipt.gasUsed;
      const gasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasPrice.mul(gasUsed);

      const finalWallet1Balance = await provider.getBalance(wallet1.address);

      const diffWallet1Balance = finalWallet1Balance.sub(initialWallet1Balance).add(gasCost).abs();

      assert.equal(diffWallet1Balance.toString(), serviceFee.toString());
    });
    it("should be able to send fee to serviceFeeReceiver", async () => {
      const initialServiceFeeBalance = await provider.getBalance(serviceFeeReceiver.address);

      await summitWhitelabelNftFactory.connect(wallet1).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });

      const finalServiceFeeBalance = await provider.getBalance(serviceFeeReceiver.address);

      const diffServiceFeeBalance = finalServiceFeeBalance.sub(initialServiceFeeBalance).abs();

      assert.equal(diffServiceFeeBalance.toString(), serviceFee.toString());
    });
    it("should emit CreateNft event", async () => {
      await expect(
        summitWhitelabelNftFactory.connect(wallet1).createNft(tokenInfo, baseUri, {
          value: serviceFee,
        })
      ).to.emit(summitWhitelabelNftFactory, "CreateNft");
    });
  });

  describe("getNfts", () => {
    it("should get all nft addresses", async () => {
      const nfts0 = await summitWhitelabelNftFactory.getNfts();
      assert.equal(nfts0.length, 0);

      await summitWhitelabelNftFactory.connect(wallet1).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });

      const nfts1 = await summitWhitelabelNftFactory.getNfts();
      assert.equal(nfts1.length, 1);
    });
  });

  describe("nftsOf", () => {
    it("should get nft addresses of a user", async () => {
      assert.equal((await summitWhitelabelNftFactory.nftsOf(wallet1.address)).length, 0);
      assert.equal((await summitWhitelabelNftFactory.nftsOf(wallet2.address)).length, 0);

      await summitWhitelabelNftFactory.connect(wallet1).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });

      assert.equal((await summitWhitelabelNftFactory.nftsOf(wallet1.address)).length, 1);
      assert.equal((await summitWhitelabelNftFactory.nftsOf(wallet2.address)).length, 0);
    });
  });

  describe("setServiceFee", () => {
    it("should be reverted if called by non-owner", async () => {
      const newServiceFee = parseEther("1");
      await expect(summitWhitelabelNftFactory.connect(wallet1).setServiceFee(newServiceFee)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to set a new serviceFee", async () => {
      const newServiceFee = parseEther("1");
      await summitWhitelabelNftFactory.connect(owner).setServiceFee(newServiceFee);
      assert((await summitWhitelabelNftFactory.serviceFee()).toString(), newServiceFee.toString());
    });
  });

  describe("setServiceFeeReceiver", () => {
    it("should be reverted if called by non-owner", async () => {
      await expect(
        summitWhitelabelNftFactory.connect(wallet1).setServiceFeeReceiver(wallet2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should be able to set a new serviceFeeReceiver", async () => {
      await summitWhitelabelNftFactory.connect(owner).setServiceFeeReceiver(wallet2.address);
      assert(await summitWhitelabelNftFactory.serviceFeeReceiver(), wallet2.address);
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      await wallet1.sendTransaction({
        to: summitWhitelabelNftFactory.address,
        value: serviceFee,
      });
      await summitWhitelabelNftFactory.connect(owner).addWithdrawOperators([withdrawOperator.address]);
    });

    it("should be reverted if called by non-owner", async () => {
      await expect(summitWhitelabelNftFactory.connect(wallet1).withdraw(withdrawReceiver.address)).to.be.revertedWith(
        "Not a withdraw operator"
      );
    });
    it("should be reverted if not an operator", async () => {
      await expect(summitWhitelabelNftFactory.connect(wallet2).withdraw(withdrawReceiver.address)).to.be.revertedWith(
        "Not a withdraw operator"
      );
    });
    it("should be able to withdraw native coin", async () => {
      const withdrawReceiverBalance0 = await provider.getBalance(withdrawReceiver.address);
      await summitWhitelabelNftFactory.connect(owner).withdraw(withdrawReceiver.address);
      const withdrawReceiverBalance1 = await provider.getBalance(withdrawReceiver.address);

      assert.equal(withdrawReceiverBalance0.sub(withdrawReceiverBalance1).abs().toString(), serviceFee.toString());
    });
    it("should be able to withdraw native coin by withdraw operator", async () => {
      const withdrawReceiverBalance0 = await provider.getBalance(withdrawReceiver.address);
      await summitWhitelabelNftFactory.connect(withdrawOperator).withdraw(withdrawReceiver.address);
      const withdrawReceiverBalance1 = await provider.getBalance(withdrawReceiver.address);

      assert.equal(withdrawReceiverBalance0.sub(withdrawReceiverBalance1).abs().toString(), serviceFee.toString());
    });
  });
});
