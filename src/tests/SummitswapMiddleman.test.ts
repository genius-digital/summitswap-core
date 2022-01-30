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
  const feeDenominator = 10 ** 9;
  const nullAddress = "0x0000000000000000000000000000000000000000";

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

    summitReferral = (await deployContract(owner, SummitReferralArtifact, [
      owner.address,
      summitswapRouter.address,
      otherswapRouter.address,
    ])) as SummitReferral;

    summitswapMiddleman = (await deployContract(owner, SummitswapMiddlemanArtifact, [
      wbnb.address,
      summitswapFactory.address,
      summitswapRouter.address,
      nullAddress,
    ])) as SummitswapMiddleman;

    await summitswapFactory.setFeeTo(owner.address);

    // set referral
    await summitReferral.setSummitswapMiddleman(summitswapMiddleman.address);
  });

  describe("owner()", () => {
    it("owner() should not be otherWallet.address", async () => {
      assert.notEqual(await summitswapMiddleman.owner(), otherWallet.address);
    });
    it("owner() should be owner.address", async () => {
      assert.equal(await summitswapMiddleman.owner(), owner.address);
    });
  });

  describe("transferOwnership()", () => {
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

  describe("summitReferral()", () => {
    it("should be nullAddress", async () => {
      assert.equal((await summitswapMiddleman.summitReferral()).toString(), nullAddress);
    });
  });
  describe("setSummitReferral()", () => {
    it("should be able to setSummitReferral() to summitReferral.address", async () => {
      assert.equal((await summitswapMiddleman.summitReferral()).toString(), nullAddress);
      await summitswapMiddleman.setSummitReferral(summitReferral.address);
      assert.equal((await summitswapMiddleman.summitReferral()).toString(), summitReferral.address);
    });
  });

  describe("swap()", () => {
    beforeEach(async () => {
      await tokenA.approve(summitswapRouter.address, utils.parseEther("15").toString());
      await tokenB.approve(summitswapRouter.address, utils.parseEther("15").toString());

      await tokenA.approve(otherswapRouter.address, utils.parseEther("15").toString());
      await tokenB.approve(otherswapRouter.address, utils.parseEther("15").toString());
      await tokenR.approve(otherswapRouter.address, utils.parseEther("15").toString());

      // add liquidity for summitswap
      await summitswapRouter.addLiquidityETH(
        tokenA.address,
        utils.parseEther("5"),
        utils.parseEther("5"),
        utils.parseEther("0.1"),
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        { value: utils.parseEther("0.1") }
      );
      await summitswapRouter.addLiquidity(
        tokenA.address,
        tokenB.address,
        utils.parseEther("5").toString(),
        utils.parseEther("5").toString(),
        "0",
        "0",
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60
      );

      // add liquidity for otherswap
      await otherswapRouter.addLiquidityETH(
        tokenA.address,
        utils.parseEther("5"),
        utils.parseEther("5"),
        utils.parseEther("0.1"),
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        { value: utils.parseEther("0.1") }
      );
      await otherswapRouter.addLiquidityETH(
        tokenB.address,
        utils.parseEther("5"),
        utils.parseEther("5"),
        utils.parseEther("0.1"),
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        { value: utils.parseEther("0.1") }
      );
      await otherswapRouter.addLiquidity(
        tokenA.address,
        tokenB.address,
        utils.parseEther("5").toString(),
        utils.parseEther("5").toString(),
        "0",
        "0",
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60
      );
      await otherswapRouter.addLiquidity(
        tokenA.address,
        tokenR.address,
        utils.parseEther("5").toString(),
        utils.parseEther("5").toString(),
        "0",
        "0",
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60
      );
    });
    describe("swapETHForExactTokens()", () => {
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const amount = await otherswapRouter.getAmountsIn(utils.parseEther("0.1"), [wbnb.address, tokenA.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapETHForExactTokens(
              otherswapFactory.address,
              amountOut,
              [wbnb.address, tokenA.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60,
              { value: amountIn }
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsIn(utils.parseEther("0.1"), [wbnb.address, tokenB.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        let otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), "0");

        await summitswapMiddleman
          .connect(otherWallet)
          .swapETHForExactTokens(
            otherswapFactory.address,
            amountOut,
            [wbnb.address, tokenB.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            { value: amountIn }
          );
        otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), amountOut.toString());
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsIn(utils.parseEther("0.1"), [wbnb.address, tokenA.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await summitswapMiddleman.connect(otherWallet).swapETHForExactTokens(
          summitswapFactory.address,
          amountOut, // uint amountOut
          [wbnb.address, tokenA.address], // address[] calldata path
          otherWallet.address, // address to
          Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
          { value: amountIn }
        );
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), amountOut.toString());
      });
    });
    describe("swapExactETHForTokens()", () => {
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapExactETHForTokens(
              otherswapFactory.address,
              0,
              [wbnb.address, tokenA.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60,
              { value: utils.parseEther("0.1") }
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [wbnb.address, tokenB.address]);
        const amountIn = amount[0];
        const amountOut = amount[1];

        let otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), "0");

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactETHForTokens(
            otherswapFactory.address,
            0,
            [wbnb.address, tokenB.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            { value: amountIn }
          );
        otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), amountOut.toString());
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [wbnb.address, tokenA.address]);
        const amountIn = amount[0];
        const amountOut = amount[1];

        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactETHForTokens(
            summitswapFactory.address,
            0,
            [wbnb.address, tokenA.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            { value: amountIn }
          );
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), amountOut.toString());
      });
    });
    describe("swapTokensForExactETH()", () => {
      beforeEach(async () => {
        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        let otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), "0");
        assert.equal(otherWalletTokenBCount.toString(), "0");

        await tokenA.transfer(otherWallet.address, utils.parseEther("5"));
        await tokenB.transfer(otherWallet.address, utils.parseEther("5"));

        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("5").toString());
        assert.equal(otherWalletTokenBCount.toString(), utils.parseEther("5").toString());
      });
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const amount = await summitswapRouter.getAmountsIn(utils.parseEther("0.001"), [tokenA.address, wbnb.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("5").toString());

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapTokensForExactETH(
              otherswapFactory.address,
              amountIn,
              amountOut,
              [tokenA.address, wbnb.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsIn(utils.parseEther("0.001"), [tokenB.address, wbnb.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenB.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        const otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), utils.parseEther("5").toString());

        const otherWalletBalance = await otherWallet.getBalance();

        await summitswapMiddleman
          .connect(otherWallet)
          .swapTokensForExactETH(
            otherswapFactory.address,
            amountIn,
            amountOut,
            [tokenB.address, wbnb.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        assert.equal(
          otherWalletTokenBCount.sub(amountOut).toString(),
          (await tokenB.balanceOf(otherWallet.address)).toString()
        );
        assert.isOk((await otherWallet.getBalance()).gt(otherWalletBalance));
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsIn(utils.parseEther("0.001"), [tokenA.address, wbnb.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("5").toString());

        const otherWalletBalance = await otherWallet.getBalance();

        await summitswapMiddleman
          .connect(otherWallet)
          .swapTokensForExactETH(
            summitswapFactory.address,
            amountIn,
            amountOut,
            [tokenA.address, wbnb.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        assert.equal(
          otherWalletTokenACount.sub(amountOut).toString(),
          (await tokenA.balanceOf(otherWallet.address)).toString()
        );
        assert.isOk((await otherWallet.getBalance()).gt(otherWalletBalance));
      });
    });
    describe("swapExactTokensForETH()", () => {
      beforeEach(async () => {
        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        let otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), "0");
        assert.equal(otherWalletTokenBCount.toString(), "0");

        await tokenA.transfer(otherWallet.address, utils.parseEther("0.1"));
        await tokenB.transfer(otherWallet.address, utils.parseEther("0.1"));

        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.1").toString());
        assert.equal(otherWalletTokenBCount.toString(), utils.parseEther("0.1").toString());
      });
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, wbnb.address]);
        const amountIn = amount[0];

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapExactTokensForETH(
              otherswapFactory.address,
              amountIn,
              0,
              [tokenA.address, wbnb.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenB.address, wbnb.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenB.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        const otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), utils.parseEther("0.1").toString());

        const otherWalletBalance = await otherWallet.getBalance();

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForETH(
            otherswapFactory.address,
            amountOut,
            0,
            [tokenB.address, wbnb.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        assert.equal(
          (await tokenB.balanceOf(otherWallet.address)).toString(),
          otherWalletTokenBCount.sub(utils.parseEther("0.1")).toString()
        );
        assert.isTrue((await otherWallet.getBalance()).gt(otherWalletBalance));
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, wbnb.address]);
        const amountIn = amount[0];
        const amountOut = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountIn.toString());

        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.1").toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForETH(
            summitswapFactory.address,
            amountIn,
            0,
            [tokenA.address, wbnb.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");
      });
    });
    describe("swapTokensForExactTokens()", () => {
      beforeEach(async () => {
        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await tokenA.transfer(otherWallet.address, utils.parseEther("0.2"));
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").toString());
      });
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const amount = await otherswapRouter.getAmountsIn(utils.parseEther("0.1"), [tokenA.address, tokenB.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());
        await tokenB.connect(otherWallet).approve(summitswapMiddleman.address, amountIn.toString());

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapTokensForExactTokens(
              otherswapFactory.address,
              amountIn,
              amountOut,
              [tokenA.address, tokenB.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsIn(utils.parseEther("0.1"), [tokenA.address, tokenR.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());
        await tokenR.connect(otherWallet).approve(summitswapMiddleman.address, amountIn.toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapTokensForExactTokens(
            otherswapFactory.address,
            amountIn,
            amountOut,
            [tokenA.address, tokenR.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        const otherWalletTokenRCount = await tokenR.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").sub(amountOut).toString());
        assert.equal(otherWalletTokenRCount.toString(), amountIn.toString());
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsIn(utils.parseEther("0.1"), [tokenA.address, tokenB.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());
        await tokenB.connect(otherWallet).approve(summitswapMiddleman.address, amountIn.toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapTokensForExactTokens(
            summitswapFactory.address,
            amountIn,
            amountOut,
            [tokenA.address, tokenB.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        const otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").sub(amountOut).toString());
        assert.equal(otherWalletTokenBCount.toString(), amountIn.toString());
      });
    });
    describe("swapExactTokensForTokens()", () => {
      beforeEach(async () => {
        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await tokenA.transfer(otherWallet.address, utils.parseEther("0.2"));
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").toString());
      });
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const amount = await otherswapRouter.getAmountsIn(utils.parseEther("0.1"), [tokenA.address, tokenB.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());
        await tokenB.connect(otherWallet).approve(summitswapMiddleman.address, amountIn.toString());

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapExactTokensForTokens(
              otherswapFactory.address,
              amountIn,
              amountOut,
              [tokenA.address, tokenB.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, tokenR.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForTokens(
            otherswapFactory.address,
            amountOut,
            amountIn,
            [tokenA.address, tokenR.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        const otherWalletTokenRCount = await tokenR.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").sub(amountOut).toString());
        assert.equal(otherWalletTokenRCount.toString(), amountIn.toString());
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, tokenB.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForTokens(
            summitswapFactory.address,
            amountOut,
            amountIn,
            [tokenA.address, tokenB.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        const otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").sub(amountOut).toString());
        assert.equal(otherWalletTokenBCount.toString(), amountIn.toString());
      });
    });
    describe("swapExactTokensForTokensSupportingFeeOnTransferTokens()", () => {
      beforeEach(async () => {
        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        const otherWalletTokenRCount = await tokenR.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenRCount.toString(), "0");

        await tokenA.transfer(otherWallet.address, utils.parseEther("0.2"));
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").toString());
      });
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, tokenB.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapExactTokensForTokensSupportingFeeOnTransferTokens(
              otherswapFactory.address,
              amountOut,
              amountIn,
              [tokenA.address, tokenB.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, tokenR.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForTokensSupportingFeeOnTransferTokens(
            otherswapFactory.address,
            amountOut,
            amountIn,
            [tokenA.address, tokenR.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        const otherWalletTokenRCount = await tokenR.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").sub(amountOut).toString());
        assert.equal(otherWalletTokenRCount.toString(), amountIn.toString());
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, tokenB.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForTokensSupportingFeeOnTransferTokens(
            summitswapFactory.address,
            amountOut,
            amountIn,
            [tokenA.address, tokenB.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        const otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.2").sub(amountOut).toString());
        assert.equal(otherWalletTokenBCount.toString(), amountIn.toString());
      });
    });
    describe("swapExactETHForTokensSupportingFeeOnTransferTokens()", () => {
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapExactETHForTokensSupportingFeeOnTransferTokens(
              otherswapFactory.address,
              0,
              [wbnb.address, tokenA.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60,
              { value: utils.parseEther("0.1") }
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [wbnb.address, tokenB.address]);
        const amountIn = amount[0];
        const amountOut = amount[1];

        let otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), "0");

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            otherswapFactory.address,
            0,
            [wbnb.address, tokenB.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            { value: amountIn }
          );
        otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), amountOut.toString());
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [wbnb.address, tokenA.address]);
        const amountIn = amount[0];
        const amountOut = amount[1];

        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            summitswapFactory.address,
            0,
            [wbnb.address, tokenA.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            { value: amountIn }
          );
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), amountOut.toString());
      });
    });
    describe("swapExactTokensForETHSupportingFeeOnTransferTokens()", () => {
      beforeEach(async () => {
        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        let otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), "0");
        assert.equal(otherWalletTokenBCount.toString(), "0");

        await tokenA.transfer(otherWallet.address, utils.parseEther("0.1"));
        await tokenB.transfer(otherWallet.address, utils.parseEther("0.1"));

        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);

        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.1").toString());
        assert.equal(otherWalletTokenBCount.toString(), utils.parseEther("0.1").toString());
      });
      it("should be reverted, swap with otherswap and summitswap has liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, wbnb.address]);
        const amountIn = amount[0];

        await expect(
          summitswapMiddleman
            .connect(otherWallet)
            .swapExactTokensForETHSupportingFeeOnTransferTokens(
              otherswapFactory.address,
              amountIn,
              0,
              [tokenA.address, wbnb.address],
              otherWallet.address,
              Math.floor(Date.now() / 1000) + 24 * 60 * 60
            )
        ).to.be.revertedWith("Should use Summitswap for swapping");
      });
      it("should be able to swap with otherswap, if summitswap dont have the liquidity", async () => {
        const amount = await otherswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenB.address, wbnb.address]);
        const amountOut = amount[0];
        const amountIn = amount[1];

        await tokenB.connect(otherWallet).approve(summitswapMiddleman.address, amountOut.toString());

        const otherWalletTokenBCount = await tokenB.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenBCount.toString(), utils.parseEther("0.1").toString());

        const otherWalletBalance = await otherWallet.getBalance();

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForETHSupportingFeeOnTransferTokens(
            otherswapFactory.address,
            amountOut,
            0,
            [tokenB.address, wbnb.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        assert.equal(
          (await tokenB.balanceOf(otherWallet.address)).toString(),
          otherWalletTokenBCount.sub(utils.parseEther("0.1")).toString()
        );
        assert.isTrue((await otherWallet.getBalance()).gt(otherWalletBalance));
      });
      it("should be able to swap with summitswap", async () => {
        const amount = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [tokenA.address, wbnb.address]);
        const amountIn = amount[0];
        const amountOut = amount[1];

        await tokenA.connect(otherWallet).approve(summitswapMiddleman.address, amountIn.toString());

        let otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), utils.parseEther("0.1").toString());

        await summitswapMiddleman
          .connect(otherWallet)
          .swapExactTokensForETHSupportingFeeOnTransferTokens(
            summitswapFactory.address,
            amountIn,
            0,
            [tokenA.address, wbnb.address],
            otherWallet.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60
          );
        otherWalletTokenACount = await tokenA.balanceOf(otherWallet.address);
        assert.equal(otherWalletTokenACount.toString(), "0");
      });
    });
    describe("referralReward", () => {
      beforeEach(async () => {
        await summitswapMiddleman.setSummitReferral(summitReferral.address);
        await summitReferral.connect(otherWallet).recordReferral(tokenA.address, leadInfluencer.address);
        await summitReferral.setFeeInfo(
          tokenA.address,
          tokenB.address,
          (5 * feeDenominator) / 100,
          (5 * feeDenominator) / 100,
          "0",
          "0",
          "0"
        );
        await summitswapRouter.addLiquidityETH(
          tokenB.address,
          utils.parseEther("5"),
          utils.parseEther("5"),
          utils.parseEther("0.1"),
          owner.address,
          Math.floor(Date.now() / 1000) + 24 * 60 * 60,
          { value: utils.parseEther("0.1") }
        );
      });
      it("should not be able to get reward, if summitReferral is not set", async () => {
        await summitswapMiddleman.setSummitReferral(nullAddress);

        const amounts = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [wbnb.address, tokenA.address]);
        const amountOut = amounts[0];
        const amountIn = amounts[1];

        await summitswapMiddleman
          .connect(otherWallet)
          .swapETHForExactTokens(
            summitswapFactory.address,
            amountOut.toString(),
            [wbnb.address, tokenA.address],
            owner.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            { value: amountIn }
          );
        const balancesLength = await summitReferral.getBalancesLength(leadInfluencer.address);
        assert.equal(balancesLength.toString(), "0");
      });
      it("should be able to get reward", async () => {
        const amounts = await summitswapRouter.getAmountsOut(utils.parseEther("0.1"), [wbnb.address, tokenA.address]);
        const amountOut = amounts[0];
        const amountIn = amounts[1];

        const path = [tokenA.address, wbnb.address, tokenB.address];
        const secondRewardAmount = (await summitswapRouter.getAmountsOut(amountOut.toString(), path))[2];

        await summitswapMiddleman
          .connect(otherWallet)
          .swapETHForExactTokens(
            summitswapFactory.address,
            amountOut.toString(),
            [wbnb.address, tokenA.address],
            owner.address,
            Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            { value: amountIn }
          );
        const balancesLength = await summitReferral.getBalancesLength(leadInfluencer.address);
        assert.equal(balancesLength.toString(), "1");

        const rewardBalance = await summitReferral.balances(tokenB.address, leadInfluencer.address);
        assert.equal(rewardBalance.toString(), secondRewardAmount.mul(5).div(100).toString());
      });
    });
  });
});
