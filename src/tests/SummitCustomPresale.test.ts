import { waffle } from "hardhat";
import { expect, assert } from "chai";
import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, parseUnits, formatUnits } from "ethers/lib/utils";
import CustomPresaleArtifact from "@built-contracts/SummitCustomPresale.sol/SummitCustomPresale.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import { DummyToken, SummitCustomPresale } from "build/typechain";
import { environment } from "src/environment";

const { deployContract, provider } = waffle;

describe("SummitFactoryPresale", () => {
  const [owner, otherOwner, otherWallet1, otherWallet2] = provider.getWallets();

  let presaleToken: DummyToken;
  let customPresale: SummitCustomPresale;

  const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  const FEE_DENOMINATOR = 10 ** 9;
  const BNB_FEE_TYPE_0 = 50000000; // 5%
  const BNB_FEE_TYPE_1 = 20000000; // 2 %
  const TOKEN_FEE_TYPE_1 = 20000000; // 2%
  const EMERGENCY_WITHDRAW_FEE = 100000000; // 10%

  const router = environment.SUMMITSWAP_ROUTER ?? "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B";
  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuyBnb = "0.1";
  const maxBuyBnb = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPrecentage = 70;
  const startPresaleTime = dayjs().unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const feeType = 0;
  const refundType = 0;
  const isWhiteListPhase = false;
  const isClaimPhase = false;
  const isPresaleCancelled = false;
  const isWithdrawCancelledTokens = false;

  beforeEach(async () => {
    const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
    const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
    const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
    const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
    presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
    customPresale = (await deployContract(owner, CustomPresaleArtifact, [
      [owner.address, presaleToken.address, router, otherOwner.address],
      [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
      [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
      liquidityLockTime,
      startPresaleTime,
      endPresaleTime,
      feeType,
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

  describe("getInfo()", () => {
    let presaleInfo: SummitCustomPresale.PresaleInfoStructOutput;
    beforeEach(async () => {
      presaleInfo = await customPresale.getInfo();
    });
    it("should be presaleToken", () => {
      const tokenAddress = presaleInfo.presaleToken;
      assert.equal(tokenAddress, presaleToken.address);
    });
    it("should be router", () => {
      const routerAddresss = presaleInfo.router;
      assert.equal(routerAddresss, router);
    });
    it("should be presalePrice", () => {
      const bigPresalePrice = parseEther(presalePrice);
      assert.equal(bigPresalePrice.toString(), presaleInfo.presalePrice.toString());
    });
    it("should be listingPrice", () => {
      const bigListingPrice = parseEther(listingPrice);
      assert.equal(bigListingPrice.toString(), presaleInfo.listingPrice.toString());
    });
    it("should be minBuyBnb", () => {
      const bigMinBuyBnb = parseEther(minBuyBnb);
      assert.equal(bigMinBuyBnb.toString(), presaleInfo.minBuyBnb.toString());
    });
    it("should be maxBuyBnb", () => {
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      assert.equal(bigMaxBuyBnb.toString(), presaleInfo.maxBuyBnb.toString());
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
    it("should be feeType", () => {
      assert.equal(feeType, presaleInfo.feeType);
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
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [otherWallet1.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        dayjs().add(1, "day").unix(),
        endPresaleTime,
        feeType,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuyBnb),
        })
      ).to.be.revertedWith("Presale Not started Yet");
    });

    it("should be reverted, if presale ended", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [otherWallet1.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        feeType,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuyBnb),
        })
      ).to.be.revertedWith("Presale Ended");
    });

    it("should be reverted, if claim phase", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
      await customPresale.connect(owner).finalize();
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuyBnb),
        })
      ).to.be.revertedWith("Claim Phase has started");
    });

    it("should be reverted, if whitelistphase and address not whitelisted", async () => {
      await customPresale.connect(owner).toggleWhitelistPhase();
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(minBuyBnb),
        })
      ).to.be.revertedWith("Address not Whitelisted");
    });

    it("should be reverted, if buyBnbAmount greater than maxBuybnb", async () => {
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuyBnb).add("1"),
        })
      ).to.be.revertedWith("Cannot buy more than HardCap amount");
    });

    it("should be reverted, if buyBnbAmount less than minBuyBnb", async () => {
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(minBuyBnb).sub("1"),
        })
      ).to.be.revertedWith("msg.value is less than minBuyBnb");
    });

    it("should be reverted, if buyBnbAmount greater than maxBuybnb", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [otherWallet1.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther("0.4")],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        feeType,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(
        customPresale.connect(otherWallet2).buy({
          value: parseEther(maxBuyBnb).add("1"),
        })
      ).to.be.revertedWith("msg.value is great than maxBuyBnb");
    });

    it("should be equal buyAmount and boughtAmount", async () => {
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      const otherWallet1BoughtAmount = (await customPresale.bought(otherWallet1.address)).toString();
      assert.equal(bigMaxBuyBnb.toString(), otherWallet1BoughtAmount);
    });

    it("should be equal totalBoughtAmount and accounts bought amount", async () => {
      const bigMinBuyBnb = parseEther(minBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuyBnb,
      });
      await customPresale.connect(otherWallet2).buy({
        value: bigMinBuyBnb,
      });
      const otherWallet1BoughtAmount = (await customPresale.getInfo()).totalBought.toString();
      assert.equal(otherWallet1BoughtAmount, bigMinBuyBnb.add(bigMinBuyBnb).toString());
    });

    it("should be same, the contributor and otherWallet1", async () => {
      const bigMinBuyBnb = parseEther(minBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuyBnb,
      });
      const contributors = await customPresale.getContributors();
      assert.equal(contributors[0], otherWallet1.address);
    });

    it("should be same, the contributors length and buyers", async () => {
      const bigMinBuyBnb = parseEther(minBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuyBnb,
      });
      await customPresale.connect(otherWallet2).buy({
        value: bigMinBuyBnb,
      });
      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 2);
    });

    it("should be same, the contributors length and otherWallet1 buying multiple times", async () => {
      const bigMinBuyBnb = parseEther(minBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuyBnb,
      });
      await customPresale.connect(otherWallet1).buy({
        value: bigMinBuyBnb,
      });
      const contributors = await customPresale.getContributors();
      assert.equal(contributors.length, 1);
    });
  });

  describe("claim()", () => {
    beforeEach(async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
    });
    it("should be reverted, if presale cancelled", async () => {
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).claim()).to.be.revertedWith("Presale Cancelled");
    });

    it("should be reverted, if not claim phase", async () => {
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [otherWallet1.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther("0.4")],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        feeType,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      await expect(customPresale.connect(otherWallet1).claim()).to.be.revertedWith("Claim hasn't started yet");
    });

    it("should be reverted, if tokens already claimed", async () => {
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

      const tokenAmountTransfer = parseEther(maxBuyBnb).mul(presalePrice).toString();
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

  describe("withdrawBNB()", () => {
    it("should be reverted, if presale not cancelled", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
      await expect(customPresale.connect(otherWallet1).withdrawBNB()).to.be.revertedWith("Presale Not Cancelled");
    });

    it("should be reverted, if tokens not bought", async () => {
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).withdrawBNB()).to.be.revertedWith(
        "You do not have any contributions"
      );
    });

    it("should be equal withdrawalBNB amount and BuyBNB amount ", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      const initialBoughtAmount = await customPresale.bought(otherWallet1.address);
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawBNB();
      const finalBoughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuyBnb).toString());
    });

    it("should be 0 bought amount after withdrawalBNB", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawBNB();
      const boughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(boughtAmount.toString(), "0");
    });

    it("should be equal change in total bought and withdrawal amount", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      await customPresale.connect(otherWallet2).buy({
        value: parseEther(minBuyBnb),
      });
      const initialTotalBought = (await customPresale.getInfo()).totalBought;
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawBNB();
      const finalTotalBought = (await customPresale.getInfo()).totalBought;
      assert.equal(initialTotalBought.sub(finalTotalBought).toString(), parseEther(minBuyBnb).toString());
    });

    it("should be greater balance after withdrawBNB", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
      const initialBalance = await provider.getBalance(otherWallet1.address);
      await customPresale.connect(owner).cancelPresale();
      await customPresale.connect(otherWallet1).withdrawBNB();
      const finalBalance = await provider.getBalance(otherWallet1.address);
      assert.equal(finalBalance.gt(initialBalance), true);
    });
  });

  describe("emergencyWithdrawBNB()", () => {
    it("should be reverted, if presale not started", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [otherWallet1.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        dayjs().add(1, "day").unix(),
        endPresaleTime,
        feeType,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawBNB()).to.be.revertedWith(
        "Presale Not started Yet"
      );
    });

    it("should be reverted, if presale has ended", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [otherWallet1.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        feeType,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawBNB()).to.be.revertedWith("Presale Ended");
    });

    it("should be reverted, if tokens not bought", async () => {
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawBNB()).to.be.revertedWith(
        "You do not have any contributions"
      );
    });

    it("should be reverted, if presale is cancelled", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      await customPresale.connect(owner).cancelPresale();
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawBNB()).to.be.revertedWith(
        "Presale has been cancelled"
      );
    });

    it("should be reverted, if is claim phase", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
      await customPresale.connect(owner).finalize();
      await expect(customPresale.connect(otherWallet1).emergencyWithdrawBNB()).to.be.revertedWith(
        "Presale claim phase"
      );
    });

    it("should send 10% to service fee address", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      const initialBalance = await provider.getBalance(otherOwner.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawBNB();
      const finalBalance = await provider.getBalance(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        parseUnits(minBuyBnb).mul(EMERGENCY_WITHDRAW_FEE).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should be equal withdrawalBNB amount and BuyBNB amount ", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      const initialBoughtAmount = await customPresale.bought(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawBNB();
      const finalBoughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(initialBoughtAmount.sub(finalBoughtAmount).toString(), parseEther(minBuyBnb).toString());
    });

    it("should be 0 bought amount after emergencyWithdrawBNB", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      await customPresale.connect(otherWallet1).emergencyWithdrawBNB();
      const boughtAmount = await customPresale.bought(otherWallet1.address);
      assert.equal(boughtAmount.toString(), "0");
    });

    it("should be equal change in total bought and withdrawal amount", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      await customPresale.connect(otherWallet2).buy({
        value: parseEther(minBuyBnb),
      });
      const initialTotalBought = (await customPresale.getInfo()).totalBought;
      await customPresale.connect(otherWallet1).emergencyWithdrawBNB();
      const finalTotalBought = (await customPresale.getInfo()).totalBought;
      assert.equal(initialTotalBought.sub(finalTotalBought).toString(), parseEther(minBuyBnb).toString());
    });

    it("should be greater balance after emergencyWithdrawBNB", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
      const initialBalance = await provider.getBalance(otherWallet1.address);
      await customPresale.connect(otherWallet1).emergencyWithdrawBNB();
      const finalBalance = await provider.getBalance(otherWallet1.address);
      assert.equal(finalBalance.gt(initialBalance), true);
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
        value: parseEther(maxBuyBnb),
      });
      await expect(customPresale.connect(otherWallet1).finalize()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be reverted, if is not end presale time && hardcap !== totalBought", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(minBuyBnb),
      });
      await expect(customPresale.connect(owner).finalize()).to.be.revertedWith("Presale Not Ended");
    });

    it("should be reverted, if is not end presale time && hardcap !== totalBought", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [owner.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        dayjs().unix(),
        feeType,
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

    it("should send 5% to servicefeeReceiver for feeType 0", async () => {
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      const initialBalance = await provider.getBalance(otherOwner.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await provider.getBalance(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuyBnb.mul(BNB_FEE_TYPE_0).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send 2% raised BNB to servicefeeReceiver for feeType 1", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [owner.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        1,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      const initialBalance = await provider.getBalance(otherOwner.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await provider.getBalance(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuyBnb.mul(BNB_FEE_TYPE_1).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should send 2% raised tokenAmount to servicefeeReceiver for feeType 1", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [owner.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        1,
        refundType,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      const initialBalance = await presaleToken.balanceOf(otherOwner.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await presaleToken.balanceOf(otherOwner.address);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        bigMaxBuyBnb.mul(presalePrice).mul(TOKEN_FEE_TYPE_1).div(FEE_DENOMINATOR).toString()
      );
    });

    it("should start claim phase", async () => {
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      await customPresale.connect(owner).finalize();
      const presaleInfo = await customPresale.getInfo();
      assert.equal(presaleInfo.isClaimPhase, true);
    });

    it("should start claim phase", async () => {
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      await customPresale.connect(owner).finalize();
      const presaleInfo = await customPresale.getInfo();
      assert.equal(presaleInfo.isClaimPhase, true);
    });

    it("should refund remaining tokens for refundType 0", async () => {
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      const initialBalance = await presaleToken.balanceOf(owner.address);
      const initialPresaleBalance = await presaleToken.balanceOf(customPresale.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await presaleToken.balanceOf(owner.address);

      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        initialPresaleBalance.sub(bigMaxBuyBnb.mul(presalePrice)).toString()
      );
    });

    it("should burn remaining tokens for refundType 1", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      customPresale = (await deployContract(owner, CustomPresaleArtifact, [
        [owner.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        feeType,
        1,
        isWhiteListPhase,
      ])) as SummitCustomPresale;
      await presaleToken
        .connect(owner)
        .transfer(customPresale.address, parseUnits(tokenAmount.toString(), await presaleToken.decimals()));
      const bigMaxBuyBnb = parseEther(maxBuyBnb);
      await customPresale.connect(otherWallet1).buy({
        value: bigMaxBuyBnb,
      });
      const initialBalance = await presaleToken.balanceOf(BURN_ADDRESS);
      const initialPresaleBalance = await presaleToken.balanceOf(customPresale.address);
      await customPresale.connect(owner).finalize();
      const finalBalance = await presaleToken.balanceOf(BURN_ADDRESS);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        initialPresaleBalance.sub(bigMaxBuyBnb.mul(presalePrice)).toString()
      );
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
        [owner.address, presaleToken.address, router, otherOwner.address],
        [parseEther(presalePrice), parseEther(listingPrice), liquidityPrecentage],
        [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
        liquidityLockTime,
        startPresaleTime,
        endPresaleTime,
        feeType,
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

  describe("enablewhitelist()", () => {
    it("should set whitelist phase to true", async () => {
      await customPresale.connect(owner).toggleWhitelistPhase();
      const whitelistPhase = (await customPresale.getInfo()).isWhiteListPhase;
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
      const isPresaleCancelled = (await customPresale.getInfo()).isPresaleCancelled;
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
    it("should send BNB to otherWallet2", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
      const initialBalance = await provider.getBalance(otherWallet2.address);
      await customPresale.connect(owner).withdrawBNBOwner(parseEther(maxBuyBnb), otherWallet2.address);
      const finalBalance = await provider.getBalance(otherWallet2.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), parseEther(maxBuyBnb).toString());
    });

    it("should be reverted, if set with otherWallet", async () => {
      await customPresale.connect(otherWallet1).buy({
        value: parseEther(maxBuyBnb),
      });
      await expect(
        customPresale.connect(otherOwner).withdrawBNBOwner(parseEther(maxBuyBnb), otherWallet2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
