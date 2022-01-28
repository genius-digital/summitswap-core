import { waffle } from "hardhat";
import { expect, assert } from "chai";
import { utils } from "ethers";
import WETH from "@built-contracts/utils/WBNB.sol/WBNB.json";
import Token from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import SummitswapFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitswapRouter02Artifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import SummitswapMiddlemanArtifact from "@built-contracts/SummitswapMiddleman.sol/SummitswapMiddleman.json";
import SummitReferralArtifact from "@built-contracts/SummitReferral.sol/SummitReferral.json";
import {
  DummyToken,
  SummitReferral,
  SummitswapFactory,
  SummitswapRouter02,
  SummitswapMiddleman,
  WBNB,
} from "build/typechain";

const { deployContract, provider } = waffle;

describe("Summitswap Middleman", () => {
  const [owner, leadInfluencer, subInfluencer, otherWallet, otherWallet2] = provider.getWallets();

  // tokens
  let wbnb: WBNB;
  let tokenA: DummyToken;
  let tokenB: DummyToken;
  let tokenR: DummyToken;

  // summitswap
  let summitswapFactory: SummitswapFactory;
  let summitswapRouter: SummitswapRouter02;

  // otherswap
  let otherswapFactory: SummitswapFactory;
  let otherswapRouter: SummitswapRouter02;

  // middleman & referral
  let summitswapMiddleman: SummitswapMiddleman;
  let summitReferral: SummitReferral;

  beforeEach(async () => {
    // deploy tokens
    wbnb = (await deployContract(owner, WETH, [])) as WBNB;
    tokenA = (await deployContract(owner, Token, [])) as DummyToken;
    tokenB = (await deployContract(owner, Token, [])) as DummyToken;
    tokenR = (await deployContract(owner, Token, [])) as DummyToken;

    // deploy summitswap
    summitswapFactory = (await deployContract(owner, SummitswapFactoryArtifact, [owner.address])) as SummitswapFactory;
    summitswapRouter = (await deployContract(owner, SummitswapRouter02Artifact, [
      summitswapFactory.address,
      wbnb.address,
    ])) as SummitswapRouter02;

    // deploy otherswap
    otherswapFactory = (await deployContract(owner, SummitswapFactoryArtifact, [owner.address])) as SummitswapFactory;
    otherswapRouter = (await deployContract(owner, SummitswapRouter02Artifact, [
      otherswapFactory.address,
      wbnb.address,
    ])) as SummitswapRouter02;

    summitswapMiddleman = (await deployContract(owner, SummitswapMiddlemanArtifact, [])) as SummitswapMiddleman;
    summitReferral = (await deployContract(owner, SummitReferralArtifact, [
      owner.address,
      summitswapRouter.address,
      otherswapRouter.address,
    ])) as SummitReferral;

    await summitswapFactory.setFeeTo(owner.address);

    // set referral
    // await summitswapRouter.setSummitReferral(summitReferral.address);
    // await summitReferral.setRouter(summitswapMiddleman.address);
  });

  describe("owner() should be owner.address", () => {
    it("owner() should not be otherWallet.address", async () => {
      assert.notEqual(await summitswapMiddleman.owner(), otherWallet.address);
    });
    it("owner() should be owner.address", async () => {
      assert.equal(await summitswapMiddleman.owner(), owner.address);
    });
  });

  describe("transferOwnership() to otherWallet", () => {
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

  describe("swap()", () => {
    beforeEach(async () => {
      await tokenA.approve(summitswapRouter.address, utils.parseEther("5").toString());
      await tokenR.approve(summitswapRouter.address, utils.parseEther("5").toString());

      await summitswapRouter.addLiquidityETH(
        tokenA.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );

      await summitswapRouter.addLiquidityETH(
        tokenR.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );
    });
    //   describe("swap() without reward", () => {
    //     it("should be able to swap", async () => {
    //       const amount = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [wbnb.address, tokenA.address]);
    //       const amountOut = amount[0];
    //       const amountIn = amount[1];

    //       let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
    //       assert.equal(otherWalletTokenACount.toString(), "0");

    //       await summitswapMiddleman.connect(otherWallet).swapETHForExactTokens(
    //         summitswapFactory.address,
    //         wbnb.address,
    //         amountOut, // uint amountOut
    //         [wbnb.address, tokenA.address], // address[] calldata path
    //         otherWallet.address, // address to
    //         Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
    //         { value: amountIn }
    //       );
    //       otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
    //       assert.equal(otherWalletTokenACount.toString(), amountOut.toString());
    //     });
    //   });
    //   describe("swap() with reward", () => {});
  });
});
