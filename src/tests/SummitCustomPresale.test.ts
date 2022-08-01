/* eslint-disable node/no-unsupported-features/es-syntax */
import CustomPresaleArtifact from "@built-contracts/SummitCustomPresale.sol/SummitCustomPresale.json";
import PresaleFactoryArtifact from "@built-contracts/SummitFactoryPresale.sol/SummitFactoryPresale.json";
import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitStandardTokenArtifact from "@built-contracts/tokens/SummitStandardToken.sol/StandardToken.json";
import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import {
  DummyToken,
  SummitswapFactory,
  SummitFactoryPresale,
  SummitCustomPresale,
  SummitswapRouter02,
  StandardToken,
  WBNB,
} from "build/typechain";
import {
  PresaleInfoStructOutput,
  PresaleFeeInfoStructOutput,
  PresaleFeeInfoStruct,
  PresaleInfoStruct,
} from "build/typechain/SummitCustomPresale";
import { assert, expect } from "chai";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { BigNumber, Wallet } from "ethers";
import { parseEther, formatUnits, parseUnits } from "ethers/lib/utils";
import timeMachine from "ganache-time-traveler";
import { ethers, waffle } from "hardhat";
import { BURN_ADDRESS, MAX_VALUE, ZERO_ADDRESS } from "src/environment";

const { deployContract, provider } = waffle;
dayjs.extend(utc);

