import CustomPresaleArtifact from "@built-contracts/SummitCustomPresale.sol/SummitCustomPresale.json";
import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import { DummyToken, SummitCustomPresale, SummitswapFactory, SummitswapRouter02, WBNB } from "build/typechain";
import { assert, expect } from "chai";
import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, formatUnits, parseUnits } from "ethers/lib/utils";
import { ethers, waffle } from "hardhat";
import { BURN_ADDRESS, ZERO_ADDRESS } from "src/environment";

const { deployContract, provider } = waffle;

describe("SummitCustomPresale", () => {
  const [owner, otherOwner, otherWallet1, otherWallet2, summitFactoryFeeToSetter] = provider.getWallets();

  let presaleToken: DummyToken;
  let raisedToken: DummyToken;
  let wbnb: WBNB;
  let summitFactory: SummitswapFactory;
  let summitRouter: SummitswapRouter02;
  let customPresale: SummitCustomPresale;

  const FEE_DENOMINATOR = 10 ** 9;
  const FEE_RAISED_TOKEN = 50000000; // 5%
  const FEE_PRESALE_TOKEN = 20000000; // 2%
  const EMERGENCY_WITHDRAW_FEE = 100000000; // 10%

  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuy = "0.1";
  const maxBuy = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPrecentage = 70;
  const startPresaleTime = dayjs().unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const refundType = 0;
  const isWhiteListPhase = false;
  const isClaimPhase = false;
  const isPresaleCancelled = false;
  const isWithdrawCancelledTokens = false;

  beforeEach(async () => {
    wbnb = (await deployContract(owner, WbnbArtifact, [])) as WBNB;
    summitFactory = (await deployContract(owner, SummitFactoryArtifact, [
      summitFactoryFeeToSetter.address,
    ])) as SummitswapFactory;
    summitRouter = (await deployContract(owner, SummitRouterArtifact, [
      summitFactory.address,
      wbnb.address,
    ])) as SummitswapRouter02;
    const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
    const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
    const tokenAmount = presaleTokenAmount + tokensForLiquidity;
    presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
    customPresale = (await deployContract(owner, CustomPresaleArtifact, [
      [owner.address, presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS, otherOwner.address],
      [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
      [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
      liquidityLockTime,
      startPresaleTime,
      endPresaleTime,
      refundType,
      isWhiteListPhase,
    ])) as SummitCustomPresale;
    await presaleToken
      .connect(owner)
      .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
  });

  describe("owner", () => {
    it("should be owner", async () => {
      const ownerAddress = await customPresale.owner();
      assert.equal(ownerAddress, owner.address);
    });
  });

  describe("transferOwnership()", () => {
    it("should set owner to otherWallet", async () => {
      await customPresale.connect(owner).transferOwnership(otherOwner.address);
      const newOwner = await customPresale.owner();
      assert.equal(newOwner, otherOwner.address);
    });
    it("should be reverted, if set with otherWallet", async () => {
      await expect(customPresale.connect(otherOwner).transferOwnership(otherOwner.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("getFeeInfo()", () => {
    let feeInfo: SummitCustomPresale.FeeInfoStruct;
    beforeEach(async () => {
      feeInfo = await customPresale.getFeeInfo();
    });
    it("should be emergencyWithdrawFee", () => {
      const emergencyWithdrawFee = feeInfo.emergencyWithdrawFee;
      assert.equal(EMERGENCY_WITHDRAW_FEE.toString(), emergencyWithdrawFee.toString());
    });
    it("should be FEE_RAISED_TOKEN", () => {
      const feeRaisedToken = feeInfo.feeRaisedToken;
      assert.equal(feeRaisedToken.toString(), FEE_RAISED_TOKEN.toString());
    });
    it("should be FEE_PRESALE_TOKEN", () => {
      const feePresaleToken = feeInfo.feePresaleToken;
      assert.equal(feePresaleToken.toString(), FEE_PRESALE_TOKEN.toString());
    });
    it("should be ZeroAddress", () => {
      const tokenAddress = feeInfo.raisedTokenAddress;
      assert.equal(ZERO_ADDRESS, tokenAddress);
    });
    it("should be raisedToken address", async () => {
      raisedToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          owner.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;

      feeInfo = await customPresale.getFeeInfo();
      const tokenAddress = feeInfo.raisedTokenAddress;

      assert.equal(raisedToken.address, tokenAddress);
    });
  });

  describe("getPresaleInfo()", () => {
    let presaleInfo: SummitCustomPresale.PresaleInfoStructOutput;
    beforeEach(async () => {
      presaleInfo = await customPresale.getPresaleInfo();
    });
    it("should be presaleToken", () => {
      const tokenAddress = presaleInfo.presaleToken;
      assert.equal(tokenAddress, presaleToken.address);
    });
    it("should be router", () => {
      const routerAddresss = presaleInfo.router;
      assert.equal(routerAddresss, summitRouter.address);
    });
    it("should be presalePrice", () => {
      const bigPresalePrice = parseEther(presalePrice);
      assert.equal(bigPresalePrice.toString(), presaleInfo.presalePrice.toString());
    });
    it("should be listingPrice", () => {
      const bigListingPrice = parseEther(listingPrice);
      assert.equal(bigListingPrice.toString(), presaleInfo.listingPrice.toString());
    });
    it("should be minBuy", () => {
      const bigMinBuy = parseEther(minBuy);
      assert.equal(bigMinBuy.toString(), presaleInfo.minBuy.toString());
    });
    it("should be maxBuy", () => {
      const bigMaxBuy = parseEther(maxBuy);
      assert.equal(bigMaxBuy.toString(), presaleInfo.maxBuy.toString());
    });
    it("should be softCap", () => {
      const bigSoftCap = parseEther(softCap);
      assert.equal(bigSoftCap.toString(), presaleInfo.softCap.toString());
    });
    it("should be hardCap", () => {
      const bigHardCap = parseEther(hardCap);
      assert.equal(bigHardCap.toString(), presaleInfo.hardCap.toString());
    });
    it("should be liquidityPercentage", () => {
      const liquidity = BigNumber.from(liquidityPrecentage).mul(FEE_DENOMINATOR).div(100);
      assert.equal(liquidity.toString(), presaleInfo.liquidityPercentage.toString());
    });
    it("should be startPresaleTime", () => {
      assert.equal(startPresaleTime.toString(), presaleInfo.startPresaleTime.toString());
    });
    it("should be endPresaleTime", () => {
      assert.equal(endPresaleTime.toString(), presaleInfo.endPresaleTime.toString());
    });
    it("should be totalBought", () => {
      assert.equal((0).toString(), presaleInfo.totalBought.toString());
    });
    it("should be refundType", () => {
      assert.equal(refundType, presaleInfo.refundType);
    });
    it("should be isWhiteListPhase", () => {
      assert.equal(isWhiteListPhase, presaleInfo.isWhiteListPhase);
    });
    it("should be isClaimPhase", () => {
      assert.equal(isClaimPhase, presaleInfo.isClaimPhase);
    });
    it("should be isPresaleCancelled", () => {
      assert.equal(isPresaleCancelled, presaleInfo.isPresaleCancelled);
    });
    it("should be isWithdrawCancelledTokens", () => {
      assert.equal(isWithdrawCancelledTokens, presaleInfo.isWithdrawCancelledTokens);
    });
  });

  describe("calculateBnbToPresaleToken()", () => {
    it("should return Tokens for presale", async () => {
      const bigHardCap = parseEther(hardCap);
      const bigPresalePrice = parseEther(presalePrice);

      const tokenAmount = await customPresale.calculateBnbToPresaleToken(bigHardCap, bigPresalePrice);
      assert.equal(tokenAmount.toString(), formatUnits(bigHardCap.mul(bigPresalePrice), 18).split(".")[0]);
    });
    it("should return Tokens with listing price", async () => {
      const bigHardCap = parseEther(hardCap);
      const bigListingPrice = parseEther(listingPrice);

      const tokenAmount = await customPresale.calculateBnbToPresaleToken(bigHardCap, bigListingPrice);
      assert.equal(tokenAmount.toString(), formatUnits(bigHardCap.mul(bigListingPrice), 18).split(".")[0]);
    });
  });

  describe("buy()", () => {
    it("should be reverted, if presale not started", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        dayjs().add(1, "day").unix(),
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy),
        })
      ).to.be.revertedWith("Presale Not started Yet");
    });

    it("should be reverted, if presale ended", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy),
        })
      ).to.be.revertedWith("Presale Ended");
    });

    it("should be reverted, if claim phase", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      await customPresale.connect(owner).finalize();
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy),
        })
      ).to.be.revertedWith("Claim Phase has started");
    });

    it("should be reverted, if whitelistphase and address not whitelisted", async () => {
      await customPresale.connect(owner).toggleWhitelistPhase();
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(minBuy),
        })
      ).to.be.revertedWith("Address not Whitelisted");
    });

    it("should be reverted, if buyBnbAmount greater than maxBuy", async () => {
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy).add("1"),
        })
      ).to.be.revertedWith("Cannot buy more than HardCap amount");
    });

    it("should be reverted, if buyBnbAmount less than minBuy", async () => {
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(minBuy).sub("1"),
        })
      ).to.be.revertedWith("msg.value is less than minBuy");
    });

    it("should be reverted, if buyBnbAmount greater than maxBuy", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther("0.4")],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy).add("1"),
        })
      ).to.be.revertedWith("msg.value is great than maxBuy");
    });

    it("should be equal buyAmount and boughtAmount", async () => {
      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      const otherWallet1BoughtAmount = (await customPresale.bought(otherWallet1.address)).toString();
      assert.equal(bigMaxBuy.toString(), otherWallet1BoughtAmount);
    });

    it("should be equal totalBoughtAmount and accounts bought amount", async () => {
      const bigMinBuy = parseEther(minBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuy,
      });
      await customPresale.connect(otherWallet2).buy({
        value: bigMinBuy,
      });
      const otherWallet1BoughtAmount = (await customPresale.getPresaleInfo()).totalBought.toString();
      assert.equal(otherWallet1BoughtAmount, bigMinBuy.add(bigMinBuy).toString());
    });

    it("should be same, the contributor and otherWallet1", async () => {
      const bigMinBuy = parseEther(minBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuy,
      });
      const contributors = await customPresale.getContributors();
      assert.equal(contributors[0], otherWallet1.address);
    });

    it("should be same, the contributors length and buyers", async () => {
      const bigMinBuy = parseEther(minBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuy,
      });
      await customPresale.connect(otherWallet2).buy({
        value: bigMinBuy,
      });
      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 2);
    });

    it("should be same, the contributors length and otherWallet1 buying multiple times", async () => {
      const bigMinBuy = parseEther(minBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuy,
      });
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuy,
      });
      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 1);
    });
  });

  describe("buyCustomCurrency()", () => {
    let raisedToken: DummyToken;
    beforeEach(async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      raisedToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          owner.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          raisedToken.address, // pairTokenAddress == raisedTokenAddress
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
    });
    it("should be reverted, if presale not started", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        dayjs().add(1, "day").unix(),
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Presale Not started Yet"
      );
    });

    it("should be reverted, if presale ended", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Presale Ended"
      );
    });

    it("should be reverted, if claim phase", async () => {
      await raisedToken.connect(owner).approve(customPresale.address, parseEther(maxBuy));
      await customPresale.connect(owner).buyCustomCurrency(parseEther(maxBuy));
      await customPresale.connect(owner).finalize({
        gasLimit: 3000000,
      });

      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Claim Phase has started"
      );
    });

    it("should be reverted, if whitelistphase and address not whitelisted", async () => {
      await customPresale.connect(owner).toggleWhitelistPhase();
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(minBuy))).to.be.revertedWith(
        "Address not Whitelisted"
      );
    });

    it("should be reverted, if raised token is native coin", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Raised token is native coin"
      );
    });

    it("should be reverted, if buy bought more than hardcap amount", async () => {
      await expect(customPresale.connect(owner).buyCustomCurrency(parseEther(maxBuy).add("1"))).to.be.revertedWith(
        "Cannot buy more than HardCap amount"
      );
    });

    it("should be reverted, if contributionAmount less than minBuy", async () => {
      await expect(
        customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(minBuy).sub("1"))
      ).to.be.revertedWith("contributionAmount is less than minBuy");
    });

    it("should be reverted, if contributionAmount greater than maxBuy", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther("0.4")],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await expect(
        customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy).add("1"))
      ).to.be.revertedWith("contributionAmount is great than maxBuy");
    });

    it("should be reverted, if allowance less than contributionAmount", async () => {
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(minBuy))).to.be.revertedWith(
        "Increase allowance to contribute"
      );
    });

    it("should be equal contributionAmount and change in account balance", async () => {
      await raisedToken.connect(owner).approve(customPresale.address, parseEther(maxBuy));
      const balance0 = await raisedToken.balanceOf(owner.address);
      await customPresale.connect(owner).buyCustomCurrency(parseEther(maxBuy));
      const balance1 = await raisedToken.balanceOf(owner.address);

      const ownerBoughtAmount = await customPresale.bought(owner.address);
      assert.equal(balance0.sub(balance1).toString(), ownerBoughtAmount.toString());
    });

    it("should be equal contributionAmount and boughtAmount", async () => {
      await raisedToken.connect(owner).approve(customPresale.address, parseEther(maxBuy));
      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(owner).buyCustomCurrency(bigMaxBuy);
      const ownerBoughtAmount = await customPresale.bought(owner.address);
      assert.equal(bigMaxBuy.toString(), ownerBoughtAmount.toString());
    });

    it("should be equal totalBoughtAmount and accounts bought amount", async () => {
      const bigMinBuy = parseEther(minBuy);
      await raisedToken.connect(owner).transfer(otherWallet1.address, bigMinBuy);
      await raisedToken.connect(owner).approve(customPresale.address, bigMinBuy);
      await raisedToken.connect(otherWallet1).approve(customPresale.address, bigMinBuy);

      await customPresale.connect(owner).buyCustomCurrency(bigMinBuy);
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMinBuy);

      const totalBought = (await customPresale.getPresaleInfo()).totalBought.toString();
      assert.equal(totalBought, bigMinBuy.add(bigMinBuy).toString());
    });

    it("should be same, the contributor and owner", async () => {
      const bigMinBuy = parseEther(minBuy);
      await raisedToken.connect(owner).approve(customPresale.address, bigMinBuy);

      await customPresale.connect(owner).buyCustomCurrency(bigMinBuy);

      const contributors = await customPresale.getContributors();
      assert.equal(contributors[0], owner.address);
    });

    it("should be same, the contributors length and buyers", async () => {
      const bigMinBuy = parseEther(minBuy);
      await raisedToken.connect(owner).transfer(otherWallet1.address, bigMinBuy);
      await raisedToken.connect(owner).approve(customPresale.address, bigMinBuy);
      await raisedToken.connect(otherWallet1).approve(customPresale.address, bigMinBuy);

      await customPresale.connect(owner).buyCustomCurrency(bigMinBuy);
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMinBuy);

      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 2);
    });

    it("should be same, the contributors length and otherWallet1 buying multiple times", async () => {
      const bigMinBuy = parseEther(minBuy);
      await raisedToken.connect(owner).transfer(otherWallet1.address, bigMinBuy.add(bigMinBuy));
      await raisedToken.connect(otherWallet1).approve(customPresale.address, bigMinBuy.add(bigMinBuy));

      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMinBuy);
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMinBuy);

      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 1);
    });
  });

  describe("claim()", () => {
    beforeEach(async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
    });
    it("should be reverted, if presale cancelled", async () => {
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).claim()).to.be.revertedWith("Presale Cancelled");
    });

    it("should be reverted, if not claim phase", async () => {
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther("0.4")],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await expect(customPresale.connect(otherWallet1).claim()).to.be.revertedWith("Claim hasn't started yet");
    });

    it("should be reverted, if user don't have any token to claim", async () => {
      await customPresale.connect(owner).finalize();
      await expect(customPresale.connect(otherWallet2).claim()).to.be.revertedWith(
        "You do not have any tokens to claim"
      );
    });

    it("should be reverted, if tokens already claimed", async () => {
      await customPresale.connect(owner).finalize();
      await customPresale.connect(otherWallet1).claim();
      await expect(customPresale.connect(otherWallet1).claim()).to.be.revertedWith("Tokens already Claimed");
    });

    it("should be equal boughtAmount and transferred Amount", async () => {
      await customPresale.connect(owner).finalize();
      await customPresale.connect(otherWallet1).claim();

      const tokenAmountTransfer = parseEther(maxBuy).mul(presalePrice).toString();
      const tokenBalance = (await presaleToken.balanceOf(otherWallet1.address)).toString();
      assert.equal(tokenAmountTransfer, tokenBalance);
    });

    it("should be true isTokenClaimed", async () => {
      await customPresale.connect(owner).finalize();
      await customPresale.connect(otherWallet1).claim();
      const isAccountClaimed = await customPresale.isTokenClaimed(otherWallet1.address);
      assert.equal(isAccountClaimed, true);
    });
  });

  describe("withdrawRaisedToken()", () => {
    it("should be reverted, if presale not cancelled", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      await expect(customPresale.connect(otherWallet1).withdrawRaisedToken()).to.be.revertedWith(
        "Presale Not Cancelled"
      );
    });

    it("should be reverted, if tokens not bought", async () => {
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).withdrawRaisedToken()).to.be.revertedWith(
        "You do not have any contributions"
      );
    });

    it("should be equal withdrawal BNB amount and Buy BNB amount ", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      const initialBoughtAmount = await customPresale.bought(otherWallet1.address);
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawRaisedToken();
      const finalBoughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuy).toString());
      assert.equal(finalBoughtAmount.toString(), "0");
    });

    it("should be equal withdrawal token amount and contribution amount if raised token not native coin", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      raisedToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          owner.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));

      await raisedToken.connect(owner).approve(customPresale.address, parseEther(minBuy));
      await customPresale.connect(owner).buyCustomCurrency(parseEther(minBuy));

      const raisedTokenBalance0 = await raisedToken.balanceOf(owner.address);
      const initialBoughtAmount = await customPresale.bought(owner.address);

      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(owner).withdrawRaisedToken();

      const raisedTokenBalance1 = await raisedToken.balanceOf(owner.address);
      const finalBoughtAmount = await customPresale.bought(owner.address);

      assert.equal(raisedTokenBalance1.sub(raisedTokenBalance0).toString(), parseEther(minBuy).toString());
      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuy).toString());
      assert.equal(finalBoughtAmount.toString(), "0");
    });

    it("should be equal change in total bought and withdrawal amount", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(otherWallet2).buy({
        value: parseEther(minBuy),
      });
      const initialTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawRaisedToken();
      const finalTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      assert.equal(initialTotalBought.sub(finalTotalBought).toString(), parseEther(minBuy).toString());
    });

    it("should be greater balance after withdrawal of BNB", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      const initialBalance = await provider.getBalance(otherWallet1.address);
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawRaisedToken();
      const finalBalance = await provider.getBalance(otherWallet1.address);
      assert.equal(finalBalance.gt(initialBalance), true);
    });

    it("should be remove from contributors after withdrawRaisedToken", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      const length0 = (await customPresale.getContributors()).length;
      assert.equal(length0.toString(), "1");
      await customPresale.connect(owner).cancelPresale();

      await customPresale.connect(otherWallet1).withdrawRaisedToken();
      const length1 = (await customPresale.getContributors()).length;
      assert.equal(length1.toString(), "0");
    });
  });

  describe("emergencyWithdrawRaisedToken()", () => {
    it("should be reverted, if presale not started", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        dayjs().add(1, "day").unix(),
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken()).to.be.revertedWith(
        "Presale Not started Yet"
      );
    });

    it("should be reverted, if presale has ended", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken()).to.be.revertedWith(
        "Presale Ended"
      );
    });

    it("should be reverted, if tokens not bought", async () => {
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken()).to.be.revertedWith(
        "You do not have any contributions"
      );
    });

    it("should be reverted, if presale is cancelled", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken()).to.be.revertedWith(
        "Presale has been cancelled"
      );
    });

    it("should be reverted, if is claim phase", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      await customPresale.connect(owner).finalize();
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken()).to.be.revertedWith(
        "Presale claim phase"
      );
    });

    it("should send 10% BNB to service fee address if bought with BNB", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      const initialBalance = await provider.getBalance(otherOwner.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const finalBalance = await provider.getBalance(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        parseUnits(minBuy).mul(EMERGENCY_WITHDRAW_FEE).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send 10% raisedToken to service fee address if bought with raisedToken", async () => {
      raisedToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther("0.4")],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;

      await raisedToken.connect(otherWallet1).approve(customPresale.address, parseEther(minBuy));
      await customPresale.connect(otherWallet1).buyCustomCurrency(parseEther(minBuy));

      const initialBalance = await raisedToken.balanceOf(otherOwner.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const finalBalance = await raisedToken.balanceOf(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        parseUnits(minBuy).mul(EMERGENCY_WITHDRAW_FEE).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should be equal withdrawal BNB amount and Buy BNB amount ", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      const initialBoughtAmount = await customPresale.bought(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const finalBoughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuy).toString());
    });

    it("should be equal bougth raisedToken amount and withdrawal amount if raised token not native coin", async () => {
      raisedToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          otherWallet1.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther("0.4")],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;

      await raisedToken.connect(otherWallet1).approve(customPresale.address, parseEther(minBuy));
      await customPresale.connect(otherWallet1).buyCustomCurrency(parseEther(minBuy));

      const balance0 = await raisedToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const balance1 = await raisedToken.balanceOf(otherWallet1.address);

      assert.equal(
        balance1.sub(balance0).add(parseUnits(minBuy).mul(EMERGENCY_WITHDRAW_FEE).div(FEE_DENOMINATOR)).toString(),
        parseEther(minBuy).toString()
      );
    });

    it("should be 0 bought amount after emergencyWithdrawRaisedToken", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const boughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(boughtAmount.toString(), "0");
    });

    it("should be equal change in total bought and withdrawal amount", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(otherWallet2).buy({
        value: parseEther(minBuy),
      });
      const initialTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const finalTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      assert.equal(initialTotalBought.sub(finalTotalBought).toString(), parseEther(minBuy).toString());
    });

    it("should be greater balance after emergencyWithdrawRaisedToken", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      const initialBalance = await provider.getBalance(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const finalBalance = await provider.getBalance(otherWallet1.address);
      assert.equal(finalBalance.gt(initialBalance), true);
    });

    it("should be remove from contributors after emergencyWithdrawRaisedToken", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      const length0 = (await customPresale.getContributors()).length;
      assert.equal(length0.toString(), "1");
      await customPresale.connect(otherWallet1).emergencyWithdrawRaisedToken();
      const length1 = (await customPresale.getContributors()).length;
      assert.equal(length1.toString(), "0");
    });
  });

  describe("addWhiteList()", () => {
    const whitelist = [owner.address, otherOwner.address, otherWallet1.address];
    it("should be reverted, if set with otherWallet1", async () => {
      await customPresale.connect(owner).addWhiteList(whitelist);
      await expect(customPresale.connect(otherWallet1).addWhiteList(whitelist)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should add whitelist addresses to whitelist", async () => {
      await customPresale.connect(owner).addWhiteList(whitelist);
      const whitelistContract = await customPresale.getWhitelist();
      assert.equal(whitelist.length, whitelistContract.length);
    });

    it("should not be added dublicate addresses", async () => {
      await customPresale.connect(owner).addWhiteList(whitelist);
      await customPresale.connect(owner).addWhiteList(whitelist);
      const whitelistContract = await customPresale.getWhitelist();
      assert.equal(whitelist.length, whitelistContract.length);
    });
  });

  describe("removeWhiteList()", () => {
    const whitelist = [owner.address, otherOwner.address, otherWallet1.address];
    it("should be reverted, if set with otherWallet1", async () => {
      await customPresale.connect(owner).addWhiteList(whitelist);
      await expect(customPresale.connect(otherWallet1).removeWhiteList(whitelist)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should remove whitelist addresses", async () => {
      await customPresale.connect(owner).addWhiteList(whitelist);
      await customPresale.connect(owner).removeWhiteList(whitelist);
      const whitelistContract = await customPresale.getWhitelist();
      assert.equal(0, whitelistContract.length);
    });

    it("should not do anything on dublicate addresses", async () => {
      await customPresale.connect(owner).addWhiteList(whitelist);
      await customPresale.connect(owner).removeWhiteList(whitelist.concat(whitelist));
      const whitelistContract = await customPresale.getWhitelist();
      assert.equal(0, whitelistContract.length);
    });
  });

  describe("finalize()", () => {
    it("should be reverted, if set with otherWallet1", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      await expect(customPresale.connect(otherWallet1).finalize()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be reverted, if is not end presale time && hardcap !== totalBought", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await expect(customPresale.connect(owner).finalize()).to.be.revertedWith("Presale Not Ended");
    });

    it("should be reverted, if is not end presale time && hardcap !== totalBought", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [owner.address, presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));

      await expect(customPresale.connect(owner).finalize()).to.be.revertedWith(
        "Total bought is less than softCap. Presale failed"
      );
    });

    it("should send FEE_RAISED_TOKEN to servicefeeReceiver if raised token BNB", async () => {
      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      const initialBalance = await provider.getBalance(otherOwner.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await provider.getBalance(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuy.mul(FEE_RAISED_TOKEN).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send FEE_RAISED_TOKEN to servicefeeReceiver if raised token not BNB", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      raisedToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          owner.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          raisedToken.address, // raisedTokenAddress == pairTokenAddress
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));

      const bigMaxBuy = parseEther(maxBuy);

      await raisedToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

      const initialBalance = await raisedToken.balanceOf(otherOwner.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await raisedToken.balanceOf(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuy.mul(FEE_RAISED_TOKEN).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send FEE_PRESALE_TOKEN to servicefeeReceiver", async () => {
      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      const initialBalance = await presaleToken.balanceOf(otherOwner.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await presaleToken.balanceOf(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuy.mul(presalePrice).mul(FEE_PRESALE_TOKEN).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should start claim phase", async () => {
      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      await customPresale.connect(owner).finalize();
      const presaleInfo = await customPresale.getPresaleInfo();
      assert.equal(presaleInfo.isClaimPhase, true);
    });

    it("should refund remaining tokens for refundType 0", async () => {
      const transferAmount = parseUnits("1", await presaleToken.decimals());
      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      await presaleToken.connect(owner).transfer(customPresale.address, transferAmount);
      const initialBalance = await presaleToken.balanceOf(owner.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await presaleToken.balanceOf(owner.address);

      assert.equal(finalBalance.sub(initialBalance).toString(), transferAmount.toString());
    });

    it("should burn remaining tokens for refundType 1", async () => {
      const excessTokens = 1;
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + excessTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [owner.address, presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        1,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      const initialBalance = await presaleToken.balanceOf(BURN_ADDRESS);
      await customPresale.connect(owner).finalize();
      const finalBalance = await presaleToken.balanceOf(BURN_ADDRESS);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        parseUnits(excessTokens.toString(), await presaleToken.decimals()).toString()
      );
    });

    describe("addLiquidity", () => {
      it("should reserves be equal to amount of liquidity added if liquidity added with native coin", async () => {
        const bigMaxBuy = parseEther(maxBuy);
        await customPresale.connect(otherWallet1).buy({
          value: bigMaxBuy,
        });

        const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
          .mul(FEE_PRESALE_TOKEN)
          .div(FEE_DENOMINATOR);
        const tokensForLiquidity = parseEther(
          ((Number(liquidityPrecentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
        ).sub(feePresaleToken);

        const feeRaisedToken = parseEther(maxBuy).mul(FEE_RAISED_TOKEN).div(FEE_DENOMINATOR);
        const amountBNBAdded = bigMaxBuy.mul(liquidityPrecentage).div(100).sub(feeRaisedToken);

        await customPresale.connect(owner).finalize();

        const pairAddress = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
        const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
        const summitswapPair = SummitswapPair.attach(pairAddress);

        const reserves = await summitswapPair.getReserves();

        assert.equal(reserves[0].eq(amountBNBAdded) || reserves[1].eq(amountBNBAdded), true);
        assert.equal(reserves[0].eq(tokensForLiquidity) || reserves[1].eq(tokensForLiquidity), true);
      });

      it("should reserves be equal to amount of liquidity added if liquidity added with native coin", async () => {
        const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
        const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
        const tokenAmount = presaleTokenAmount + tokensForLiquidity;
        raisedToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
        customPresale = (await deployContract(owner, CustomPresaleArtifact, [
          [
            owner.address,
            presaleToken.address,
            summitRouter.address,
            raisedToken.address,
            raisedToken.address, // raisedTokenAddress == pairTokenAddress
            otherOwner.address,
          ],
          [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
        ])) as SummitCustomPresale;
        await presaleToken
          .connect(owner)
          .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));

        const bigMaxBuy = parseEther(maxBuy);
        await raisedToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);
        await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

        const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
          .mul(FEE_PRESALE_TOKEN)
          .div(FEE_DENOMINATOR);
        const liquidityTokensAdded = parseEther(
          ((Number(liquidityPrecentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
        ).sub(feePresaleToken);

        const feeRaisedToken = parseEther(maxBuy).mul(FEE_RAISED_TOKEN).div(FEE_DENOMINATOR);
        const raisedTokenAdded = bigMaxBuy.mul(liquidityPrecentage).div(100).sub(feeRaisedToken);

        await customPresale.connect(owner).finalize();

        const pairAddress = await summitFactory.getPair(presaleToken.address, raisedToken.address);
        const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
        const summitswapPair = SummitswapPair.attach(pairAddress);

        const reserves = await summitswapPair.getReserves();

        assert.equal(reserves[0].eq(raisedTokenAdded) || reserves[1].eq(raisedTokenAdded), true);
        assert.equal(reserves[0].eq(liquidityTokensAdded) || reserves[1].eq(liquidityTokensAdded), true);
      });
    });
  });

  describe("withdrawCancelledTokens()", () => {
    it("should be reverted, if cancelled tokens already withdrawn", async () => {
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(owner).withdrawCancelledTokens();
      await expect(customPresale.connect(owner).withdrawCancelledTokens()).to.be.revertedWith(
        "Cancelled Tokens Already Withdrawn"
      );
    });

    it("should be reverted, if set with otherWallet1", async () => {
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).withdrawCancelledTokens()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be reverted, if presale not cancelled", async () => {
      await expect(customPresale.connect(owner).withdrawCancelledTokens()).to.be.revertedWith("Presale Not Cancelled");
    });

    it("should be reverted, if contract does not have tokens", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [owner.address, presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        1,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(owner).withdrawCancelledTokens()).to.be.revertedWith(
        "You do not have Any Tokens to Withdraw"
      );
    });

    it("should be equal increase in owner token Amount and contract balance", async () => {
      const initialBalance = await presaleToken.balanceOf(owner.address);
      const initialPresaleBalance = await presaleToken.balanceOf(customPresale.address);
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(owner).withdrawCancelledTokens();
      const finalBalance = await presaleToken.balanceOf(owner.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), initialPresaleBalance.toString());
    });

    it("should be equal to zero, presale token Amount", async () => {
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(owner).withdrawCancelledTokens();
      const presaleBalance = await presaleToken.balanceOf(customPresale.address);
      assert.equal("0", presaleBalance.toString());
    });
  });

  describe("setFee()", () => {
    it("should be reverted, if set with otherOwner", async () => {
      await expect(
        customPresale.connect(otherOwner).setFee(FEE_RAISED_TOKEN, FEE_PRESALE_TOKEN, EMERGENCY_WITHDRAW_FEE)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should set fees to new fess", async () => {
      const newFeeRaisedToken = BigNumber.from(FEE_RAISED_TOKEN).add("1");
      const newFeePresaleToken = BigNumber.from(FEE_PRESALE_TOKEN).add("1");
      const newEmergencyWithdrawFee = BigNumber.from(EMERGENCY_WITHDRAW_FEE).add("1");

      await customPresale.connect(owner).setFee(newFeeRaisedToken, newFeePresaleToken, newEmergencyWithdrawFee);

      const feeInfo = await customPresale.getFeeInfo();

      assert.equal(newFeeRaisedToken.toString(), feeInfo.feeRaisedToken.toString());
      assert.equal(newFeePresaleToken.toString(), feeInfo.feePresaleToken.toString());
      assert.equal(newEmergencyWithdrawFee.toString(), feeInfo.emergencyWithdrawFee.toString());
    });
  });

  describe("enablewhitelist()", () => {
    it("should set whitelist phase to true", async () => {
      await customPresale.connect(owner).toggleWhitelistPhase();
      const whitelistPhase = (await customPresale.getPresaleInfo()).isWhiteListPhase;
      assert.equal(whitelistPhase, true);
    });

    it("should be reverted, if set with otherOwner", async () => {
      await expect(customPresale.connect(otherOwner).toggleWhitelistPhase()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("cancelPresale()", () => {
    it("should cancel presale", async () => {
      await customPresale.connect(owner).cancelPresale();
      const isPresaleCancelled = (await customPresale.getPresaleInfo()).isPresaleCancelled;
      assert.equal(isPresaleCancelled, true);
    });

    it("should be reverted, if set with otherOwner", async () => {
      await expect(customPresale.connect(otherOwner).cancelPresale()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setServiceFeeReceiver()", () => {
    it("should set serviceFee receiver to otherWallet1", async () => {
      await customPresale.connect(owner).setServiceFeeReceiver(otherWallet1.address);
      const feeReceiverAddress = await customPresale.serviceFeeReceiver();
      assert.equal(feeReceiverAddress, otherWallet1.address);
    });

    it("should be reverted, if set with otherWallet1", async () => {
      await expect(customPresale.connect(otherWallet1).setServiceFeeReceiver(otherWallet1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("withdrawBNBOwner()", () => {
    beforeEach(async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
    });
    it("should send BNB to otherWallet2", async () => {
      const initialBalance = await provider.getBalance(otherWallet2.address);
      await customPresale.connect(owner).withdrawBNBOwner(parseEther(maxBuy), otherWallet2.address);
      const finalBalance = await provider.getBalance(otherWallet2.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), parseEther(maxBuy).toString());
    });

    it("should be reverted, if set with otherWallet", async () => {
      await expect(
        customPresale.connect(otherOwner).withdrawBNBOwner(parseEther(maxBuy), otherWallet2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("withdrawRaisedTokenOwner()", () => {
    const bigMaxBuy = parseEther(maxBuy);
    let raisedToken: DummyToken;
    beforeEach(async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = (Number(liquidityPrecentage) * Number(hardCap) * Number(listingPrice)) / 100;
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      raisedToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [
          owner.address,
          presaleToken.address,
          summitRouter.address,
          raisedToken.address,
          ZERO_ADDRESS,
          otherOwner.address,
        ],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));

      await raisedToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);
    });
    it("should send raised Token to otherWallet2", async () => {
      const initialBalance = await raisedToken.balanceOf(otherWallet2.address);
      await customPresale.connect(owner).withdrawRaisedTokenOwner(parseEther(maxBuy), otherWallet2.address);
      const finalBalance = await raisedToken.balanceOf(otherWallet2.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), parseEther(maxBuy).toString());
    });

    it("should be reverted, if set with otherWallet", async () => {
      await expect(
        customPresale.connect(otherOwner).withdrawRaisedTokenOwner(parseEther(maxBuy), otherWallet2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
