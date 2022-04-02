import { waffle } from "hardhat";
import { expect } from "chai";
import SummitReferralArtifact from "@built-contracts/SummitReferral.sol/SummitReferral.json";
import WETHArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import SummitswapFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitswapRouter02Artifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import KAPEXFeeManagerArtifact from "@built-contracts/KapexFeeManager.sol/KAPEX_Fee_Manager.json";
import {
  DummyToken,
  KAPEXFeeManager,
  SummitReferral,
  SummitswapFactory,
  SummitswapRouter02,
  WBNB,
} from "build/typechain";
import { BigNumber, utils } from "ethers";

const { deployContract, provider } = waffle;

const burnAddress = "0x000000000000000000000000000000000000dEaD";

describe.only("KapexFeeManager", () => {
  const [owner, royaltyWallet, marketingWallet, devWallet, stakingPoolWallet, lpTokensLockWallet] =
    provider.getWallets();

  let weth: WBNB;
  let summitswapRouter: SummitswapRouter02;
  let pancakeswapRouter: SummitswapRouter02;
  let kapex: DummyToken; // TODO test with real KAPEX
  let koda: DummyToken; // TODO test with real KODA
  let feeManager: KAPEXFeeManager;
  let summitswapFactory: SummitswapFactory;
  let pancakeswapFactory: SummitswapFactory;

  beforeEach(async () => {
    weth = (await deployContract(owner, WETHArtifact, [])) as WBNB;

    kapex = (await deployContract(owner, TokenArtifact, [])) as DummyToken;

    koda = (await deployContract(owner, TokenArtifact, [])) as DummyToken;

    summitswapFactory = (await deployContract(owner, SummitswapFactoryArtifact, [owner.address])) as SummitswapFactory;

    summitswapRouter = (await deployContract(owner, SummitswapRouter02Artifact, [
      summitswapFactory.address,
      weth.address,
    ])) as SummitswapRouter02;

    pancakeswapFactory = (await deployContract(owner, SummitswapFactoryArtifact, [owner.address])) as SummitswapFactory;

    pancakeswapRouter = (await deployContract(owner, SummitswapRouter02Artifact, [
      pancakeswapFactory.address,
      weth.address,
    ])) as SummitswapRouter02;

    feeManager = (await deployContract(owner, KAPEXFeeManagerArtifact, [])) as KAPEXFeeManager;

    await feeManager.setRoyaltyAddress(royaltyWallet.address);
    await feeManager.setStakingPoolAddress(stakingPoolWallet.address);
    await feeManager.setLpTokensLockAddress(lpTokensLockWallet.address);
    await feeManager.setMarketingAddress(marketingWallet.address);
    await feeManager.setDevAddress(devWallet.address);
    await feeManager.setBurnAddress(burnAddress);
    await feeManager.setKapex(kapex.address);
    await feeManager.setKoda(koda.address);
    await feeManager.setSummitSwapRouter(summitswapRouter.address);
    await feeManager.setPancakeSwapRouter(pancakeswapRouter.address);
  });

  describe("fees", () => {
    it("should have feeTotal summed up all the fees", async () => {
      const feeRoyalty = await feeManager.feeRoyalty();
      const feeKodaBurn = await feeManager.feeKodaBurn();
      const feeKodaLiquidity = await feeManager.feeKodaLiquidity();
      const feeKodaKapexLiquidity = await feeManager.feeKodaKapexLiquidity();
      const feeKapexLiquidity = await feeManager.feeKapexLiquidity();
      const feeMarketing = await feeManager.feeMarketing();
      const feeStakingPool = await feeManager.feeStakingPool();
      const feeDev = await feeManager.feeDev();
      const feeBurn = await feeManager.feeBurn();

      const feeTotal = await feeManager.feeTotal();

      expect(feeTotal).equal(
        feeRoyalty
          .add(feeKodaBurn)
          .add(feeKodaLiquidity)
          .add(feeKodaKapexLiquidity)
          .add(feeKapexLiquidity)
          .add(feeMarketing)
          .add(feeStakingPool)
          .add(feeDev)
          .add(feeBurn)
      );
    });
  });

  describe("getSwapPercentToBNB", () => {
    beforeEach(async () => {
      await feeManager.setFeeBurn(1);
      await feeManager.setFeeDev(2);
      await feeManager.setFeeKapexLiquidity(3);
      await feeManager.setFeeKodaBurn(4);
      await feeManager.setFeeKodaKapexLiquidity(5);
      await feeManager.setFeeKodaLiquidity(6);
      await feeManager.setFeeMarketing(7);
      await feeManager.setFeeRoyalty(8);
      await feeManager.setFeeStakingPool(9);
    });

    it("should calculate correct swapPercentToBNB", async () => {
      const feeKodaBurn = await feeManager.feeKodaBurn();
      const feeKodaLiquidity = await feeManager.feeKodaLiquidity();
      const feeKodaKapexLiquidity = await feeManager.feeKodaKapexLiquidity(); // 50% Summit
      const feeKapexLiquidity = await feeManager.feeKapexLiquidity(); // 50% Pancake
      const feeMarketing = await feeManager.feeMarketing();
      const feeDev = await feeManager.feeDev();
      const feeBurn = await feeManager.feeBurn();

      const expectedSwapPercentToBNB = feeKodaBurn
        .add(feeKodaLiquidity)
        .add(feeKodaKapexLiquidity.div(2))
        .add(feeKapexLiquidity.div(2))
        .add(feeMarketing)
        .add(feeDev);

      const actualSwapPercentToBNB = await feeManager.getSwapPercentToBNB();

      expect(expectedSwapPercentToBNB).equal(actualSwapPercentToBNB);
    });
  });

  describe("disburseSwapAndLiquifyTokens", () => {
    beforeEach(async () => {
      await kapex.transfer(feeManager.address, utils.parseEther("100"));

      await kapex.approve(pancakeswapRouter.address, utils.parseEther("100"));
      await pancakeswapRouter.addLiquidityETH(
        kapex.address,
        utils.parseEther("100"),
        0,
        0,
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        { value: utils.parseEther("5") }
      );

      await koda.approve(pancakeswapRouter.address, utils.parseEther("100"));
      await pancakeswapRouter.addLiquidityETH(
        koda.address,
        utils.parseEther("100"),
        0,
        0,
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        { value: utils.parseEther("5") }
      );

      await koda.approve(summitswapRouter.address, utils.parseEther("200"));
      await summitswapRouter.addLiquidityETH(
        koda.address,
        utils.parseEther("100"),
        0,
        0,
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        { value: utils.parseEther("5") }
      );

      await kapex.approve(summitswapRouter.address, utils.parseEther("100"));
      await summitswapRouter.addLiquidity(
        koda.address,
        kapex.address,
        utils.parseEther("100"),
        utils.parseEther("100"),
        0,
        0,
        owner.address,
        Math.floor(Date.now() / 1000) + 24 * 60 * 60
      );
    });

    it("should burn correct amount of kapex", async () => {
      const newBurnFee = 100;
      await feeManager.setFeeBurn(newBurnFee);
      const burnFee = await feeManager.feeBurn();
      const feeTotal = await feeManager.feeTotal();
      const kapexBalance = await kapex.balanceOf(feeManager.address);

      const shouldTransferAmount = kapexBalance.mul(burnFee).div(feeTotal);

      let balanceOfBurnAddress = await kapex.balanceOf(await feeManager.burnAddress());
      expect(balanceOfBurnAddress).equal(BigNumber.from("0"));

      await feeManager.disburseSwapAndLiquifyTokens(kapexBalance);

      balanceOfBurnAddress = await kapex.balanceOf(await feeManager.burnAddress());
      expect(balanceOfBurnAddress).equal(shouldTransferAmount);
    });

    it("should transfer correct amount of kapex to royalty", async () => {
      const newRoyaltyFee = 100;
      await feeManager.setFeeRoyalty(newRoyaltyFee);
      const royaltyFee = await feeManager.feeRoyalty();
      const feeTotal = await feeManager.feeTotal();
      const kapexBalance = await kapex.balanceOf(feeManager.address);

      const shouldTransferAmount = kapexBalance.mul(royaltyFee).div(feeTotal);

      let balanceOfRoyalty = await kapex.balanceOf(await feeManager.royaltyAddress());
      expect(balanceOfRoyalty).equal(BigNumber.from("0"));

      await feeManager.disburseSwapAndLiquifyTokens(kapexBalance);

      balanceOfRoyalty = await kapex.balanceOf(await feeManager.royaltyAddress());
      expect(balanceOfRoyalty).equal(shouldTransferAmount);
    });

    it("should transfer correct amunt of kapex to stakingPool", async () => {
      const newStakingPoolFee = 100;
      await feeManager.setFeeStakingPool(newStakingPoolFee);
      const feeStakingPool = await feeManager.feeStakingPool();
      const feeTotal = await feeManager.feeTotal();
      const kapexBalance = await kapex.balanceOf(feeManager.address);

      const shouldTransferAmount = kapexBalance.mul(feeStakingPool).div(feeTotal);

      let balanceOfStakingPool = await kapex.balanceOf(await feeManager.stakingPoolAddress());
      expect(balanceOfStakingPool).equal(BigNumber.from("0"));

      await feeManager.disburseSwapAndLiquifyTokens(kapexBalance);

      balanceOfStakingPool = await kapex.balanceOf(await feeManager.stakingPoolAddress());
      expect(balanceOfStakingPool).equal(shouldTransferAmount);
    });

    describe("swapAndLiquifyToBNB", () => {
      it("should transfer correct amount of bnb to dev", async () => {
        const newDevFee = 100;
        await feeManager.setFeeDev(newDevFee);
        const devFee = await feeManager.feeDev();
        const kapexBalance = await kapex.balanceOf(feeManager.address);
        const feeTotal = await feeManager.feeTotal();

        const swapPercentToBNB = await feeManager.getSwapPercentToBNB();
        const sellingKapexAmount = kapexBalance.mul(swapPercentToBNB).div(feeTotal);
        const summitBNBAmountOut = await summitswapRouter
          .getAmountsOut(sellingKapexAmount, [kapex.address, koda.address, weth.address])
          .then((o) => o[o.length - 1]);
        const pancakeBNBAmountOut = await pancakeswapRouter
          .getAmountsOut(sellingKapexAmount, [kapex.address, weth.address])
          .then((o) => o[o.length - 1]);

        const maxBNBAmountOut = summitBNBAmountOut.gte(pancakeBNBAmountOut) ? summitBNBAmountOut : pancakeBNBAmountOut;

        const initialBNBBalance = await devWallet.getBalance();
        const expectedBalance = initialBNBBalance.add(maxBNBAmountOut.mul(devFee).div(swapPercentToBNB));

        await feeManager.disburseSwapAndLiquifyTokens(kapexBalance);

        expect(expectedBalance).equal(await devWallet.getBalance());
      });

      it("should transfer correct amount of bnb to marketing", async () => {
        const newMarketingFee = 100;
        await feeManager.setFeeMarketing(newMarketingFee);
        const marketingFee = await feeManager.feeMarketing();
        const kapexBalance = await kapex.balanceOf(feeManager.address);
        const feeTotal = await feeManager.feeTotal();

        const swapPercentToBNB = await feeManager.getSwapPercentToBNB();
        const sellingKapexAmount = kapexBalance.mul(swapPercentToBNB).div(feeTotal);
        const summitBNBAmountOut = await summitswapRouter
          .getAmountsOut(sellingKapexAmount, [kapex.address, koda.address, weth.address])
          .then((o) => o[o.length - 1]);
        const pancakeBNBAmountOut = await pancakeswapRouter
          .getAmountsOut(sellingKapexAmount, [kapex.address, weth.address])
          .then((o) => o[o.length - 1]);
        const maxBNBAmountOut = summitBNBAmountOut.gte(pancakeBNBAmountOut) ? summitBNBAmountOut : pancakeBNBAmountOut;

        const initialBNBBalance = await marketingWallet.getBalance();
        const expectedBalance = initialBNBBalance.add(maxBNBAmountOut.mul(marketingFee).div(swapPercentToBNB));

        await feeManager.disburseSwapAndLiquifyTokens(kapexBalance);

        expect(expectedBalance).equal(await marketingWallet.getBalance());
      });

      it("should add correct kapex liquidity", async () => {
        const newKapexLiquidityFee = 100;
        await feeManager.setFeeKapexLiquidity(newKapexLiquidityFee);
        const kapexLiquidityFee = await feeManager.feeKapexLiquidity();
        const kapexBalance = await kapex.balanceOf(feeManager.address);
        const feeTotal = await feeManager.feeTotal();

        const swapPercentToBNB = await feeManager.getSwapPercentToBNB();
        const sellingKapexAmount = kapexBalance.mul(swapPercentToBNB).div(feeTotal);
        const summitBNBAmountOut = await summitswapRouter
          .getAmountsOut(sellingKapexAmount, [kapex.address, koda.address, weth.address])
          .then((o) => o[o.length - 1]);
        const pancakeBNBAmountOut = await pancakeswapRouter
          .getAmountsOut(sellingKapexAmount, [kapex.address, weth.address])
          .then((o) => o[o.length - 1]);
        const maxBNBAmountOut = summitBNBAmountOut.gte(pancakeBNBAmountOut) ? summitBNBAmountOut : pancakeBNBAmountOut;

        const pairAddress = await pancakeswapFactory.getPair(kapex.address, weth.address);

        const initialPairBNBBalance = await weth.balanceOf(pairAddress);
        const initialPairKapexBalance = await kapex.balanceOf(pairAddress);

        await feeManager.disburseSwapAndLiquifyTokens(kapexBalance);

        const pairBNBBalance = await weth.balanceOf(pairAddress);
        const pairKapexBalance = await kapex.balanceOf(pairAddress);

        const bnbAdded = pairBNBBalance.sub(initialPairBNBBalance);
        const kapexAdded = pairKapexBalance.sub(initialPairKapexBalance);

        // const expectedBNBAmountToAdd = maxBNBAmountOut.mul(kapexLiquidityFee.div(2)).div(swapPercentToBNB);
        // const expectedKapexAmountToAdd = kapexBalance.mul(kapexLiquidityFee.div(2)).div(feeTotal);

        // TODO add expect
      });
    });
  });
});