describe("SummitCustomPresale", () => {
  const [owner, otherOwner, otherWallet1, otherWallet2, summitFactoryFeeToSetter, serviceFeeReceiver, admin] =
    provider.getWallets();

  let wbnb: WBNB;
  let paymentToken: DummyToken | StandardToken;
  let presaleToken: DummyToken | StandardToken;
  let summitFactory: SummitswapFactory;
  let presaleFactory: SummitFactoryPresale;
  let summitRouter: SummitswapRouter02;
  let customPresale: SummitCustomPresale;
  let customPresaleLibrary: SummitCustomPresale;

  const createPresaleFee = parseEther("0.00010");
  const FEE_DENOMINATOR = 10 ** 9;
  const FEE_PAYMENT_TOKEN = 50000000; // 5%
  const FEE_PRESALE_TOKEN = 20000000; // 2%
  const FEE_EMERGENCY_WITHDRAW = 100000000; // 10%

  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuy = "0.1";
  const maxBuy = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPercentage = 70;
  const maxClaimPercentage = 100;
  const startPresaleTime = dayjs().add(30, "minutes").unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const dayClaimInterval = 15;
  const hourClaimInterval = 16;
  const refundType = 0;
  const listingChoice = 0;
  const isWhiteListPhase = false;
  const isVestingEnabled = false;
  const isClaimPhase = false;
  const isPresaleCancelled = false;
  const isWithdrawCancelledTokens = false;

  const projectDetails = ["icon_Url", "Name", "Contact", "Position", "Telegram Id", "Discord Id", "Email", "Twitter"];

  const presaleInfo: PresaleInfoStruct = {
    presaleToken: ZERO_ADDRESS,
    router0: ZERO_ADDRESS,
    router1: ZERO_ADDRESS,
    pairToken: ZERO_ADDRESS,
    presalePrice: parseEther(presalePrice),
    listingPrice: parseEther(listingPrice),
    liquidityLockTime,
    minBuy: parseEther(minBuy),
    maxBuy: parseEther(maxBuy),
    softCap: parseEther(softCap),
    hardCap: parseEther(hardCap),
    liquidityPercentage: (liquidityPercentage * FEE_DENOMINATOR) / 100,
    startPresaleTime,
    endPresaleTime,
    claimIntervalDay: dayClaimInterval,
    claimIntervalHour: hourClaimInterval,
    totalBought: "0",
    maxClaimPercentage: (maxClaimPercentage * FEE_DENOMINATOR) / 100,
    refundType,
    listingChoice,
    isWhiteListPhase,
    isClaimPhase: false,
    isPresaleCancelled: false,
    isWithdrawCancelledTokens: false,
    isVestingEnabled,
    isApproved: false,
  };

  const feeInfo: PresaleFeeInfoStruct = {
    paymentToken: ZERO_ADDRESS,
    feePaymentToken: FEE_PAYMENT_TOKEN,
    feePresaleToken: FEE_PRESALE_TOKEN,
    feeEmergencyWithdraw: FEE_EMERGENCY_WITHDRAW,
  };

  const calculateTokenAmount = (
    presalePrice: number,
    hardCap: number,
    liquidityPercentage: number,
    listingPrice: number,
    excessTokens: number
  ) => {
    const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
    const tokensForLiquidity = Number(liquidityPercentage / 100) * Number(hardCap) * Number(listingPrice);
    const tokenAmount = presaleTokenAmount + tokensForLiquidity + excessTokens;
    return tokenAmount;
  };

  const createPresale = async ({
    _caller,
    _paymentToken,
    _pancakeRouterAddress,
    _pairToken,
    _presalePrice,
    _listingPrice,
    _liquidityPercentage,
    _maxClaimPercentage,
    _minBuy,
    _maxBuy,
    _softCap,
    _hardCap,
    _startPresaleTime,
    _endPresaleTime,
    _dayClaimInterval,
    _hourClaimInterval,
    _liquidityLockTime,
    _refundType,
    _listingChoice,
    _isWhiteListPhase,
    _isVestingEnabled,
    _createPresaleFee,
    _excessTokens,
  }: {
    _caller?: Wallet;
    _paymentToken?: string;
    _pancakeRouterAddress?: string;
    _pairToken?: string;
    _presalePrice?: string;
    _listingPrice?: string;
    _liquidityPercentage?: number;
    _maxClaimPercentage?: number;
    _minBuy?: string;
    _maxBuy?: string;
    _softCap?: string;
    _hardCap?: string;
    _startPresaleTime?: number;
    _endPresaleTime?: number;
    _dayClaimInterval?: number;
    _hourClaimInterval?: number;
    _liquidityLockTime?: number;
    _refundType?: number;
    _listingChoice?: number;
    _excessTokens?: number;
    _isWhiteListPhase?: boolean;
    _isVestingEnabled?: boolean;
    _createPresaleFee?: string;
  }) => {
    const _tokenAmount = calculateTokenAmount(
      Number(_presalePrice || presalePrice),
      Number(_hardCap || hardCap),
      Number(_liquidityPercentage || liquidityPercentage),
      Number(_listingPrice || listingPrice),
      Number(_excessTokens || 0)
    );
    return presaleFactory.connect(_caller || owner).createPresale(
      projectDetails,
      {
        presaleToken: presaleToken.address,
        router0: summitRouter.address,
        router1: _pancakeRouterAddress || summitRouter.address,
        pairToken: _pairToken || ZERO_ADDRESS,
        presalePrice: parseEther(_presalePrice || presalePrice),
        listingPrice: parseEther(_listingPrice || listingPrice),
        liquidityLockTime: _liquidityLockTime || liquidityLockTime,
        minBuy: parseEther(_minBuy || minBuy),
        maxBuy: parseEther(_maxBuy || maxBuy),
        softCap: parseEther(_softCap || softCap),
        hardCap: parseEther(_hardCap || hardCap),
        liquidityPercentage: ((_liquidityPercentage || liquidityPercentage) * FEE_DENOMINATOR) / 100,
        startPresaleTime: _startPresaleTime || startPresaleTime,
        endPresaleTime: _endPresaleTime || endPresaleTime,
        claimIntervalDay: _dayClaimInterval || dayClaimInterval,
        claimIntervalHour: _hourClaimInterval || hourClaimInterval,
        totalBought: "0",
        maxClaimPercentage: ((_maxClaimPercentage || maxClaimPercentage) * FEE_DENOMINATOR) / 100,
        refundType: _refundType || refundType,
        listingChoice: _listingChoice || listingChoice,
        isWhiteListPhase: _isWhiteListPhase || isWhiteListPhase,
        isClaimPhase: false,
        isPresaleCancelled: false,
        isWithdrawCancelledTokens: false,
        isVestingEnabled: _isVestingEnabled || isVestingEnabled,
        isApproved: false,
      } as PresaleInfoStruct,
      {
        paymentToken: _paymentToken || ZERO_ADDRESS,
        feePaymentToken: FEE_PAYMENT_TOKEN,
        feePresaleToken: FEE_PRESALE_TOKEN,
        feeEmergencyWithdraw: FEE_EMERGENCY_WITHDRAW,
      } as PresaleFeeInfoStruct,
      parseUnits(_tokenAmount.toString(), await presaleToken.decimals()),
      {
        value: _createPresaleFee || createPresaleFee,
        gasLimit: 30000000,
      }
    );
  };

  beforeEach(async () => {
    presaleFactory = (await deployContract(owner, PresaleFactoryArtifact, [
      createPresaleFee,
      serviceFeeReceiver.address,
      admin.address,
    ])) as SummitFactoryPresale;
    customPresaleLibrary = (await deployContract(owner, CustomPresaleArtifact)) as SummitCustomPresale;
    await presaleFactory.connect(owner).setLibraryAddress(customPresaleLibrary.address);
    wbnb = (await deployContract(owner, WbnbArtifact, [])) as WBNB;
    summitFactory = (await deployContract(owner, SummitFactoryArtifact, [
      summitFactoryFeeToSetter.address,
    ])) as SummitswapFactory;
    summitRouter = (await deployContract(owner, SummitRouterArtifact, [
      summitFactory.address,
      wbnb.address,
    ])) as SummitswapRouter02;

    presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
    await presaleToken.approve(presaleFactory.address, MAX_VALUE);
    await createPresale({});
    const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
    const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
    customPresale = SummitCustomPresale.attach(tokenPresale[0]);
    await presaleFactory.connect(admin).approvePresale(customPresale.address);
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

  describe("getProjectsDetails", () => {
    it("should be projectDetails", async () => {
      const _projectDetails = await customPresale.getProjectsDetails();
      _projectDetails.forEach((detail, i) => {
        assert.equal(detail, projectDetails[i]);
      });
    });
  });

  describe("getFeeInfo()", () => {
    let feeInfo: PresaleFeeInfoStructOutput;

    beforeEach(async () => {
      feeInfo = await customPresale.getFeeInfo();
    });

    it("should be feeEmergencyWithdraw", () => {
      const feeEmergencyWithdraw = feeInfo.feeEmergencyWithdraw;
      assert.equal(FEE_EMERGENCY_WITHDRAW.toString(), feeEmergencyWithdraw.toString());
    });

    it("should be FEE_PAYMENT_TOKEN", () => {
      const feePaymentToken = feeInfo.feePaymentToken;
      assert.equal(feePaymentToken.toString(), FEE_PAYMENT_TOKEN.toString());
    });

    it("should be FEE_PRESALE_TOKEN", () => {
      const feePresaleToken = feeInfo.feePresaleToken;
      assert.equal(feePresaleToken.toString(), FEE_PRESALE_TOKEN.toString());
    });

    it("should be ZeroAddress", () => {
      const tokenAddress = feeInfo.paymentToken;
      assert.equal(ZERO_ADDRESS, tokenAddress);
    });

    it("should be paymentToken address", async () => {
      paymentToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);

      await createPresale({ _paymentToken: paymentToken.address });

      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);
      feeInfo = await customPresale.getFeeInfo();
      const tokenAddress = feeInfo.paymentToken;
      assert.equal(paymentToken.address, tokenAddress);
    });
  });

  describe("getPresaleInfo()", () => {
    let presaleInfo: PresaleInfoStructOutput;
    beforeEach(async () => {
      presaleInfo = await customPresale.getPresaleInfo();
    });
    it("should be presaleToken", () => {
      const tokenAddress = presaleInfo.presaleToken;
      assert.equal(tokenAddress, presaleToken.address);
    });
    it("should be router0", () => {
      const routerAddresss = presaleInfo.router0;
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
      const liquidity = BigNumber.from(liquidityPercentage).mul(FEE_DENOMINATOR).div(100);
      assert.equal(liquidity.toString(), presaleInfo.liquidityPercentage.toString());
    });
    it("should be startPresaleTime", () => {
      assert.equal(startPresaleTime.toString(), presaleInfo.startPresaleTime.toString());
    });
    it("should be endPresaleTime", () => {
      assert.equal(endPresaleTime.toString(), presaleInfo.endPresaleTime.toString());
    });
    it("should be claimIntervalDay", () => {
      assert.equal(dayClaimInterval.toString(), presaleInfo.claimIntervalDay.toString());
    });
    it("should be claimIntervalHour", () => {
      assert.equal(hourClaimInterval.toString(), presaleInfo.claimIntervalHour.toString());
    });
    it("should be totalBought", () => {
      assert.equal((0).toString(), presaleInfo.totalBought.toString());
    });
    it("should be maxClaimPercentage", () => {
      assert.equal(
        BigNumber.from(maxClaimPercentage).mul(FEE_DENOMINATOR).div(100).toString(),
        presaleInfo.maxClaimPercentage.toString()
      );
    });
    it("should be refundType", () => {
      assert.equal(refundType, presaleInfo.refundType);
    });
    it("should be listingChoice", () => {
      assert.equal(listingChoice, presaleInfo.listingChoice);
    });
    it("should be isWhiteListPhase", () => {
      assert.equal(isWhiteListPhase, presaleInfo.isWhiteListPhase);
    });
    it("should be isVestingEnabled", () => {
      assert.equal(isVestingEnabled, presaleInfo.isVestingEnabled);
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

    it("should return Tokens when paymentToken decimals less than presaleToken decimals", async () => {
      const tokenDecimal = 6;
      paymentToken = (await deployContract(owner, SummitStandardTokenArtifact, [
        "standardToken",
        "STD",
        tokenDecimal,
        parseUnits("1000000", tokenDecimal),
        owner.address,
      ])) as StandardToken;

      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);

      await createPresale({ _paymentToken: paymentToken.address, _pairToken: paymentToken.address });

      const bigListingPrice = parseEther(listingPrice);
      const bigHardCap = parseUnits(hardCap.toString(), await paymentToken.decimals());

      const tAmount = await customPresale.calculateBnbToPresaleToken(bigHardCap, bigListingPrice);
      assert.equal(tAmount.toString(), formatUnits(bigHardCap.mul(bigListingPrice), 18).split(".")[0]);
    });

    it("should return Tokens when paymentToken decimals more than presaleToken decimals", async () => {
      const tokenDecimal = 21;
      paymentToken = (await deployContract(owner, SummitStandardTokenArtifact, [
        "standardToken",
        "STD",
        tokenDecimal,
        parseUnits("1000000", tokenDecimal),
        owner.address,
      ])) as StandardToken;

      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);

      await createPresale({ _paymentToken: paymentToken.address, _pairToken: paymentToken.address });

      const bigListingPrice = parseEther(listingPrice);
      const bigHardCap = parseUnits(hardCap.toString(), await paymentToken.decimals());

      const tAmount = await customPresale.calculateBnbToPresaleToken(bigHardCap, bigListingPrice);
      assert.equal(tAmount.toString(), formatUnits(bigHardCap.mul(bigListingPrice), 18).split(".")[0]);
    });

    it("should return Tokens when presaleToken decimals less than paymentToken decimals", async () => {
      const tokenDecimal = 6;
      presaleToken = (await deployContract(owner, SummitStandardTokenArtifact, [
        "standardToken",
        "STD",
        tokenDecimal,
        parseUnits("1000000", tokenDecimal),
        owner.address,
      ])) as StandardToken;

      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});

      const bigListingPrice = parseEther(listingPrice);
      const bigHardCap = parseEther(hardCap);

      const tAmount = await customPresale.calculateBnbToPresaleToken(bigHardCap, bigListingPrice);
      assert.equal(tAmount.toString(), formatUnits(bigHardCap.mul(bigListingPrice), 18).split(".")[0]);
    });

    it("should return Tokens when presaleToken decimals more than paymentToken decimals", async () => {
      const tokenDecimal = 21;
      presaleToken = (await deployContract(owner, SummitStandardTokenArtifact, [
        "standardToken",
        "STD",
        tokenDecimal,
        parseUnits("1000000", tokenDecimal),
        owner.address,
      ])) as StandardToken;

      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});

      const bigListingPrice = parseEther(listingPrice);
      const bigHardCap = parseEther(hardCap);

      const tAmount = await customPresale.calculateBnbToPresaleToken(bigHardCap, bigListingPrice);
      assert.equal(tAmount.toString(), formatUnits(bigHardCap.mul(bigListingPrice), 18).split(".")[0]);
    });
  });

  describe("buy()", () => {
    let snapshotId: any;
    beforeEach(async () => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
    });
    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if presale not started", async () => {
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy),
        })
      ).to.be.revertedWith("Presale Not started Yet");
    });

    it("should be reverted, if presale ended", async () => {
      const nextIntervalTimestamp = dayjs().add(5, "days").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy),
        })
      ).to.be.revertedWith("Presale Ended");
    });

    it("should be reverted, if claim phase", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

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

    it("should be reverted, if buyBnbAmount greater than hardCap", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(hardCap).add("1"),
        })
      ).to.be.revertedWith("Cannot buy more than HardCap amount");
    });

    it("should be reverted, if buyBnbAmount less than minBuy", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(minBuy).sub("1"),
        })
      ).to.be.revertedWith("Cannot buy less than minBuy");
    });

    it("should be reverted, if buyBnbAmount greater than maxBuy", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);

      await createPresale({ _softCap: "0.2", _hardCap: "0.4" });

      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuy).add("1"),
        })
      ).to.be.revertedWith("Cannot buy more than maxBuy");
    });

    it("should be equal buyAmount and boughtAmount", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      const boughtAmount = (await customPresale.bought(otherWallet1.address)).toString();
      assert.equal(bigMaxBuy.toString(), boughtAmount);
    });

    it("should be equal totalBoughtAmount and accounts bought amount", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const bigMinBuy = parseEther(minBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuy,
      });
      await customPresale.connect(otherWallet2).buy({
        value: bigMinBuy,
      });
      const boughtAmount = (await customPresale.getPresaleInfo()).totalBought.toString();
      assert.equal(boughtAmount, bigMinBuy.add(bigMinBuy).toString());
    });

    it("should be same, the contributor and otherWallet1", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const bigMinBuy = parseEther(minBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuy,
      });
      const contributors = await customPresale.getContributors();
      assert.equal(contributors[0], otherWallet1.address);
    });

    it("should be same, the contributors length and buyers", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

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
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

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

    describe("whitelist", () => {
      it("should be reverted, if whitelistphase and address not whitelisted", async () => {
        await customPresale.connect(owner).toggleWhitelistPhase();

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        await expect(
          customPresale.connect(otherWallet2).buy({
            value: parseEther(minBuy),
          })
        ).to.be.revertedWith("Address not Whitelisted");
      });

      it("should be able to buy if address whitelisted", async () => {
        await customPresale.connect(owner).toggleWhitelistPhase();
        await customPresale.connect(owner).addWhiteList([otherWallet1.address, otherWallet2.address]);

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        const bigMinBuy = parseEther(minBuy);
        await customPresale.connect(otherWallet1).buy({
          value: bigMinBuy,
        });
        await customPresale.connect(otherWallet2).buy({
          value: bigMinBuy,
        });
        const contributors = await customPresale.getContributors();

        const boughtAmount1 = (await customPresale.bought(otherWallet1.address)).toString();
        const boughtAmount2 = (await customPresale.bought(otherWallet2.address)).toString();
        const totalBought = (await customPresale.getPresaleInfo()).totalBought.toString();

        assert.equal(bigMinBuy.add(bigMinBuy).toString(), totalBought);
        assert.equal(bigMinBuy.toString(), boughtAmount1);
        assert.equal(bigMinBuy.toString(), boughtAmount2);
        assert.equal(contributors[0], otherWallet1.address);
        assert.equal(contributors[1], otherWallet2.address);
        assert.equal(contributors.length, 2);
      });
    });
  });

  describe("buyCustomCurrency()", () => {
    let paymentToken: DummyToken;
    let snapshotId: any;

    beforeEach(async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      paymentToken = (await deployContract(otherWallet2, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);

      // pairToken (liquidity will be added with payment token)
      await createPresale({ _pairToken: paymentToken.address, _paymentToken: paymentToken.address });

      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      await paymentToken.connect(otherWallet2).approve(customPresale.address, MAX_VALUE);
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
    });

    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if presale not started", async () => {
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Presale Not started Yet"
      );
    });

    it("should be reverted, if presale ended", async () => {
      const nextIntervalTimestamp = dayjs().add(3, "months").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Presale Ended"
      );
    });

    it("should be reverted, if claim phase", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy));
      await customPresale.connect(owner).finalize();

      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Claim Phase has started"
      );
    });

    it("should be reverted, if payment token is native coin", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);

      await createPresale({});

      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy))).to.be.revertedWith(
        "Payment token is native coin"
      );
    });

    it("should be reverted, if buy bought more than hardcap amount", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());
      await expect(customPresale.connect(owner).buyCustomCurrency(parseEther(hardCap).add("1"))).to.be.revertedWith(
        "Cannot buy more than HardCap amount"
      );
    });

    it("should be reverted, if contributionAmount less than minBuy", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());
      await expect(
        customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(minBuy).sub("1"))
      ).to.be.revertedWith("contributionAmount is less than minBuy");
    });

    it("should be reverted, if contributionAmount greater than maxBuy", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);

      await createPresale({ _softCap: "0.2", _hardCap: "0.4", _paymentToken: paymentToken.address });

      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      await paymentToken.connect(otherWallet2).approve(customPresale.address, MAX_VALUE);
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());
      await expect(
        customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy).add("1"))
      ).to.be.revertedWith("contributionAmount is more than maxBuy");
    });

    it("should be reverted, if allowance less than contributionAmount", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await paymentToken.connect(otherWallet2).approve(customPresale.address, parseEther(minBuy).sub("1"));
      await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(minBuy))).to.be.revertedWith(
        "Increase allowance to contribute"
      );
    });

    it("should be equal contributedAmount and boughtAmount", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const balance0 = await paymentToken.balanceOf(otherWallet2.address);
      await customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(maxBuy));
      const balance1 = await paymentToken.balanceOf(otherWallet2.address);

      const boughtAmount = await customPresale.bought(otherWallet2.address);
      assert.equal(balance0.sub(balance1).toString(), boughtAmount.toString());
      assert.equal(parseEther(maxBuy).toString(), boughtAmount.toString());
    });

    it("should be equal totalBoughtAmount and accounts bought amount", async () => {
      const bigMinBuy = parseEther(minBuy);
      await paymentToken.connect(otherWallet2).transfer(otherWallet1.address, bigMinBuy);
      await paymentToken.connect(otherWallet2).approve(customPresale.address, bigMinBuy);
      await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMinBuy);

      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet2).buyCustomCurrency(bigMinBuy);
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMinBuy);

      const totalBought = (await customPresale.getPresaleInfo()).totalBought.toString();
      assert.equal(totalBought, bigMinBuy.add(bigMinBuy).toString());
    });

    it("should be same, the contributors", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const bigMinBuy = parseEther(minBuy);
      await paymentToken.connect(otherWallet2).transfer(otherWallet1.address, bigMinBuy);
      await paymentToken.connect(otherWallet2).approve(customPresale.address, bigMinBuy);
      await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMinBuy);

      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMinBuy);
      await customPresale.connect(otherWallet2).buyCustomCurrency(bigMinBuy);

      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 2);
      assert.equal(contributors[0], otherWallet1.address);
      assert.equal(contributors[1], otherWallet2.address);
    });

    it("should be same, the contributors length and otherWallet1 buying multiple times", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const bigMinBuy = parseEther(minBuy);
      await customPresale.connect(otherWallet2).buyCustomCurrency(bigMinBuy);
      await customPresale.connect(otherWallet2).buyCustomCurrency(bigMinBuy);

      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 1);
    });

    describe("whitelist", () => {
      it("should be reverted, if whitelistphase and address not whitelisted", async () => {
        await customPresale.connect(owner).toggleWhitelistPhase();

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        await expect(customPresale.connect(otherWallet2).buyCustomCurrency(parseEther(minBuy))).to.be.revertedWith(
          "Address not Whitelisted"
        );
      });

      it("should be able to contribute if address whitelisted", async () => {
        await customPresale.connect(owner).toggleWhitelistPhase();
        await customPresale.connect(owner).addWhiteList([otherWallet1.address, otherWallet2.address]);

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        const bigMinBuy = parseEther(minBuy);

        await paymentToken.connect(otherWallet2).transfer(otherWallet1.address, bigMinBuy);
        await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMinBuy);

        await customPresale.connect(otherWallet1).buyCustomCurrency(bigMinBuy);
        await customPresale.connect(otherWallet2).buyCustomCurrency(bigMinBuy);
        const contributors = await customPresale.getContributors();

        const boughtAmount1 = (await customPresale.bought(otherWallet1.address)).toString();
        const boughtAmount2 = (await customPresale.bought(otherWallet2.address)).toString();
        const totalBought = (await customPresale.getPresaleInfo()).totalBought.toString();

        assert.equal(bigMinBuy.add(bigMinBuy).toString(), totalBought);
        assert.equal(bigMinBuy.toString(), boughtAmount1);
        assert.equal(bigMinBuy.toString(), boughtAmount2);
        assert.equal(contributors.length, 2);
        assert.equal(contributors[0], otherWallet1.address);
        assert.equal(contributors[1], otherWallet2.address);
      });
    });
  });

  describe("claim()", () => {
    let snapshotId: any;
    beforeEach(async () => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
    });

    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if presale cancelled", async () => {
      const claimAmount = await customPresale.getAvailableTokenToClaim(otherWallet1.address);
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).claim(claimAmount)).to.be.revertedWith("Presale Cancelled");
    });

    it("should be reverted, if not claim phase", async () => {
      const claimAmount = await customPresale.getAvailableTokenToClaim(otherWallet1.address);
      await expect(customPresale.connect(otherWallet1).claim(claimAmount)).to.be.revertedWith("Not Claim Phase");
    });

    it("should be reverted, if user don't have any token to claim", async () => {
      await customPresale.connect(owner).finalize();
      await expect(customPresale.connect(otherWallet2).claim("1")).to.be.revertedWith(
        "You do not have any tokens to claim"
      );
    });

    it("should be reverted, if tokens already claimed", async () => {
      await customPresale.connect(owner).finalize();
      const claimAmount = await customPresale.getAvailableTokenToClaim(otherWallet1.address);
      await customPresale.connect(otherWallet1).claim(claimAmount);
      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User don't have enough token to claim"
      );
    });

    it("should be equal boughtAmount and transferred Amount", async () => {
      await customPresale.connect(owner).finalize();
      const claimAmount = await customPresale.getAvailableTokenToClaim(otherWallet1.address);
      const tokenAmountTransfer = parseEther(maxBuy).mul(presalePrice);
      await customPresale.connect(otherWallet1).claim(claimAmount);

      const tokenBalance = await presaleToken.balanceOf(otherWallet1.address);
      assert.equal(tokenAmountTransfer.toString(), claimAmount.toString());
      assert.equal(claimAmount.toString(), tokenBalance.toString());
    });

    it("should be equal totalClaimToken, transferred Amount and claim Amount", async () => {
      await customPresale.connect(owner).finalize();
      const claimAmount = await customPresale.getAvailableTokenToClaim(otherWallet1.address);
      const tokenAmountTransfer = parseEther(maxBuy).mul(presalePrice);
      await customPresale.connect(otherWallet1).claim(claimAmount);

      const tokenBalance = await presaleToken.balanceOf(otherWallet1.address);
      assert.equal(claimAmount.toString(), tokenAmountTransfer.toString());
      assert.equal(claimAmount.toString(), tokenBalance.toString());
      assert.equal(claimAmount.toString(), (await customPresale.totalClaimToken(otherWallet1.address)).toString());
    });
  });

  describe("claim() with vesting enabled", () => {
    const maxClaimPercentage = 10;
    const enableVesting = true;
    let snapshotId: any;

    beforeEach(async () => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;

      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      await createPresale({ _isVestingEnabled: enableVesting, _maxClaimPercentage: maxClaimPercentage });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);
    });

    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should have 0 availableTokenToClaim, if claim phase not started", async () => {
      const presaleInfo = await customPresale.getPresaleInfo();
      assert.equal(presaleInfo.isClaimPhase, false);
      const availableTokens = await customPresale.getAvailableTokenToClaim(otherWallet1.address);
      assert.equal(availableTokens.toString(), "0");
    });

    it("should be 0 startClaimDate, if claim phase not started", async () => {
      const presaleInfo = await customPresale.getPresaleInfo();
      assert.equal(presaleInfo.isClaimPhase, false);
      const startDateClaim = await customPresale.startDateClaim();
      assert.equal(startDateClaim.toString(), "0");
    });

    it("should be reverted if claim more than maxClaim in this interval", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      await customPresale.connect(owner).finalize();
      const bigMaxClaimPercentage = (maxClaimPercentage * FEE_DENOMINATOR) / 100;
      const totalPurchaseInToken = parseEther(maxBuy).mul(presalePrice);

      const maxClaimInInterval = totalPurchaseInToken.mul(bigMaxClaimPercentage).div(FEE_DENOMINATOR.toString());
      await expect(customPresale.connect(otherWallet1).claim(maxClaimInInterval.add(1).toString())).to.be.revertedWith(
        "User claim more than max claim amount in this interval"
      );

      let currentAccountToken = await presaleToken.balanceOf(otherWallet1.address);

      const tenPercentOfMaxClaim = maxClaimInInterval.mul(10).div(100);
      await customPresale.connect(otherWallet1).claim(tenPercentOfMaxClaim.toString());
      assert.equal(
        currentAccountToken.add(tenPercentOfMaxClaim.toString()).toString(),
        (await presaleToken.balanceOf(otherWallet1.address)).toString()
      );

      const ninetyPercentOfMaxClaim = maxClaimInInterval.mul(90).div(100);
      currentAccountToken = await presaleToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).claim(ninetyPercentOfMaxClaim.toString());
      assert.equal(
        currentAccountToken.add(ninetyPercentOfMaxClaim.toString()).toString(),
        (await presaleToken.balanceOf(otherWallet1.address)).toString()
      );

      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User claim more than max claim amount in this interval"
      );
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be able to claim {maxClaim} Token in the second interval", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      await customPresale.connect(owner).finalize();
      const bigMaxClaimPercentage = (maxClaimPercentage * FEE_DENOMINATOR) / 100;
      const totalPurchaseInToken = parseEther(maxBuy).mul(presalePrice);

      const maxClaimInInterval = totalPurchaseInToken.mul(bigMaxClaimPercentage).div(FEE_DENOMINATOR.toString());
      assert.equal(
        (await customPresale.getAvailableTokenToClaim(otherWallet1.address)).toString(),
        maxClaimInInterval.toString()
      );
      let currentAccountToken = await presaleToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).claim(maxClaimInInterval.toString());
      assert.equal(
        currentAccountToken.add(maxClaimInInterval.toString()).toString(),
        (await presaleToken.balanceOf(otherWallet1.address)).toString()
      );

      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User claim more than max claim amount in this interval"
      );

      let nextIntervalTimestamp;
      if (
        dayjs().date() > dayClaimInterval ||
        (dayjs().date() === dayClaimInterval && dayjs().hour() >= hourClaimInterval)
      ) {
        nextIntervalTimestamp = dayjs
          .utc()
          .date(dayClaimInterval)
          .hour(hourClaimInterval)
          .second(0)
          .add(1, "month")
          .unix();
      } else {
        nextIntervalTimestamp = dayjs.utc().date(dayClaimInterval).hour(hourClaimInterval).second(0).unix();
      }
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      currentAccountToken = await presaleToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).claim(maxClaimInInterval.toString());
      assert.equal(
        currentAccountToken.add(maxClaimInInterval.toString()).toString(),
        (await presaleToken.balanceOf(otherWallet1.address)).toString()
      );

      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User claim more than max claim amount in this interval"
      );
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be able to claim 1 x {maxClaim} for the first interval and 2 * {maxCLaim} after 2 interval", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      await customPresale.connect(owner).finalize();
      const bigMaxClaimPercentage = (maxClaimPercentage * FEE_DENOMINATOR) / 100;
      const totalPurchaseInToken = parseEther(maxBuy).mul(presalePrice);
      const maxClaimInInterval = totalPurchaseInToken.mul(bigMaxClaimPercentage).div(FEE_DENOMINATOR.toString());

      let currentAccountToken = await presaleToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).claim(maxClaimInInterval.toString());
      assert.equal(
        currentAccountToken.add(maxClaimInInterval.toString()).toString(),
        (await presaleToken.balanceOf(otherWallet1.address)).toString()
      );

      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User claim more than max claim amount in this interval"
      );

      let nextTwoIntervalTimestamp;
      if (
        dayjs().date() > dayClaimInterval ||
        (dayjs().date() === dayClaimInterval && dayjs().hour() >= hourClaimInterval)
      ) {
        nextTwoIntervalTimestamp = dayjs
          .utc()
          .date(dayClaimInterval)
          .hour(hourClaimInterval)
          .second(0)
          .add(2, "month")
          .unix();
      } else {
        nextTwoIntervalTimestamp = dayjs
          .utc()
          .date(dayClaimInterval)
          .hour(hourClaimInterval)
          .second(0)
          .add(1, "month")
          .unix();
      }
      await timeMachine.advanceTimeAndBlock(nextTwoIntervalTimestamp - dayjs().unix());

      currentAccountToken = await presaleToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).claim(maxClaimInInterval.mul(2).toString());
      assert.equal(
        currentAccountToken.add(maxClaimInInterval.mul(2).toString()).toString(),
        (await presaleToken.balanceOf(otherWallet1.address)).toString()
      );

      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User claim more than max claim amount in this interval"
      );
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be able to claim all token after 10 interval", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      await customPresale.connect(owner).finalize();
      const bigMaxClaimPercentage = (maxClaimPercentage * FEE_DENOMINATOR) / 100;
      const totalPurchaseInToken = parseEther(maxBuy).mul(presalePrice);
      const maxClaimInInterval = totalPurchaseInToken.mul(bigMaxClaimPercentage).div(FEE_DENOMINATOR.toString());

      const nextIntervalTimestamp = dayjs
        .utc()
        .date(dayClaimInterval)
        .hour(hourClaimInterval)
        .second(0)
        .add(9, "month")
        .unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const currentAccountToken = await presaleToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).claim(maxClaimInInterval.mul(10).toString());
      assert.equal(
        currentAccountToken.add(maxClaimInInterval.mul(10).toString()).toString(),
        (await presaleToken.balanceOf(otherWallet1.address)).toString()
      );

      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User don't have enough token to claim"
      );

      const nextTwoIntervalTimestamp = dayjs
        .utc()
        .date(dayClaimInterval)
        .hour(hourClaimInterval)
        .second(0)
        .add(2, "month")
        .unix();
      await timeMachine.advanceTimeAndBlock(nextTwoIntervalTimestamp - dayjs().unix());

      await expect(customPresale.connect(otherWallet1).claim("1")).to.be.revertedWith(
        "User don't have enough token to claim"
      );
      await timeMachine.revertToSnapshot(snapshotId);
    });
  });

  describe("withdrawPaymentToken()", () => {
    it("should be reverted, if presale not cancelled", async () => {
      const snapshot = await timeMachine.takeSnapshot();
      const snapshotId = snapshot.result;
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      await expect(customPresale.connect(otherWallet1).withdrawPaymentToken()).to.be.revertedWith(
        "Presale Not Cancelled"
      );
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if tokens not bought", async () => {
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).withdrawPaymentToken()).to.be.revertedWith(
        "You do not have any contributions"
      );
    });

    it("should be equal withdrawal BNB amount and Buy BNB amount", async () => {
      const snapshot = await timeMachine.takeSnapshot();
      const snapshotId = snapshot.result;
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });

      const initialBalance = await provider.getBalance(otherWallet1.address);
      const initialBoughtAmount = await customPresale.bought(otherWallet1.address);
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawPaymentToken();
      const finalBoughtAmount = await customPresale.bought(otherWallet1.address);
      const finalBalance = await provider.getBalance(otherWallet1.address);

      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuy).toString());
      assert.equal(finalBoughtAmount.toString(), "0");
      assert.equal(finalBalance.gt(initialBalance), true);
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be equal withdrawal token amount and contribution amount if payment token not native coin", async () => {
      paymentToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);

      await createPresale({ _paymentToken: paymentToken.address });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      const snapshot = await timeMachine.takeSnapshot();
      const snapshotId = snapshot.result;
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());

      await paymentToken.connect(owner).approve(customPresale.address, parseEther(minBuy));
      await customPresale.connect(owner).buyCustomCurrency(parseEther(minBuy));

      const paymentTokenBalance0 = await paymentToken.balanceOf(owner.address);
      const initialBoughtAmount = await customPresale.bought(owner.address);

      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(owner).withdrawPaymentToken();

      const paymentTokenBalance1 = await paymentToken.balanceOf(owner.address);
      const finalBoughtAmount = await customPresale.bought(owner.address);

      assert.equal(paymentTokenBalance1.sub(paymentTokenBalance0).toString(), parseEther(minBuy).toString());
      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuy).toString());
      assert.equal(finalBoughtAmount.toString(), "0");
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be equal change in total bought and withdrawal amount", async () => {
      const snapshot = await timeMachine.takeSnapshot();
      const snapshotId = snapshot.result;
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(otherWallet2).buy({
        value: parseEther(minBuy),
      });
      const initialTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawPaymentToken();
      const finalTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      assert.equal(initialTotalBought.sub(finalTotalBought).toString(), parseEther(minBuy).toString());
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be remove from contributors after withdrawPaymentToken", async () => {
      const snapshot = await timeMachine.takeSnapshot();
      const snapshotId = snapshot.result;
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      const length0 = (await customPresale.getContributors()).length;
      assert.equal(length0.toString(), "1");
      await customPresale.connect(owner).cancelPresale();

      await customPresale.connect(otherWallet1).withdrawPaymentToken();
      const length1 = (await customPresale.getContributors()).length;
      assert.equal(length1.toString(), "0");
      await timeMachine.revertToSnapshot(snapshotId);
    });
  });

  describe("emergencyWithdrawPaymentToken()", () => {
    let snapshotId: any;
    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });
    beforeEach(async () => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
    });

    it("should be reverted, if presale not started", async () => {
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken()).to.be.revertedWith(
        "Presale Not started Yet"
      );
    });

    it("should be reverted, if presale has ended", async () => {
      const nextIntervalTimestamp = dayjs().add(5, "months").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken()).to.be.revertedWith(
        "Presale Ended"
      );
    });

    it("should be reverted, if tokens not bought", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken()).to.be.revertedWith(
        "You do not have any contributions"
      );
    });

    it("should be reverted, if presale is cancelled", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken()).to.be.revertedWith(
        "Presale has been cancelled"
      );
    });

    it("should be reverted, if is claim phase", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      await customPresale.connect(owner).finalize();
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken()).to.be.revertedWith(
        "Presale claim phase"
      );
    });

    it("should send 10% BNB to service fee address if bought with BNB", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        parseUnits(minBuy).mul(FEE_EMERGENCY_WITHDRAW).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send 10% paymentToken to service fee address if bought with paymentToken", async () => {
      paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      await createPresale({ _paymentToken: paymentToken.address });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      await paymentToken.connect(otherWallet1).approve(customPresale.address, MAX_VALUE);
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buyCustomCurrency(parseEther(minBuy));

      const initialBalance = await paymentToken.balanceOf(serviceFeeReceiver.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
      const finalBalance = await paymentToken.balanceOf(serviceFeeReceiver.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        parseUnits(minBuy).mul(FEE_EMERGENCY_WITHDRAW).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should be equal withdrawal BNB amount and Buy BNB amount ", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      const initialBoughtAmount = await customPresale.bought(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
      const finalBoughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuy).toString());
    });

    it("should be equal bougth paymentToken amount and withdrawal amount if payment token not native coin", async () => {
      paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      await createPresale({ _paymentToken: paymentToken.address });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      await paymentToken.connect(otherWallet1).approve(customPresale.address, MAX_VALUE);
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buyCustomCurrency(parseEther(minBuy));

      const balance0 = await paymentToken.balanceOf(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
      const balance1 = await paymentToken.balanceOf(otherWallet1.address);

      assert.equal(
        balance1.sub(balance0).add(parseUnits(minBuy).mul(FEE_EMERGENCY_WITHDRAW).div(FEE_DENOMINATOR)).toString(),
        parseEther(minBuy).toString()
      );
    });

    it("should be 0 bought amount after emergencyWithdrawPaymentToken", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
      const boughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(boughtAmount.toString(), "0");
    });

    it("should be equal change in total bought and withdrawal amount", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await customPresale.connect(otherWallet2).buy({
        value: parseEther(minBuy),
      });
      const initialTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
      const finalTotalBought = (await customPresale.getPresaleInfo()).totalBought;
      assert.equal(initialTotalBought.sub(finalTotalBought).toString(), parseEther(minBuy).toString());
    });

    it("should be greater balance after emergencyWithdrawPaymentToken", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      const initialBalance = await provider.getBalance(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
      const finalBalance = await provider.getBalance(otherWallet1.address);
      assert.equal(finalBalance.gt(initialBalance), true);
    });

    it("should be remove from contributors after emergencyWithdrawPaymentToken", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      const length0 = (await customPresale.getContributors()).length;
      assert.equal(length0.toString(), "1");
      await customPresale.connect(otherWallet1).emergencyWithdrawPaymentToken();
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
    let snapshotId: any;
    beforeEach(async () => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
    });

    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if set with otherWallet1", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });
      await expect(customPresale.connect(otherWallet1).finalize()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be reverted, if is not end presale time && hardcap !== totalBought", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuy),
      });
      await expect(customPresale.connect(owner).finalize()).to.be.revertedWith("Presale Not Ended");
    });

    it("should be reverted, if is not end presale time && hardcap !== totalBought", async () => {
      const nextIntervalTimestamp = dayjs().add(5, "days").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await expect(customPresale.connect(owner).finalize()).to.be.revertedWith(
        "Total bought is less than softCap. Presale failed"
      );
    });

    it("should send FEE_PAYMENT_TOKEN to servicefeeReceiver if payment token BNB", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      const bigMaxBuy = parseEther(maxBuy);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuy.mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send FEE_PAYMENT_TOKEN to servicefeeReceiver if payment token not BNB", async () => {
      paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);

      await createPresale({ _pairToken: paymentToken.address, _paymentToken: paymentToken.address });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      const bigMaxBuy = parseEther(maxBuy);
      await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

      const initialBalance = await paymentToken.balanceOf(serviceFeeReceiver.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await paymentToken.balanceOf(serviceFeeReceiver.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuy.mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send FEE_PRESALE_TOKEN to servicefeeReceiver", async () => {
      const bigMaxBuy = parseEther(maxBuy);
      const nextIntervalTimestamp = dayjs().add(25, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      const initialBalance = await presaleToken.balanceOf(serviceFeeReceiver.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await presaleToken.balanceOf(serviceFeeReceiver.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuy.mul(presalePrice).mul(FEE_PRESALE_TOKEN).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should start claim phase", async () => {
      const bigMaxBuy = parseEther(maxBuy);
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuy,
      });
      await customPresale.connect(owner).finalize();
      const presaleInfo = await customPresale.getPresaleInfo();
      assert.equal(presaleInfo.isClaimPhase, true);
    });

    it("should refund remaining tokens for refundType 0", async () => {
      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

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
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      await createPresale({ _refundType: 1, _excessTokens: excessTokens });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
      await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

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
      it("should reserves be equal to amount of liquidity added, if liquidity added with BNB and payment token is BNB", async () => {
        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        const bigMaxBuy = parseEther(maxBuy);
        await customPresale.connect(otherWallet1).buy({
          value: bigMaxBuy,
        });

        const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
          .mul(FEE_PRESALE_TOKEN)
          .div(FEE_DENOMINATOR);
        const tokensForLiquidity = parseEther(
          ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
        ).sub(feePresaleToken);

        const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
        const amountBNBAdded = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

        await customPresale.connect(owner).finalize();

        const pairAddress = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
        const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
        const summitswapPair = SummitswapPair.attach(pairAddress);

        const reserves = await summitswapPair.getReserves();

        assert.equal(reserves[0].eq(amountBNBAdded) || reserves[1].eq(amountBNBAdded), true);
        assert.equal(reserves[0].eq(tokensForLiquidity) || reserves[1].eq(tokensForLiquidity), true);
        assert.equal((await summitswapPair.balanceOf(customPresale.address)).gt("0"), true);
      });

      it("should reserves be equal to amount of liquidity added, if liquidity added with pairToken and payment token is BNB", async () => {
        const pairToken = (await deployContract(otherWallet2, TokenArtifact, [])) as DummyToken;
        const addLiquidityBNBAmount = parseEther("80");
        await pairToken.connect(otherWallet2).approve(summitRouter.address, addLiquidityBNBAmount.mul(10));
        await summitRouter
          .connect(otherWallet2)
          .addLiquidityETH(
            pairToken.address,
            addLiquidityBNBAmount.mul(10),
            0,
            0,
            otherWallet2.address,
            dayjs().add(10000, "seconds").unix(),
            {
              value: addLiquidityBNBAmount,
            }
          );

        presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
        await presaleToken.approve(presaleFactory.address, MAX_VALUE);
        await createPresale({ _pairToken: pairToken.address });

        const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
        const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
        customPresale = SummitCustomPresale.attach(tokenPresale[0]);
        await presaleFactory.connect(admin).approvePresale(customPresale.address);

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        const bigMaxBuy = parseEther(maxBuy);
        await customPresale.connect(otherWallet1).buy({
          value: bigMaxBuy,
        });

        const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
          .mul(FEE_PRESALE_TOKEN)
          .div(FEE_DENOMINATOR);
        const presaleTokenForLiquidity = parseEther(
          ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
        ).sub(feePresaleToken);

        const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
        const amountBNBRaised = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

        const amountOut = await summitRouter.getAmountsOut(amountBNBRaised, [
          await summitRouter.WETH(),
          pairToken.address,
        ]);
        await customPresale.connect(owner).finalize();

        const pairAddress = await summitFactory.getPair(presaleToken.address, pairToken.address);
        const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
        const summitswapPair = SummitswapPair.attach(pairAddress);

        const reserves = await summitswapPair.getReserves();

        assert.equal(reserves[0].eq(amountOut[1]) || reserves[1].eq(amountOut[1]), true);
        assert.equal(reserves[0].eq(presaleTokenForLiquidity) || reserves[1].eq(presaleTokenForLiquidity), true);
        assert.equal((await summitswapPair.balanceOf(customPresale.address)).gt("0"), true);
      });

      it("should reserves be equal to amount of liquidity added, if liquidity added with paymentToken and pairToken is paymentToken", async () => {
        paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
        presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
        await presaleToken.approve(presaleFactory.address, MAX_VALUE);
        // pairToken == paymentToken
        await createPresale({ _pairToken: paymentToken.address, _paymentToken: paymentToken.address });

        const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
        const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
        customPresale = SummitCustomPresale.attach(tokenPresale[0]);
        await presaleFactory.connect(admin).approvePresale(customPresale.address);

        const bigMaxBuy = parseEther(maxBuy);
        await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

        const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
          .mul(FEE_PRESALE_TOKEN)
          .div(FEE_DENOMINATOR);
        const liquidityTokensAdded = parseEther(
          ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
        ).sub(feePresaleToken);

        const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
        const paymentTokenAdded = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

        await customPresale.connect(owner).finalize();

        const pairAddress = await summitFactory.getPair(presaleToken.address, paymentToken.address);
        const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
        const summitswapPair = SummitswapPair.attach(pairAddress);

        const reserves = await summitswapPair.getReserves();

        assert.equal(reserves[0].eq(paymentTokenAdded) || reserves[1].eq(paymentTokenAdded), true);
        assert.equal(reserves[0].eq(liquidityTokensAdded) || reserves[1].eq(liquidityTokensAdded), true);
      });

      it("should reserves be equal to amount of liquidity added, if liquidity added with BNB and paymentToken is not BNB", async () => {
        const addLiquidityBNBAmount = parseEther("80");
        paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
        await paymentToken.connect(otherWallet1).approve(summitRouter.address, addLiquidityBNBAmount);
        await summitRouter
          .connect(otherWallet1)
          .addLiquidityETH(
            paymentToken.address,
            addLiquidityBNBAmount,
            0,
            0,
            otherWallet1.address,
            dayjs().add(10000, "seconds").unix(),
            {
              value: addLiquidityBNBAmount,
            }
          );

        presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
        await presaleToken.approve(presaleFactory.address, MAX_VALUE);
        // pairToken == BNB
        await createPresale({ _pairToken: ZERO_ADDRESS, _paymentToken: paymentToken.address });

        const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
        const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
        customPresale = SummitCustomPresale.attach(tokenPresale[0]);
        await presaleFactory.connect(admin).approvePresale(customPresale.address);

        const bigMaxBuy = parseEther(maxBuy);
        await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

        const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
          .mul(FEE_PRESALE_TOKEN)
          .div(FEE_DENOMINATOR);
        const presaleTokenForLiquidity = parseEther(
          ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
        ).sub(feePresaleToken);

        const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
        const amountBNBRaised = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

        const amountOut = await summitRouter.getAmountsOut(amountBNBRaised, [
          paymentToken.address,
          await summitRouter.WETH(),
        ]);

        await customPresale.connect(owner).finalize();

        const pairAddress = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
        const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
        const summitswapPair = SummitswapPair.attach(pairAddress);

        const reserves = await summitswapPair.getReserves();

        assert.equal(reserves[0].eq(amountOut[1]) || reserves[1].eq(amountOut[1]), true);
        assert.equal(reserves[0].eq(presaleTokenForLiquidity) || reserves[1].eq(presaleTokenForLiquidity), true);
      });

      it("should reserves be equal to amount of liquidity added, if liquidity added with pairToken and paymentToken is not pairToken", async () => {
        const addLiquidityBNBAmount = parseEther("80");
        paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
        await paymentToken.connect(otherWallet1).approve(summitRouter.address, addLiquidityBNBAmount);
        await summitRouter
          .connect(otherWallet1)
          .addLiquidityETH(
            paymentToken.address,
            addLiquidityBNBAmount,
            0,
            0,
            otherWallet1.address,
            dayjs().add(10000, "seconds").unix(),
            {
              value: addLiquidityBNBAmount,
            }
          );

        const pairToken = (await deployContract(otherWallet2, TokenArtifact, [])) as DummyToken;
        await pairToken.connect(otherWallet2).approve(summitRouter.address, addLiquidityBNBAmount);
        await summitRouter
          .connect(otherWallet2)
          .addLiquidityETH(
            pairToken.address,
            addLiquidityBNBAmount,
            0,
            0,
            otherWallet2.address,
            dayjs().add(10000, "seconds").unix(),
            {
              value: addLiquidityBNBAmount,
            }
          );

        presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
        await presaleToken.approve(presaleFactory.address, MAX_VALUE);
        await createPresale({ _pairToken: pairToken.address, _paymentToken: paymentToken.address });

        const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
        const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
        customPresale = SummitCustomPresale.attach(tokenPresale[0]);
        await presaleFactory.connect(admin).approvePresale(customPresale.address);

        const bigMaxBuy = parseEther(maxBuy);
        await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);

        const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
        await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

        await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

        const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
          .mul(FEE_PRESALE_TOKEN)
          .div(FEE_DENOMINATOR);
        const presaleTokenForLiquidity = parseEther(
          ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
        ).sub(feePresaleToken);

        const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
        const amountBNBRaised = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

        const amountOut = await summitRouter.getAmountsOut(amountBNBRaised, [
          paymentToken.address,
          await summitRouter.WETH(),
          pairToken.address,
        ]);

        await customPresale.connect(owner).finalize();

        const pairAddress = await summitFactory.getPair(presaleToken.address, pairToken.address);
        const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
        const summitswapPair = SummitswapPair.attach(pairAddress);

        const reserves = await summitswapPair.getReserves();

        assert.equal(reserves[0].eq(amountOut[2]) || reserves[1].eq(amountOut[2]), true);
        assert.equal(reserves[0].eq(presaleTokenForLiquidity) || reserves[1].eq(presaleTokenForLiquidity), true);
      });
      describe("listingChoice", () => {
        let pancakeFactory: SummitswapFactory;
        let pancakeRouter: SummitswapRouter02;
        beforeEach(async () => {
          pancakeFactory = (await deployContract(owner, SummitFactoryArtifact, [
            summitFactoryFeeToSetter.address,
          ])) as SummitswapFactory;
          pancakeRouter = (await deployContract(owner, SummitRouterArtifact, [
            pancakeFactory.address,
            wbnb.address,
          ])) as SummitswapRouter02;
        });

        it("should reserves be equal in both routers if listingChoice 0", async () => {
          presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
          await presaleToken.approve(presaleFactory.address, MAX_VALUE);
          // 100% Summitswap router,
          await createPresale({ _pancakeRouterAddress: pancakeRouter.address, _listingChoice: 0 });

          const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
          const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
          customPresale = SummitCustomPresale.attach(tokenPresale[0]);
          await presaleFactory.connect(admin).approvePresale(customPresale.address);

          const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
          await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

          const bigMaxBuy = parseEther(maxBuy);
          await customPresale.connect(otherWallet1).buy({
            value: bigMaxBuy,
          });

          const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
            .mul(FEE_PRESALE_TOKEN)
            .div(FEE_DENOMINATOR);
          const tokensForLiquidity = parseEther(
            ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
          ).sub(feePresaleToken);

          const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
          const amountBNBAdded = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

          await customPresale.connect(owner).finalize();

          const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await pancakeRouter.WETH());
          assert.equal(pairAddressPancake, ZERO_ADDRESS);

          const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
          const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
          const summitswapPair = SummitswapPair.attach(pairAddressSummit);
          const reserves = await summitswapPair.getReserves();

          assert.equal(reserves[0].eq(amountBNBAdded) || reserves[1].eq(amountBNBAdded), true);
          assert.equal(reserves[0].eq(tokensForLiquidity) || reserves[1].eq(tokensForLiquidity), true);
        });

        it("should reserves be equal in both routers if listingChoice 1", async () => {
          presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
          await presaleToken.approve(presaleFactory.address, MAX_VALUE);
          // 100% Pankcakeswap router,
          await createPresale({ _pancakeRouterAddress: pancakeRouter.address, _listingChoice: 1 });

          const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
          const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
          customPresale = SummitCustomPresale.attach(tokenPresale[0]);
          await presaleFactory.connect(admin).approvePresale(customPresale.address);

          const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
          await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

          const bigMaxBuy = parseEther(maxBuy);
          await customPresale.connect(otherWallet1).buy({
            value: bigMaxBuy,
          });

          const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
            .mul(FEE_PRESALE_TOKEN)
            .div(FEE_DENOMINATOR);
          const tokensForLiquidity = parseEther(
            ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
          ).sub(feePresaleToken);

          const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
          const amountBNBAdded = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

          await customPresale.connect(owner).finalize();

          const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
          assert.equal(pairAddressSummit, ZERO_ADDRESS);

          const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await pancakeRouter.WETH());
          const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
          const pancakeswapPair = SummitswapPair.attach(pairAddressPancake);
          const reserves = await pancakeswapPair.getReserves();

          assert.equal(reserves[0].eq(amountBNBAdded) || reserves[1].eq(amountBNBAdded), true);
          assert.equal(reserves[0].eq(tokensForLiquidity) || reserves[1].eq(tokensForLiquidity), true);
        });

        it("should reserves be equal in both routers if listingChoice 2", async () => {
          presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
          await presaleToken.approve(presaleFactory.address, MAX_VALUE);
          //  75% Summitswap router & 25% Summitswap router
          await createPresale({ _pancakeRouterAddress: pancakeRouter.address, _listingChoice: 2 });

          const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
          const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
          customPresale = SummitCustomPresale.attach(tokenPresale[0]);
          await presaleFactory.connect(admin).approvePresale(customPresale.address);

          const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
          await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

          const bigMaxBuy = parseEther(maxBuy);
          await customPresale.connect(otherWallet1).buy({
            value: bigMaxBuy,
          });

          const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
            .mul(FEE_PRESALE_TOKEN)
            .div(FEE_DENOMINATOR);
          const tokensForLiquidity = parseEther(
            ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
          ).sub(feePresaleToken);

          const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
          const amountBNBAdded = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

          await customPresale.connect(owner).finalize();
          const SummitswapPair = await ethers.getContractFactory("SummitswapPair");

          const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
          const summitswapPair = SummitswapPair.attach(pairAddressSummit);
          const reservesSummit = await summitswapPair.getReserves();

          assert.equal(
            reservesSummit[0].eq(amountBNBAdded.mul(75).div(100)) ||
              reservesSummit[1].eq(amountBNBAdded.mul(75).div(100)),
            true
          );
          assert.equal(
            reservesSummit[0].eq(tokensForLiquidity.mul(75).div(100)) ||
              reservesSummit[1].eq(tokensForLiquidity.mul(75).div(100)),
            true
          );

          const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await pancakeRouter.WETH());
          const pancakeswapPair = SummitswapPair.attach(pairAddressPancake);
          const reservesPancake = await pancakeswapPair.getReserves();

          assert.equal(
            reservesPancake[0].eq(amountBNBAdded.mul(25).div(100)) ||
              reservesPancake[1].eq(amountBNBAdded.mul(25).div(100)),
            true
          );
          assert.equal(
            reservesPancake[0].eq(tokensForLiquidity.mul(25).div(100)) ||
              reservesPancake[1].eq(tokensForLiquidity.mul(25).div(100)),
            true
          );
        });

        it("should reserves be equal in both routers if listingChoice 3", async () => {
          presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
          await presaleToken.approve(presaleFactory.address, MAX_VALUE);
          //  25% Summitswap router & 75% Summitswap router
          await createPresale({ _pancakeRouterAddress: pancakeRouter.address, _listingChoice: 3 });

          const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
          const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
          customPresale = SummitCustomPresale.attach(tokenPresale[0]);
          await presaleFactory.connect(admin).approvePresale(customPresale.address);

          const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
          await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

          const bigMaxBuy = parseEther(maxBuy);
          await customPresale.connect(otherWallet1).buy({
            value: bigMaxBuy,
          });

          const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
            .mul(FEE_PRESALE_TOKEN)
            .div(FEE_DENOMINATOR);
          const tokensForLiquidity = parseEther(
            ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
          ).sub(feePresaleToken);

          const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
          const amountBNBAdded = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

          await customPresale.connect(owner).finalize();
          const SummitswapPair = await ethers.getContractFactory("SummitswapPair");

          const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
          const summitswapPair = SummitswapPair.attach(pairAddressSummit);
          const reservesSummit = await summitswapPair.getReserves();

          assert.equal(
            reservesSummit[0].eq(amountBNBAdded.mul(25).div(100)) ||
              reservesSummit[1].eq(amountBNBAdded.mul(25).div(100)),
            true
          );
          assert.equal(
            reservesSummit[0].eq(tokensForLiquidity.mul(25).div(100)) ||
              reservesSummit[1].eq(tokensForLiquidity.mul(25).div(100)),
            true
          );

          const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await pancakeRouter.WETH());
          const pancakeswapPair = SummitswapPair.attach(pairAddressPancake);
          const reservesPancake = await pancakeswapPair.getReserves();

          assert.equal(
            reservesPancake[0].eq(amountBNBAdded.mul(75).div(100)) ||
              reservesPancake[1].eq(amountBNBAdded.mul(75).div(100)),
            true
          );
          assert.equal(
            reservesPancake[0].eq(tokensForLiquidity.mul(75).div(100)) ||
              reservesPancake[1].eq(tokensForLiquidity.mul(75).div(100)),
            true
          );
        });

        it("should reserves be equal in both routers if listingChoice 3, if liquidity added with paymentToken", async () => {
          const paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
          presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
          await presaleToken.approve(presaleFactory.address, MAX_VALUE);
          //  25% Summitswap router & 75% Summitswap router
          await createPresale({
            _pairToken: paymentToken.address,
            _paymentToken: paymentToken.address,
            _pancakeRouterAddress: pancakeRouter.address,
            _listingChoice: 3,
          });

          const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
          const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
          customPresale = SummitCustomPresale.attach(tokenPresale[0]);
          await presaleFactory.connect(admin).approvePresale(customPresale.address);

          const nextIntervalTimestamp = dayjs().add(50, "minutes").unix();
          await timeMachine.advanceTimeAndBlock(nextIntervalTimestamp - dayjs().unix());

          const bigMaxBuy = parseEther(maxBuy);
          await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);

          await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

          const feePresaleToken = parseEther((Number(maxBuy) * Number(presalePrice)).toString())
            .mul(FEE_PRESALE_TOKEN)
            .div(FEE_DENOMINATOR);
          const tokensForLiquidity = parseEther(
            ((Number(liquidityPercentage) * Number(maxBuy) * Number(listingPrice)) / 100).toString()
          ).sub(feePresaleToken);

          const feePaymentToken = parseEther(maxBuy).mul(FEE_PAYMENT_TOKEN).div(FEE_DENOMINATOR);
          const amountBNBAdded = bigMaxBuy.mul(liquidityPercentage).div(100).sub(feePaymentToken);

          await customPresale.connect(owner).finalize();
          const SummitswapPair = await ethers.getContractFactory("SummitswapPair");

          const pairAddressSummit = await summitFactory.getPair(presaleToken.address, paymentToken.address);
          const summitswapPair = SummitswapPair.attach(pairAddressSummit);
          const reservesSummit = await summitswapPair.getReserves();

          assert.equal(
            reservesSummit[0].eq(amountBNBAdded.mul(25).div(100)) ||
              reservesSummit[1].eq(amountBNBAdded.mul(25).div(100)),
            true
          );
          assert.equal(
            reservesSummit[0].eq(tokensForLiquidity.mul(25).div(100)) ||
              reservesSummit[1].eq(tokensForLiquidity.mul(25).div(100)),
            true
          );

          const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, paymentToken.address);
          const pancakeswapPair = SummitswapPair.attach(pairAddressPancake);
          const reservesPancake = await pancakeswapPair.getReserves();

          assert.equal(
            reservesPancake[0].eq(amountBNBAdded.mul(75).div(100)) ||
              reservesPancake[1].eq(amountBNBAdded.mul(75).div(100)),
            true
          );
          assert.equal(
            reservesPancake[0].eq(tokensForLiquidity.mul(75).div(100)) ||
              reservesPancake[1].eq(tokensForLiquidity.mul(75).div(100)),
            true
          );
        });
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

  describe("updatePresaleAndApprove()", () => {
    beforeEach(async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});
    });

    it("should be reverted, if presale already approved", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await presaleFactory.connect(admin).approvePresale(tokenPresales[0]);

      assert.equal(await customPresale.isAdmin(admin.address), false);
      await presaleFactory.connect(owner).assignAdminsPresale([admin.address], customPresale.address);
      assert.equal(await customPresale.isAdmin(admin.address), true);

      await expect(
        customPresale
          .connect(admin)
          .updatePresaleAndApprove(
            { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
            feeInfo
          )
      ).to.be.revertedWith("Presale is approved");
    });

    it("should admin be only able to set updatePresaleAndApprove", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);

      await expect(
        customPresale.connect(otherWallet1).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            minBuy: parseEther(minBuy).add("1"),
            maxBuy: parseEther(maxBuy).add("1"),
            softCap: parseEther(softCap).add("1"),
          },
          feeInfo
        )
      ).to.be.revertedWith("Only admin or defaultAdmin can call this function");

      assert.equal(await customPresale.isAdmin(admin.address), false);
      assert.equal(await presaleFactory.isAdmin(admin.address), true);
      await presaleFactory.connect(owner).assignAdminsPresale([admin.address], customPresale.address);
      assert.equal(await customPresale.isAdmin(admin.address), true);

      assert.equal((await customPresale.getPresaleInfo()).isApproved, false);

      await customPresale.connect(admin).updatePresaleAndApprove(
        {
          ...presaleInfo,
          router0: summitRouter.address,
          presaleToken: presaleToken.address,
          minBuy: parseEther(minBuy).add("1"),
          maxBuy: parseEther(maxBuy).sub("1"),
          softCap: parseEther(softCap).add("1"),
          liquidityLockTime: liquidityLockTime + 1,
          maxClaimPercentage: ((maxClaimPercentage - 1) * FEE_DENOMINATOR) / 100,
          refundType: 1,
          listingChoice: 2,
          isWhiteListPhase: true,
          isVestingEnabled: true,
        },
        {
          ...feeInfo,
          feePresaleToken: (2 * FEE_DENOMINATOR) / 100,
          feePaymentToken: (4 * FEE_DENOMINATOR) / 100,
          feeEmergencyWithdraw: (1 * FEE_DENOMINATOR) / 100,
        },
        {
          gasLimit: 30000000,
        }
      );

      const updatedPresaleInfo = await customPresale.getPresaleInfo();
      const updatedfeeInfo = await customPresale.getFeeInfo();
      assert.equal(updatedPresaleInfo.isApproved, true);

      assert.equal(updatedPresaleInfo.minBuy.toString(), parseEther(minBuy).add("1").toString());
      assert.equal(updatedPresaleInfo.maxBuy.toString(), parseEther(maxBuy).sub("1").toString());
      assert.equal(updatedPresaleInfo.softCap.toString(), parseEther(softCap).add("1").toString());
      assert.equal(updatedPresaleInfo.liquidityLockTime.toString(), (liquidityLockTime + 1).toString());
      assert.equal(
        updatedPresaleInfo.maxClaimPercentage.toString(),
        (((maxClaimPercentage - 1) * FEE_DENOMINATOR) / 100).toString()
      );
      assert.equal(updatedPresaleInfo.refundType.toString(), "1");
      assert.equal(updatedPresaleInfo.listingChoice.toString(), "2");
      assert.equal(updatedPresaleInfo.isWhiteListPhase, true);
      assert.equal(updatedPresaleInfo.isVestingEnabled, true);
      assert.equal(updatedfeeInfo.feeEmergencyWithdraw.toString(), ((1 * FEE_DENOMINATOR) / 100).toString());
      assert.equal(updatedfeeInfo.feePresaleToken.toString(), ((2 * FEE_DENOMINATOR) / 100).toString());
      assert.equal(updatedfeeInfo.feePaymentToken.toString(), ((4 * FEE_DENOMINATOR) / 100).toString());
    });
  });

  describe("approvePresale()", () => {
    it("should ADMIN be able to approve presale", async () => {
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);

      assert.equal(await customPresale.isAdmin(otherWallet1.address), false);
      await expect(customPresale.connect(otherWallet1).approvePresale()).to.be.revertedWith(
        "Only admin or defaultAdmin can call this function"
      );

      assert.equal(await presaleFactory.isAdmin(admin.address), true);
      assert.equal(await customPresale.isAdmin(presaleFactory.address), true);

      assert.equal(await customPresale.isAdmin(admin.address), false);
      await presaleFactory.connect(owner).assignAdminsPresale([admin.address], customPresale.address);
      assert.equal(await customPresale.isAdmin(admin.address), true);

      assert.equal((await customPresale.getPresaleInfo()).isApproved, false);
      await customPresale.connect(admin).approvePresale();
      assert.equal((await customPresale.getPresaleInfo()).isApproved, true);
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
    it("should ADMIN only set serviceFee receiver to otherWallet1", async () => {
      assert.equal(await customPresale.isAdmin(otherWallet1.address), false);
      await expect(customPresale.connect(otherWallet1).setServiceFeeReceiver(otherWallet1.address)).to.be.revertedWith(
        "Only admin or defaultAdmin can call this function"
      );

      assert.equal(await presaleFactory.isAdmin(admin.address), true);
      assert.equal(await customPresale.isAdmin(presaleFactory.address), true);

      assert.equal(await customPresale.isAdmin(admin.address), false);
      await presaleFactory.connect(owner).assignAdminsPresale([admin.address], customPresale.address);
      assert.equal(await customPresale.isAdmin(admin.address), true);

      await customPresale.connect(admin).setServiceFeeReceiver(otherWallet1.address);

      const feeReceiverAddress = await customPresale.serviceFeeReceiver();
      assert.equal(feeReceiverAddress, otherWallet1.address);
    });
  });

  describe("withdrawBNBOwner()", () => {
    let snapshotId: any;
    beforeEach(async () => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
    });
    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if withdrawal with otherWallet", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());

      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
        gasLimit: 3000000,
      });
      await expect(
        customPresale.connect(otherOwner).withdrawBNBOwner(parseEther(maxBuy), otherWallet2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should be reverted, if not claim phase", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      await expect(
        customPresale.connect(owner).withdrawBNBOwner(parseEther(maxBuy), otherWallet2.address)
      ).to.be.revertedWith("Claim phase has not started");
    });

    it("should owner be able to withdraw BNB send BNB to otherWallet2", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuy),
      });

      await customPresale.connect(owner).finalize();
      const presaleBalance0 = await provider.getBalance(customPresale.address);
      const receiver0 = await provider.getBalance(otherWallet2.address);

      await customPresale.connect(owner).withdrawBNBOwner(presaleBalance0, otherWallet2.address);
      const presaleBalance1 = await provider.getBalance(customPresale.address);
      const receiver1 = await provider.getBalance(otherWallet2.address);

      assert.equal(presaleBalance1.toString(), "0");
      assert.equal(presaleBalance0.sub(presaleBalance1).toString(), receiver1.sub(receiver0).toString());
    });
  });

  describe("withdrawPaymentTokenOwner()", () => {
    const bigMaxBuy = parseEther(maxBuy);
    let paymentToken: DummyToken;
    let snapshotId: any;

    beforeEach(async () => {
      paymentToken = (await deployContract(otherWallet1, TokenArtifact, [])) as DummyToken;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      await createPresale({ _pairToken: paymentToken.address, _paymentToken: paymentToken.address });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      await paymentToken.connect(otherWallet1).approve(customPresale.address, bigMaxBuy);
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
    });
    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if withdrawal with otherWallet", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

      await expect(
        customPresale.connect(otherOwner).withdrawPaymentTokenOwner(parseEther(maxBuy), otherWallet2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should be reverted, if not claim phase", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

      await expect(
        customPresale.connect(owner).withdrawPaymentTokenOwner(parseEther(maxBuy), otherWallet2.address)
      ).to.be.revertedWith("Claim phase has not started");
    });

    it("should owner be able to withdraw paymentToken and send paymentToken to otherWallet2", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buyCustomCurrency(bigMaxBuy);

      await customPresale.connect(owner).finalize({});
      const presaleBalance0 = await paymentToken.balanceOf(customPresale.address);
      const receiver0 = await paymentToken.balanceOf(otherWallet2.address);

      await customPresale.connect(owner).withdrawPaymentTokenOwner(presaleBalance0, otherWallet2.address, {});

      const presaleBalance1 = await paymentToken.balanceOf(customPresale.address);
      const receiver1 = await paymentToken.balanceOf(otherWallet2.address);

      assert.equal(presaleBalance1.toString(), "0");
      assert.equal(presaleBalance0.sub(presaleBalance1).toString(), receiver1.sub(receiver0).toString());
    });
  });

  describe("withdrawLpTokens()", () => {
    const bigMaxBuy = parseEther(maxBuy);
    let pancakeFactory: SummitswapFactory;
    let pancakeRouter: SummitswapRouter02;
    let snapshotId: any;

    beforeEach(async () => {
      pancakeFactory = (await deployContract(owner, SummitFactoryArtifact, [
        summitFactoryFeeToSetter.address,
      ])) as SummitswapFactory;
      pancakeRouter = (await deployContract(owner, SummitRouterArtifact, [
        pancakeFactory.address,
        wbnb.address,
      ])) as SummitswapRouter02;

      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleToken.approve(presaleFactory.address, MAX_VALUE);
      // 75% Summitswap router & 25% Summitswap router
      await createPresale({
        _pancakeRouterAddress: pancakeRouter.address,
        _listingChoice: 2,
      });

      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresale[0]);
      await presaleFactory.connect(admin).approvePresale(customPresale.address);

      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot.result;
    });
    afterEach(async () => {
      await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should be reverted, if withdrawal with otherWallet", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({ value: bigMaxBuy });

      const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
      const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await summitRouter.WETH());

      await expect(
        customPresale
          .connect(otherOwner)
          .withdrawLpTokens([pairAddressSummit, pairAddressPancake], otherWallet1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should be reverted, if not claim phase", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({ value: bigMaxBuy });

      const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
      const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await summitRouter.WETH());

      await expect(
        customPresale.connect(owner).withdrawLpTokens([pairAddressSummit, pairAddressPancake], otherWallet1.address)
      ).to.be.revertedWith("Claim phase has not started");
    });

    it("should be reverted, if lp Tokens are locked", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({ value: bigMaxBuy });
      await customPresale.connect(owner).finalize();

      const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
      const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await summitRouter.WETH());

      await expect(
        customPresale.connect(owner).withdrawLpTokens([pairAddressSummit, pairAddressPancake], otherWallet1.address)
      ).to.be.revertedWith("Lp Tokens are locked");
    });

    it("should be reverted, if lpTokensAddress is paymentToken or presaleToken", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({ value: bigMaxBuy });

      const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
      const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await summitRouter.WETH());

      await customPresale.connect(owner).finalize();

      await timeMachine.advanceTimeAndBlock(dayjs().add(90, "minutes").unix() - dayjs().unix());

      await expect(
        customPresale.connect(owner).withdrawLpTokens([presaleToken.address, pairAddressPancake], otherWallet1.address)
      ).to.be.revertedWith("address is presale token");
      await expect(
        customPresale.connect(owner).withdrawLpTokens([pairAddressSummit, presaleToken.address], otherWallet1.address)
      ).to.be.revertedWith("address is presale token");
      await expect(
        customPresale.connect(owner).withdrawLpTokens([ZERO_ADDRESS, pairAddressPancake], otherWallet1.address)
      ).to.be.revertedWith("address is paymentToken");
      await expect(
        customPresale.connect(owner).withdrawLpTokens([pairAddressSummit, ZERO_ADDRESS], otherWallet1.address)
      ).to.be.revertedWith("address is paymentToken");
    });

    it("should owner be able to withdraw lpTokens and send lpTokens to otherWallet", async () => {
      await timeMachine.advanceTimeAndBlock(dayjs().add(50, "minutes").unix() - dayjs().unix());
      await customPresale.connect(otherWallet1).buy({ value: bigMaxBuy });

      await customPresale.connect(owner).finalize();

      await timeMachine.advanceTimeAndBlock(dayjs().add(90, "minutes").unix() - dayjs().unix());

      const pairAddressSummit = await summitFactory.getPair(presaleToken.address, await summitRouter.WETH());
      const pairAddressPancake = await pancakeFactory.getPair(presaleToken.address, await summitRouter.WETH());

      const SummitswapPair = await ethers.getContractFactory("SummitswapPair");

      const summitswapPair = SummitswapPair.attach(pairAddressSummit);
      const pancakeswapPair = SummitswapPair.attach(pairAddressPancake);

      const presaleBalanceSS0 = await summitswapPair.balanceOf(customPresale.address);
      const presaleBalancePS0 = await pancakeswapPair.balanceOf(customPresale.address);

      const balanceReceiverSS0 = await summitswapPair.balanceOf(otherWallet1.address);
      const balanceReceiverPS0 = await pancakeswapPair.balanceOf(otherWallet1.address);

      await customPresale
        .connect(owner)
        .withdrawLpTokens([pairAddressSummit, pairAddressPancake], otherWallet1.address);

      const presaleBalanceSS1 = await summitswapPair.balanceOf(customPresale.address);
      const presaleBalancePS1 = await pancakeswapPair.balanceOf(customPresale.address);

      const balanceReceiverSS1 = await summitswapPair.balanceOf(otherWallet1.address);
      const balanceReceiverPS1 = await pancakeswapPair.balanceOf(otherWallet1.address);

      assert.equal(presaleBalanceSS1.toString(), "0");
      assert.equal(presaleBalancePS1.toString(), "0");
      assert.equal(
        presaleBalanceSS0.sub(presaleBalanceSS1).toString(),
        balanceReceiverSS1.sub(balanceReceiverSS0).toString()
      );
      assert.equal(
        presaleBalancePS0.sub(presaleBalancePS1).toString(),
        balanceReceiverPS1.sub(balanceReceiverPS0).toString()
      );
    });
  });
  describe("assignAdmins()", () => {
    it("should defaultAdmin be only able to grant ADMIN role", async () => {
      await expect(
        presaleFactory.connect(otherWallet1).assignAdminsPresale([otherWallet1.address], customPresale.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      assert.equal(await customPresale.isAdmin(otherWallet1.address), false);
      assert.equal(await customPresale.defaultAdmin(presaleFactory.address), true);
      await presaleFactory.connect(owner).assignAdminsPresale([otherWallet1.address], customPresale.address);
      assert.equal(await customPresale.isAdmin(otherWallet1.address), true);
    });
  });

  describe("revokeAdmins()", () => {
    it("should defaultAdmin be only able to revoke ADMIN role", async () => {
      await expect(
        presaleFactory.connect(otherWallet1).revokeAdminsPresale([admin.address], customPresale.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await presaleFactory.connect(owner).assignAdminsPresale([otherWallet1.address], customPresale.address);

      assert.equal(await customPresale.isAdmin(otherWallet1.address), true);
      assert.equal(await customPresale.defaultAdmin(presaleFactory.address), true);
      await presaleFactory.connect(owner).revokeAdminsPresale([otherWallet1.address], customPresale.address);
      assert.equal(await customPresale.isAdmin(otherWallet1.address), false);
    });
  });
});
