import SummitWhitelabelNftFactoryArtifact from "@built-contracts/whitelabelNft/SummitWhitelabelNftFactory.sol/SummitWhitelabelNftFactory.json";
import { SummitWhitelabelNft, SummitWhitelabelNftFactory } from "build/typechain";
import { TokenInfoStruct } from "build/typechain/SummitWhitelabelNftFactory";
import { assert } from "chai";
import { parseEther } from "ethers/lib/utils";
import { ethers, waffle } from "hardhat";

const { deployContract, provider } = waffle;

enum Phase {
  Paused,
  Whitelisted,
  Public,
}

describe("SummitWhitelabelNft", () => {
  const [owner, nftOwner, signer, serviceFeeReceiver] = provider.getWallets();

  let summitWhitelabelNftFactory: SummitWhitelabelNftFactory;
  let summitWhitelabelNft: SummitWhitelabelNft;

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
    phase: Phase.Paused,
  };

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
      assert.equal(contractTokenInfo.startTokenId, tokenInfo.startTokenId);
      assert.equal(contractTokenInfo.signer, tokenInfo.signer);
      assert.equal(contractTokenInfo.phase, tokenInfo.phase);
      assert.equal(await summitWhitelabelNft.owner(), nftOwner.address);
    });
  });
});
