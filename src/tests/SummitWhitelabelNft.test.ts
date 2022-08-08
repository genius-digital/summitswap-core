import SummitWhitelabelNftFactoryArtifact from "@built-contracts/whitelabelNft/SummitWhitelabelNftFactory.sol/SummitWhitelabelNftFactory.json";
import { SummitWhitelabelNft, SummitWhitelabelNftFactory } from "build/typechain";
import { TokenInfoStruct } from "build/typechain/SummitWhitelabelNftFactory";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers, waffle, web3 } from "hardhat";

const { deployContract, provider } = waffle;

enum Phase {
  Paused,
  Whitelisted,
  Public,
}

describe("SummitWhitelabelNft", () => {
  const [owner, nftOwner, signer, serviceFeeReceiver, whitelistMinter1, whitelistMinter2, minter] =
    provider.getWallets();

  let summitWhitelabelNftFactory: SummitWhitelabelNftFactory;
  let summitWhitelabelNft: SummitWhitelabelNft;
  let validSign1: any;
  let validSign2: any;

  const serviceFee = parseEther("0.001");
  const baseUri = "ipfs://QmSAo4kt2N9mdgwTF5MREgSWHoF3CxwwmbhZV5M3u83SVg/";
  const tokenInfo: TokenInfoStruct = {
    name: "Test Token",
    symbol: "TST",
    maxSupply: 100,
    whitelistMintPrice: parseEther("0.001"),
    publicMintPrice: parseEther("0.02"),
    signer: signer.address,
    phase: Phase.Paused,
  };
  const mintAmount = 1;

  beforeEach(async () => {
    summitWhitelabelNftFactory = (await deployContract(owner, SummitWhitelabelNftFactoryArtifact, [
      serviceFee,
      serviceFeeReceiver.address,
    ])) as SummitWhitelabelNftFactory;

    await summitWhitelabelNftFactory.connect(nftOwner).createNft(tokenInfo, baseUri, {
      value: serviceFee,
    });

    const SummitCustomPresale = await ethers.getContractFactory("SummitWhitelabelNft");
    const summitWhitelabelNftAddress = await summitWhitelabelNftFactory.nfts(0);
    summitWhitelabelNft = SummitCustomPresale.attach(summitWhitelabelNftAddress);

    const hash =
      web3.utils.soliditySha3(
        { t: "address", v: summitWhitelabelNft.address },
        { t: "address", v: whitelistMinter1.address }
      ) || "";
    validSign1 = web3.eth.accounts.sign(hash, signer.privateKey);

    const otherHash =
      web3.utils.soliditySha3(
        { t: "address", v: summitWhitelabelNft.address },
        { t: "address", v: whitelistMinter2.address }
      ) || "";
    validSign2 = web3.eth.accounts.sign(otherHash, signer.privateKey);
  });

  describe("constructor", () => {
    it("should match with deployed values", async () => {
      const contractTokenInfo = await summitWhitelabelNft.tokenInfo();

      assert.equal(await summitWhitelabelNft.name(), tokenInfo.name);
      assert.equal(await summitWhitelabelNft.symbol(), tokenInfo.symbol);
      assert.equal(await summitWhitelabelNft.baseTokenURI(), baseUri);
      assert.equal(contractTokenInfo.name, tokenInfo.name);
      assert.equal(contractTokenInfo.symbol, tokenInfo.symbol);
      assert.equal(contractTokenInfo.maxSupply, tokenInfo.maxSupply);
      assert.equal(contractTokenInfo.whitelistMintPrice.toString(), tokenInfo.whitelistMintPrice.toString());
      assert.equal(contractTokenInfo.publicMintPrice.toString(), tokenInfo.publicMintPrice.toString());
      assert.equal(contractTokenInfo.signer, tokenInfo.signer);
      assert.equal(contractTokenInfo.phase, tokenInfo.phase);
      assert.equal(await summitWhitelabelNft.owner(), nftOwner.address);
    });
  });

  describe("mint", () => {
    it("should be reverted when phase is paused", async () => {
      await expect(summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount)).to.be.revertedWith(
        "Minting is paused"
      );
      await expect(
        summitWhitelabelNft.connect(whitelistMinter2)["mint(uint256,bytes)"](mintAmount, validSign1.signature)
      ).to.be.revertedWith("Minting is paused");
    });
    it("should be reverted if mint more than max supply", async () => {
      const mintAmount = BigNumber.from(tokenInfo.maxSupply).add(1);
      const mintPrice = (await summitWhitelabelNft.tokenInfo()).publicMintPrice;
      await summitWhitelabelNft.connect(nftOwner).enterPublicPhase();

      await expect(
        summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount, {
          value: mintPrice.mul(mintAmount),
        })
      ).to.be.revertedWith("Purchase would exceed max supply");
    });

    describe("Phase: whitelisted", () => {
      beforeEach(async () => {
        await summitWhitelabelNft.connect(nftOwner).enterWhitelistPhase();
      });

      it("should be reverted if mint without signature", async () => {
        await expect(summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount)).to.be.revertedWith(
          "Please provide signature"
        );
      });
      it("should be reverted if minter is not whitelisted", async () => {
        await expect(
          summitWhitelabelNft.connect(whitelistMinter2)["mint(uint256,bytes)"](mintAmount, validSign1.signature)
        ).to.be.revertedWith("Invalid signature");
      });
      it("should be reverted if not enough fee", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).whitelistMintPrice;
        await expect(
          summitWhitelabelNft.connect(whitelistMinter1)["mint(uint256,bytes)"](mintAmount, validSign1.signature, {
            value: mintPrice.mul(mintAmount).sub(1),
          })
        ).to.be.revertedWith("Ether sent is less than minting cost");
      });
      it("should be reverted if mint amount is 0", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).whitelistMintPrice;
        await expect(
          summitWhitelabelNft.connect(whitelistMinter1)["mint(uint256,bytes)"](0, validSign1.signature, {
            value: mintPrice.mul(0),
          })
        ).to.be.revertedWith("_mintAmount can not be 0");
      });
      it("should be able to refund excess fee", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).whitelistMintPrice;
        const excessFund = parseEther("1");

        const whitelistMinterBalanceInitial = await provider.getBalance(whitelistMinter1.address);

        const tx = await summitWhitelabelNft
          .connect(whitelistMinter1)
          ["mint(uint256,bytes)"](mintAmount, validSign1.signature, {
            value: mintPrice.mul(mintAmount).add(excessFund),
          });

        const txReceipt = await tx.wait();
        const gasUsed = txReceipt.gasUsed;
        const gasPrice = txReceipt.effectiveGasPrice;
        const gasCost = gasUsed.mul(gasPrice);

        const whitelistMinterBalanceFinal = await provider.getBalance(whitelistMinter1.address);

        assert.equal(
          whitelistMinterBalanceInitial.sub(whitelistMinterBalanceFinal).toString(),
          mintPrice.mul(mintAmount).add(gasCost).toString()
        );
      });
      it("should be able to mint", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).whitelistMintPrice;
        await summitWhitelabelNft.connect(whitelistMinter1)["mint(uint256,bytes)"](mintAmount, validSign1.signature, {
          value: mintPrice.mul(mintAmount),
        });

        const mintAmount2 = 2;
        await summitWhitelabelNft.connect(whitelistMinter2)["mint(uint256,bytes)"](mintAmount2, validSign2.signature, {
          value: mintPrice.mul(mintAmount2),
        });

        assert.equal((await summitWhitelabelNft.balanceOf(whitelistMinter1.address)).toString(), mintAmount.toString());
        assert.equal(
          (await summitWhitelabelNft.balanceOf(whitelistMinter2.address)).toString(),
          mintAmount2.toString()
        );
        assert.equal((await summitWhitelabelNft.totalSupply()).toString(), (mintAmount + mintAmount2).toString());
      });
    });

    describe("Phase: public", () => {
      beforeEach(async () => {
        await summitWhitelabelNft.connect(nftOwner).enterPublicPhase();
      });

      it("should be reverted if mint with signature", async () => {
        await expect(
          summitWhitelabelNft.connect(whitelistMinter2)["mint(uint256,bytes)"](mintAmount, validSign1.signature)
        ).to.be.revertedWith("Invalid signature");
      });
      it("should be reverted if not enough fee", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).publicMintPrice;
        await expect(
          summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount, {
            value: mintPrice.mul(mintAmount).sub(1),
          })
        ).to.be.revertedWith("Ether sent is less than minting cost");
      });
      it("should be reverted if mint amount is 0", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).publicMintPrice;
        await expect(
          summitWhitelabelNft.connect(whitelistMinter1)["mint(uint256)"](0, {
            value: mintPrice.mul(0),
          })
        ).to.be.revertedWith("_mintAmount can not be 0");
      });
      it("should be able to refund excess fee", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).publicMintPrice;
        const excessFund = parseEther("1");

        const minterMinterBalanceInitial = await provider.getBalance(minter.address);

        const tx = await summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount, {
          value: mintPrice.mul(mintAmount).add(excessFund),
        });

        const txReceipt = await tx.wait();
        const gasUsed = txReceipt.gasUsed;
        const gasPrice = txReceipt.effectiveGasPrice;
        const gasCost = gasUsed.mul(gasPrice);

        const minterMinterBalanceFinal = await provider.getBalance(minter.address);

        assert.equal(
          minterMinterBalanceInitial.sub(minterMinterBalanceFinal).toString(),
          mintPrice.mul(mintAmount).add(gasCost).toString()
        );
      });
      it("should be able to mint", async () => {
        const mintPrice = (await summitWhitelabelNft.tokenInfo()).publicMintPrice;
        await summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount, {
          value: mintPrice.mul(mintAmount),
        });

        const mintAmount2 = 2;
        await summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount2, {
          value: mintPrice.mul(mintAmount2),
        });

        assert.equal(
          (await summitWhitelabelNft.balanceOf(minter.address)).toString(),
          (mintAmount + mintAmount2).toString()
        );
        assert.equal((await summitWhitelabelNft.totalSupply()).toString(), (mintAmount + mintAmount2).toString());
      });
    });
  });

  describe("tokenURI", () => {
    it("should revert if tokenId not exists", async () => {
      await expect(summitWhitelabelNft.tokenURI(0)).to.be.revertedWith("tokenId not exists");
    });
    it("should return tokenURI", async () => {
      await summitWhitelabelNft.connect(nftOwner).enterPublicPhase();

      const mintPrice = (await summitWhitelabelNft.tokenInfo()).publicMintPrice;
      await summitWhitelabelNft.connect(minter)["mint(uint256)"](mintAmount, {
        value: mintPrice.mul(mintAmount),
      });

      const tokenId = (await summitWhitelabelNft.tokensOfOwner(minter.address))[0];
      const tokenUri = `${baseUri + tokenId.toString()}.json`;

      assert.equal(await summitWhitelabelNft.tokenURI(tokenId), tokenUri);
    });
  });

  describe("devMints", () => {
    it("should be reverted if called by non-owner", async () => {
      await expect(summitWhitelabelNft.connect(minter).devMints([minter.address], mintAmount)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to mint to multiple addresses with X amount", async () => {
      const mintAmount = BigNumber.from(3);

      assert.equal((await summitWhitelabelNft.balanceOf(minter.address)).toString(), "0");
      assert.equal((await summitWhitelabelNft.balanceOf(whitelistMinter1.address)).toString(), "0");

      await summitWhitelabelNft.connect(nftOwner).devMints([minter.address, whitelistMinter1.address], mintAmount);

      assert.equal((await summitWhitelabelNft.balanceOf(minter.address)).toString(), mintAmount.toString());
      assert.equal((await summitWhitelabelNft.balanceOf(whitelistMinter1.address)).toString(), mintAmount.toString());

      assert.equal((await summitWhitelabelNft.totalSupply()).toString(), mintAmount.mul(2).toString());
    });
  });

  describe("enterPausePhase", () => {
    it("should be reverted if called by non-owner", async () => {
      await expect(summitWhitelabelNft.connect(minter).enterPausePhase()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to enter pause phase", async () => {
      await summitWhitelabelNft.connect(nftOwner).enterPausePhase();

      assert.equal((await summitWhitelabelNft.tokenInfo()).phase, Phase.Paused);
    });
  });

  describe("enterWhitelistPhase", () => {
    it("should be reverted if called by non-owner", async () => {
      await expect(summitWhitelabelNft.connect(minter).enterWhitelistPhase()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to enter whitelist phase", async () => {
      await summitWhitelabelNft.connect(nftOwner).enterWhitelistPhase();

      assert.equal((await summitWhitelabelNft.tokenInfo()).phase, Phase.Whitelisted);
    });
  });

  describe("enterPublicPhase", () => {
    it("should be reverted if called by non-owner", async () => {
      await expect(summitWhitelabelNft.connect(minter).enterPublicPhase()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to enter public phase", async () => {
      await summitWhitelabelNft.connect(nftOwner).enterPublicPhase();

      assert.equal((await summitWhitelabelNft.tokenInfo()).phase, Phase.Public);
    });
  });

  describe("setSigner", () => {
    it("should be reverted if called by non-owner", async () => {
      await expect(summitWhitelabelNft.connect(minter).setSigner(whitelistMinter1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should be able to enter public phase", async () => {
      await summitWhitelabelNft.connect(nftOwner).setSigner(minter.address);

      assert.equal((await summitWhitelabelNft.tokenInfo()).signer, minter.address);
    });
  });
});
