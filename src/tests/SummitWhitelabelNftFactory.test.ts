import SummitWhitelabelNftFactoryArtifact from "@built-contracts/SummitWhitelabelNftFactory.sol/SummitWhitelabelNftFactory.json";
import { SummitWhitelabelNftFactory } from "build/typechain";
import { TokenInfoStruct } from "build/typechain/SummitWhitelabelNftFactory";
import { assert, expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { waffle } from "hardhat";

const { deployContract, provider } = waffle;

describe("SummitWhitelabelNftFactory", () => {
  const [owner, signer, admin1, wallet1, wallet2, withdrawReceiver, withdrawOperator] = provider.getWallets();

  let summitWhitelabelNftFactory: SummitWhitelabelNftFactory;

  const serviceFee = parseEther("0.001");
  const withdrawFee = parseEther("0.001");
  const baseUri = "ipfs://QmSAo4kt2N9mdgwTF5MREgSWHoF3CxwwmbhZV5M3u83SVg/";
  const tokenInfo: TokenInfoStruct = {
    name: "Test Token",
    symbol: "TST",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum",
    previewImageUrl: "https://w3s.link/ipfs/bafybeigyx3a574k6m3anlfd7ymis4nkcj6tfyuawy7einf73kzeijcuoiu/1662652834917",
    maxSupply: 100,
    whitelistMintPrice: parseEther("0.001"),
    publicMintPrice: parseEther("0.02"),
    phase: 0, // 0 = paused, 1 = whitelisted, 2 = public
    isReveal: false,
  };

  beforeEach(async () => {
    summitWhitelabelNftFactory = (await deployContract(owner, SummitWhitelabelNftFactoryArtifact, [
      serviceFee,
      withdrawFee,
      signer.address,
    ])) as SummitWhitelabelNftFactory;
    await summitWhitelabelNftFactory.connect(owner).setAdmins([admin1.address], true);
  });

  describe("constructor", () => {
    it("should match with deployed values", async () => {
      assert.equal((await summitWhitelabelNftFactory.serviceFee()).toString(), serviceFee.toString());
      assert.equal((await summitWhitelabelNftFactory.withdrawFee()).toString(), withdrawFee.toString());
      assert.equal(await summitWhitelabelNftFactory.callStatic.signer(), signer.address);
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
    it("should be reverted if canAnyoneCreate is false", async () => {
      await expect(
        summitWhitelabelNftFactory.connect(wallet1).createNft(tokenInfo, baseUri, {
          value: serviceFee,
        })
      ).to.be.revertedWith("Not allowed to create NFT");
    });
    it("should be able to deploy a new NFT", async () => {
      await summitWhitelabelNftFactory.connect(owner).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });
      await summitWhitelabelNftFactory.connect(admin1).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });

      assert.equal((await summitWhitelabelNftFactory.getNfts()).length, 2);
      assert.equal((await summitWhitelabelNftFactory.nftsOf(owner.address)).length, 1);
      assert.equal((await summitWhitelabelNftFactory.nftsOf(admin1.address)).length, 1);
    });
    it("should refund excess fee", async () => {
      const excessFee = parseEther("1");

      const initialAdmin1Balance = await provider.getBalance(admin1.address);

      const tx = await summitWhitelabelNftFactory.connect(admin1).createNft(tokenInfo, baseUri, {
        value: serviceFee.add(excessFee),
      });

      const txReceipt = await tx.wait();
      const gasUsed = txReceipt.gasUsed;
      const gasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasPrice.mul(gasUsed);

      const finalAdmin1Balance = await provider.getBalance(admin1.address);

      const diffBalance = finalAdmin1Balance.sub(initialAdmin1Balance).add(gasCost).abs();

      assert.equal(diffBalance.toString(), serviceFee.toString());
    });
    it("should emit CreateNft event", async () => {
      await expect(
        summitWhitelabelNftFactory.connect(admin1).createNft(tokenInfo, baseUri, {
          value: serviceFee,
        })
      ).to.emit(summitWhitelabelNftFactory, "CreateNft");
    });
  });

  describe("getNfts", () => {
    it("should get all nft addresses", async () => {
      const nfts0 = await summitWhitelabelNftFactory.getNfts();
      assert.equal(nfts0.length, 0);

      await summitWhitelabelNftFactory.connect(admin1).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });

      const nfts1 = await summitWhitelabelNftFactory.getNfts();
      assert.equal(nfts1.length, 1);
    });
  });

  describe("nftsOf", () => {
    it("should get nft addresses of a user", async () => {
      assert.equal((await summitWhitelabelNftFactory.nftsOf(admin1.address)).length, 0);
      assert.equal((await summitWhitelabelNftFactory.nftsOf(wallet2.address)).length, 0);

      await summitWhitelabelNftFactory.connect(admin1).createNft(tokenInfo, baseUri, {
        value: serviceFee,
      });

      assert.equal((await summitWhitelabelNftFactory.nftsOf(admin1.address)).length, 1);
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

  describe("setWithdrawFee", () => {
    it("should be reverted if called by non-owner", async () => {
      const newWithdrawFee = parseEther("1");
      await expect(summitWhitelabelNftFactory.connect(wallet1).setWithdrawFee(newWithdrawFee)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to set a new withdrawFee", async () => {
      const newWithdrawFee = parseEther("1");
      await summitWhitelabelNftFactory.connect(owner).setWithdrawFee(newWithdrawFee);
      assert((await summitWhitelabelNftFactory.withdrawFee()).toString(), newWithdrawFee.toString());
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      await summitWhitelabelNftFactory.connect(admin1).createNft(tokenInfo, baseUri, {
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
