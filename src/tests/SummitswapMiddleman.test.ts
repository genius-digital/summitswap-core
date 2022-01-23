import { waffle } from "hardhat";
import { expect, assert } from "chai";
import { Contract, utils } from "ethers";
import SummitReferral from "@built-contracts/SummitReferral.sol/SummitReferral.json";
import WETH from "@built-contracts/utils/WBNB.sol/WBNB.json";
import Token from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import SummitswapFactory from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitswapRouter02 from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import SummitswapMiddleman from "@built-contracts/SummitswapMiddleman.sol/SummitswapMiddleman.json";

const { deployContract, provider } = waffle;

describe("Summitswap Middleman", () => {
  const [owner, leadInfluencer, subInfluencer, otherWallet, otherWallet2] = provider.getWallets();
  const feeDenominator = 10 ** 9;
  let weth: Contract;
  let summitswapFactory: Contract;
  let summitswapRouter02: Contract;
  let summitReferral: Contract;
  let summitswapMiddleman: Contract;
  let tokenA: Contract;
  let tokenB: Contract;
  let tokenR: Contract;

  beforeEach(async () => {
    weth = await deployContract(owner, WETH, []);
    tokenA = await deployContract(owner, Token, []);
    tokenB = await deployContract(owner, Token, []);
    tokenR = await deployContract(owner, Token, []);
    summitswapFactory = await deployContract(owner, SummitswapFactory, [owner.address]);
    summitswapRouter02 = await deployContract(owner, SummitswapRouter02, [summitswapFactory.address, weth.address]);
    summitReferral = await deployContract(owner, SummitReferral, []);
    summitswapMiddleman = await deployContract(owner, SummitswapMiddleman, []);

    await summitswapFactory.setFeeTo(owner.address);
    await summitswapRouter02.setSummitReferral(summitReferral.address);
    await summitReferral.setRouter(summitswapMiddleman.address);
  });

  describe("owner() should be owner.address", async () => {
    it("owner() should not be otherWallet.address", async () => {
      assert.notEqual(await summitswapMiddleman.owner(), otherWallet.address);
    });
    it("owner() should be owner.address", async () => {
      assert.equal(await summitswapMiddleman.owner(), owner.address);
    });
  });

  describe("transferOwnership() to otherWallet", async () => {
    it("transferOwnership should not be called by otherWallet", async () => {
      await expect(summitswapMiddleman.connect(otherWallet).transferOwnership(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("transferOwnership to otherWallet.address, owner() should be otherWallet.address", async () => {
      assert.equal(await summitswapMiddleman.owner(), owner.address);
      await summitswapMiddleman.transferOwnership(otherWallet.address);
      assert.equal(await summitswapMiddleman.owner(), otherWallet.address);
    });
  });
});
