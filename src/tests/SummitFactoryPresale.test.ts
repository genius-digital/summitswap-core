/* eslint-disable node/no-unsupported-features/es-syntax */
import CustomPresaleArtifact from "@built-contracts/SummitCustomPresale.sol/SummitCustomPresale.json";
import PresaleFactoryArtifact from "@built-contracts/SummitFactoryPresale.sol/SummitFactoryPresale.json";
import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import { FeeInfoStruct, PresaleInfoStruct } from "build/typechain/SummitCustomPresale";
import {
  DummyToken,
  SummitFactoryPresale,
  SummitCustomPresale,
  SummitswapFactory,
  SummitswapRouter02,
  WBNB,
} from "build/typechain";
import { assert, expect } from "chai";
import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, waffle } from "hardhat";
import { MAX_VALUE, ZERO_ADDRESS } from "src/environment";

const { deployContract, provider } = waffle;

describe("SummitFactoryPresale", () => {
  const [owner, serviceFeeReceiver, otherWallet1, summitFactoryFeeToSetter, admin] = provider.getWallets();

  let presaleToken: DummyToken;
  let wbnb: WBNB;
  let summitFactory: SummitswapFactory;
  let summitRouter: SummitswapRouter02;
  let customPresale: SummitCustomPresale;
  let presaleFactory: SummitFactoryPresale;

  const serviceFee = parseEther("0.00010");
  const updatedServiceFee = parseEther("0.00012");

  const FEE_DENOMINATOR = 10 ** 9;
  const FEE_RAISED_TOKEN = 30000000; // 5%
  const FEE_PRESALE_TOKEN = 30000000; // 2%
  const EMERGENCY_WITHDRAW_FEE = 100000000; // 10%

  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuy = "0.1";
  const maxBuy = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPrecentage = 70;
  const maxClaimPercentage = 100; // vesting is diabled
  const startPresaleTime = dayjs().add(1, "day").unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const dayClaimInterval = 15;
  const hourClaimInterval = 16;
  const listingChoice = 0;
  const refundType = 0;
  const isWhiteListPhase = false;
  const isVestingEnabled = false;

  const projectDetails = ["icon_Url", "Name", "Contact", "Position", "Telegram Id", "Discord Id", "Email", "Twitter"];

  beforeEach(async () => {
    presaleFactory = (await deployContract(owner, PresaleFactoryArtifact, [
      serviceFee,
      serviceFeeReceiver.address,
      admin.address,
    ])) as SummitFactoryPresale;
    presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
    wbnb = (await deployContract(owner, WbnbArtifact, [])) as WBNB;
    summitFactory = (await deployContract(owner, SummitFactoryArtifact, [
      summitFactoryFeeToSetter.address,
    ])) as SummitswapFactory;
    summitRouter = (await deployContract(owner, SummitRouterArtifact, [
      summitFactory.address,
      wbnb.address,
    ])) as SummitswapRouter02;
    customPresale = (await deployContract(owner, CustomPresaleArtifact)) as SummitCustomPresale;
    await presaleFactory.connect(owner).setLibraryAddress(customPresale.address);
  });

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
    liquidityPercentage: (liquidityPrecentage * FEE_DENOMINATOR) / 100,
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

  const feeInfo: FeeInfoStruct = {
    raisedTokenAddress: ZERO_ADDRESS,
    feeRaisedToken: FEE_RAISED_TOKEN,
    feePresaleToken: FEE_PRESALE_TOKEN,
    emergencyWithdrawFee: EMERGENCY_WITHDRAW_FEE,
  };

  describe("owner", () => {
    it("should be owner", async () => {
      const ownerAddress = await presaleFactory.owner();
      assert.equal(ownerAddress, owner.address);
    });
  });

  describe("serviceFeeReceiver", () => {
    it("should be otherOwner", async () => {
      const feeReceiverAddress = await presaleFactory.serviceFeeReceiver();
      assert.equal(feeReceiverAddress, serviceFeeReceiver.address);
    });
  });

  describe("setServiceFeeReceiver()", () => {
    it("should be reverted, if set with other than owner", async () => {
      await expect(presaleFactory.connect(otherWallet1).setServiceFeeReceiver(otherWallet1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be set to otherWallet1", async () => {
      await presaleFactory.connect(owner).setServiceFeeReceiver(otherWallet1.address);

      const feeReceiverAddress = await presaleFactory.serviceFeeReceiver();
      assert.equal(feeReceiverAddress, otherWallet1.address);
    });
  });

  describe("preSaleFee", () => {
    it("should be serviceFee", async () => {
      const presaleFee = await presaleFactory.preSaleFee();
      assert.equal(presaleFee.toString(), serviceFee.toString());
    });
  });

  describe("setFee()", () => {
    it("should be reverted, if set with other than owner", async () => {
      await expect(presaleFactory.connect(otherWallet1).setFee(updatedServiceFee)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be able to set new service fee", async () => {
      await presaleFactory.connect(owner).setFee(updatedServiceFee);
      const presaleFee = await presaleFactory.preSaleFee();
      assert.equal(presaleFee.toString(), updatedServiceFee.toString());
    });
  });

  describe("transferOwnership()", () => {
    it("should be reverted, if set with otherWallet", async () => {
      await expect(presaleFactory.connect(otherWallet1).transferOwnership(otherWallet1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should set owner to otherWallet", async () => {
      await presaleFactory.connect(owner).transferOwnership(otherWallet1.address);
      const newOwner = await presaleFactory.owner();
      assert.equal(newOwner, otherWallet1.address);
    });
  });

  describe("getAccountPresales()", () => {
    it("should be accountPresales.length == 1", async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      const accountPresales = await presaleFactory.getAccountPresales(owner.address);
      assert.equal(accountPresales.length, 1);
    });
  });

  describe("withdraw()", () => {
    it("should be reverted if non-owner try to withdraw", async () => {
      await expect(presaleFactory.connect(otherWallet1).withdraw(serviceFeeReceiver.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be able to withdraw fee by owner", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory.connect(owner).setServiceFeeReceiver(presaleFactory.address);
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );

      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await presaleFactory.connect(owner).withdraw(serviceFeeReceiver.address);
      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), serviceFee.toString());
    });
  });

  describe("createPresale()", () => {
    const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
    const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
    const tokenAmount = presaleTokenAmount + tokensForLiquidity;
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
    });
    it("should be reverted, if not enough fee", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            projectDetails,
            { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
            feeInfo,
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            {
              value: BigNumber.from(serviceFee).sub("1"),
            }
          )
      ).to.be.revertedWith("Not Enough Fee");
    });

    it("should be reverted, if presale already exists", async () => {
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            projectDetails,
            { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
            feeInfo,
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Presale Already Exists");
    });

    it("should be reverted, if presale start less than current time", async () => {
      await expect(
        presaleFactory.connect(owner).createPresale(
          projectDetails,
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            startPresaleTime: dayjs(startPresaleTime).subtract(2, "day").unix(),
          },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        )
      ).to.be.revertedWith("Presale startTime > block.timestamp");
    });

    it("should be reverted, if presale end time less than start time", async () => {
      await expect(
        presaleFactory.connect(owner).createPresale(
          projectDetails,
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            endPresaleTime: dayjs(endPresaleTime).subtract(2, "day").unix(),
          },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        )
      ).to.be.revertedWith("Presale End time > presale start time");
    });

    it("should be reverted, if minBuy greater than maxBuy", async () => {
      await expect(
        presaleFactory.connect(owner).createPresale(
          projectDetails,
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            minBuy: parseEther((Number(minBuy) + Number(maxBuy)).toString()),
          },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        )
      ).to.be.revertedWith("MinBuy should be less than maxBuy");
    });

    it("should be reverted, if softCap less than 50% of hardCap", async () => {
      await expect(
        presaleFactory.connect(owner).createPresale(
          projectDetails,
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            softCap: parseEther((Number(hardCap) * 0.4).toString()),
          },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        )
      ).to.be.revertedWith("Softcap should be greater than or equal to 50% of hardcap");
    });

    it("should be reverted, if liquidity% less than 25%", async () => {
      await expect(
        presaleFactory.connect(owner).createPresale(
          projectDetails,
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            liquidityPercentage: (24 * FEE_DENOMINATOR) / 100,
          },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        )
      ).to.be.revertedWith("Liquidity Percentage should be between 25% & 100%");
    });

    it("should be able to set insert newly created presale address into presaleAddresses and tokenPresales", async () => {
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      const presaleAddress = await presaleFactory.pendingPresales(0);
      const presaleAddressFromTokenPresales = (await presaleFactory.getTokenPresales(presaleToken.address))[0];
      assert.equal(presaleAddress, presaleAddressFromTokenPresales);
    });

    it("should be able to send service fee to serviceFeeReceiver address", async () => {
      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      const feeToServiceFeeAddress = finalBalance.sub(initialBalance).toString();
      assert.equal(feeToServiceFeeAddress, serviceFee.toString());
    });

    it("should be able to send token amount to presale contract from factory", async () => {
      const initialTokenAmount = await presaleToken.balanceOf(owner.address);
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      const finalTokenAmount = await presaleToken.balanceOf(owner.address);
      const changeTokenAmountOwner = initialTokenAmount.sub(finalTokenAmount).toString();
      const presaleAddress = (await presaleFactory.getTokenPresales(presaleToken.address))[0];
      const presaleTokenAmount = (await presaleToken.balanceOf(presaleAddress)).toString();

      assert.equal(changeTokenAmountOwner, presaleTokenAmount);
    });

    it("should be able to create presale again if last token presale cancelled", async () => {
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      const presaleAddress = (await presaleFactory.getTokenPresales(presaleToken.address))[0];
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      const summitCustomPresale = SummitCustomPresale.attach(presaleAddress);
      await summitCustomPresale.connect(owner).cancelPresale();
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      assert.equal((await presaleFactory.getTokenPresales(presaleToken.address)).length, 2);
    });

    it("should be able to create presale with feeToken", async () => {
      const feeToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          { ...feeInfo, raisedTokenAddress: feeToken.address },
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      assert.equal((await presaleFactory.getTokenPresales(presaleToken.address)).length, 1);
    });
  });

  describe("getTokenPresales()", () => {
    it("should be tokenPresales.length == 1", async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(tokenPresales.length, 1);
    });
  });

  describe("approvePresales()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
    });
    it("should be pendingPresales.length == 1", async () => {
      const pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 1);
    });
    it("should pendingPresale be custom presale", async () => {
      const pendingPresales = await presaleFactory.getPendingPresales();
      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(pendingPresales[0], tokenPresale[0]);
    });

    it("should ADMIN be only able to approve presale", async () => {
      let pendingPresales = await presaleFactory.getPendingPresales();
      let approvePresales = await presaleFactory.getApprovedPresales();
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      const summitCustomPresale = SummitCustomPresale.attach(tokenPresales[0]);

      assert.equal(pendingPresales.length, 1);
      assert.equal(approvePresales.length, 0);
      assert.equal(tokenPresales.length, 1);
      assert.equal((await summitCustomPresale.getPresaleInfo()).isApproved, false);

      await expect(presaleFactory.connect(otherWallet1).approvePresales(tokenPresales)).to.be.revertedWith(
        "Only admin or owner can call this function"
      );

      await presaleFactory.connect(admin).approvePresales(tokenPresales);

      pendingPresales = await presaleFactory.getPendingPresales();
      approvePresales = await presaleFactory.getApprovedPresales();

      assert.equal(pendingPresales.length, 0);
      assert.equal(approvePresales.length, 1);
      assert.equal((await summitCustomPresale.getPresaleInfo()).isApproved, true);
    });

    it("should OWNER be only able to approve presale", async () => {
      let pendingPresales = await presaleFactory.getPendingPresales();
      let approvePresales = await presaleFactory.getApprovedPresales();
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      const summitCustomPresale = SummitCustomPresale.attach(tokenPresales[0]);

      assert.equal(pendingPresales.length, 1);
      assert.equal(approvePresales.length, 0);
      assert.equal(tokenPresales.length, 1);
      assert.equal((await summitCustomPresale.getPresaleInfo()).isApproved, false);

      await expect(presaleFactory.connect(otherWallet1).approvePresales(tokenPresales)).to.be.revertedWith(
        "Only admin or owner can call this function"
      );

      await presaleFactory.connect(admin).approvePresales(tokenPresales);

      pendingPresales = await presaleFactory.getPendingPresales();
      approvePresales = await presaleFactory.getApprovedPresales();

      assert.equal(pendingPresales.length, 0);
      assert.equal(approvePresales.length, 1);
      assert.equal((await summitCustomPresale.getPresaleInfo()).isApproved, true);
    });

    it("should not add duplicate addresses", async () => {
      let pendingPresales = await presaleFactory.getPendingPresales();
      let approvePresales = await presaleFactory.getApprovedPresales();
      assert.equal(pendingPresales.length, 1);
      assert.equal(approvePresales.length, 0);
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(tokenPresales.length, 1);

      await presaleFactory.connect(admin).approvePresales([tokenPresales[0], tokenPresales[0], tokenPresales[0]]);

      pendingPresales = await presaleFactory.getPendingPresales();
      approvePresales = await presaleFactory.getApprovedPresales();

      assert.equal(pendingPresales.length, 0);
      assert.equal(approvePresales.length, 1);
    });

    it("should not add address if not is pendingPreseles", async () => {
      let pendingPresales = await presaleFactory.getPendingPresales();
      let approvePresales = await presaleFactory.getApprovedPresales();
      assert.equal(pendingPresales.length, 1);
      assert.equal(approvePresales.length, 0);
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(tokenPresales.length, 1);

      await presaleFactory.connect(admin).approvePresales([otherWallet1.address]);

      pendingPresales = await presaleFactory.getPendingPresales();
      approvePresales = await presaleFactory.getApprovedPresales();

      assert.equal(pendingPresales.length, 1);
      assert.equal(approvePresales.length, 0);
    });
  });

  describe("assignAdmins()", () => {
    it("should owner be only able to grant ADMIN role", async () => {
      await expect(presaleFactory.connect(otherWallet1).assignAdmins([otherWallet1.address])).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );

      assert.equal(await presaleFactory.isAdmin(otherWallet1.address), false);
      await presaleFactory.connect(owner).assignAdmins([otherWallet1.address]);
      assert.equal(await presaleFactory.isAdmin(otherWallet1.address), true);
    });
  });

  describe("revokeAdmins()", () => {
    it("should owner be only able to grant revoke role", async () => {
      await presaleFactory.connect(owner).assignAdmins([otherWallet1.address]);
      await expect(presaleFactory.connect(otherWallet1).revokeAdmins([otherWallet1.address])).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );

      assert.equal(await presaleFactory.isAdmin(otherWallet1.address), true);
      await presaleFactory.connect(owner).revokeAdmins([otherWallet1.address]);
      assert.equal(await presaleFactory.isAdmin(otherWallet1.address), false);
    });
  });

  describe("setFeeInfo()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
    });

    it("should admin be only able to set feeInfo", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);

      await expect(
        presaleFactory
          .connect(otherWallet1)
          .setFeeInfo(FEE_RAISED_TOKEN, FEE_PRESALE_TOKEN, EMERGENCY_WITHDRAW_FEE, ZERO_ADDRESS, tokenPresales[0])
      ).to.be.revertedWith("Only admin or owner can call this function");
      assert.equal(await customPresale.isAdmin(otherWallet1.address), false);
      assert.equal(await presaleFactory.isAdmin(admin.address), true);
      assert.equal(await customPresale.isAdmin(presaleFactory.address), true);

      await presaleFactory
        .connect(admin)
        .setFeeInfo(FEE_RAISED_TOKEN, FEE_PRESALE_TOKEN, EMERGENCY_WITHDRAW_FEE, ZERO_ADDRESS, tokenPresales[0]);

      const updatedFeeInfo = await customPresale.getFeeInfo();
      assert.equal(updatedFeeInfo.feeRaisedToken.toString(), FEE_RAISED_TOKEN.toString());
      assert.equal(updatedFeeInfo.feePresaleToken.toString(), FEE_PRESALE_TOKEN.toString());
      assert.equal(updatedFeeInfo.emergencyWithdrawFee.toString(), EMERGENCY_WITHDRAW_FEE.toString());
      assert.equal(updatedFeeInfo.raisedTokenAddress.toString(), ZERO_ADDRESS);
    });

    it("should be reverted, if presale not in pending presales does", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      let pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 1);

      await presaleFactory.connect(admin).approvePresales(tokenPresales);
      pendingPresales = await presaleFactory.getPendingPresales();

      assert.equal(pendingPresales.length, 0);
      await expect(
        presaleFactory
          .connect(admin)
          .setFeeInfo(FEE_RAISED_TOKEN, FEE_PRESALE_TOKEN, EMERGENCY_WITHDRAW_FEE, ZERO_ADDRESS, tokenPresales[0])
      ).to.be.revertedWith("Presale not in pending presales.");
    });
  });

  describe("setPresaleInfo()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
    });

    it("should admin be only able to set presaleInfo", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);

      await expect(
        presaleFactory
          .connect(otherWallet1)
          .setPresaleInfo(
            tokenPresales[0],
            ZERO_ADDRESS,
            [parseEther(minBuy).add("1"), parseEther(maxBuy).add("1"), parseEther(softCap).add("1")],
            [startPresaleTime, endPresaleTime, dayClaimInterval, hourClaimInterval],
            liquidityLockTime,
            maxClaimPercentage,
            refundType,
            listingChoice,
            isWhiteListPhase,
            isVestingEnabled
          )
      ).to.be.revertedWith("Only admin or owner can call this function");
      assert.equal(await customPresale.isAdmin(otherWallet1.address), false);
      assert.equal(await presaleFactory.isAdmin(admin.address), true);
      assert.equal(await customPresale.isAdmin(presaleFactory.address), true);

      await presaleFactory
        .connect(admin)
        .setPresaleInfo(
          tokenPresales[0],
          ZERO_ADDRESS,
          [parseEther(minBuy).add("1"), parseEther(maxBuy).add("1"), parseEther(softCap).add("1")],
          [startPresaleTime, endPresaleTime, dayClaimInterval, hourClaimInterval],
          liquidityLockTime + 1,
          maxClaimPercentage - 1,
          refundType + 1,
          listingChoice + 1,
          true,
          true
        );

      const updatedPresaleInfo = await customPresale.getPresaleInfo();

      assert.equal(updatedPresaleInfo.minBuy.toString(), parseEther(minBuy).add("1").toString());
      assert.equal(updatedPresaleInfo.maxBuy.toString(), parseEther(maxBuy).add("1").toString());
      assert.equal(updatedPresaleInfo.softCap.toString(), parseEther(softCap).add("1").toString());
      assert.equal(updatedPresaleInfo.liquidityLockTime.toString(), (liquidityLockTime + 1).toString());
      assert.equal(updatedPresaleInfo.maxClaimPercentage.toString(), (1000000000 - 10000000).toString());
      assert.equal(updatedPresaleInfo.refundType.toString(), "1");
      assert.equal(updatedPresaleInfo.listingChoice.toString(), "1");
      assert.equal(updatedPresaleInfo.isWhiteListPhase, true);
      assert.equal(updatedPresaleInfo.isVestingEnabled, true);
    });

    it("should be reverted, if presale not in pending presales does", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      let pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 1);

      await presaleFactory.connect(admin).approvePresales(tokenPresales);
      pendingPresales = await presaleFactory.getPendingPresales();

      assert.equal(pendingPresales.length, 0);
      await expect(
        presaleFactory
          .connect(admin)
          .setPresaleInfo(
            tokenPresales[0],
            ZERO_ADDRESS,
            [parseEther(minBuy).add("1"), parseEther(maxBuy).add("1"), parseEther(softCap).add("1")],
            [startPresaleTime, endPresaleTime, dayClaimInterval, hourClaimInterval],
            liquidityLockTime + 1,
            maxClaimPercentage - 1,
            refundType + 1,
            listingChoice + 1,
            true,
            true
          )
      ).to.be.revertedWith("Presale not in pending presales.");
    });
  });

  describe("assignAdminsPresale()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
    });

    it("should OWNER be only able to grant ADMIN role to presale", async () => {
      const tokenPresale = (await presaleFactory.getTokenPresales(presaleToken.address))[0];

      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      const summitCustomPresale = SummitCustomPresale.attach(tokenPresale);

      await expect(
        presaleFactory.connect(otherWallet1).assignAdminsPresale([otherWallet1.address], tokenPresale)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      assert.equal(await summitCustomPresale.isAdmin(otherWallet1.address), false);
      await presaleFactory.connect(owner).assignAdminsPresale([otherWallet1.address], tokenPresale);
      assert.equal(await summitCustomPresale.isAdmin(otherWallet1.address), true);
    });

    it("should be reverted, if presale not in pending presales does", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      let pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 1);

      await presaleFactory.connect(admin).approvePresales(tokenPresales);
      pendingPresales = await presaleFactory.getPendingPresales();

      assert.equal(pendingPresales.length, 0);
      await expect(
        presaleFactory.connect(owner).assignAdminsPresale([otherWallet1.address], tokenPresales[0])
      ).to.be.revertedWith("Presale not in pending presales.");
    });
  });

  describe("revokeAdminsPresale()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity;
      await presaleFactory
        .connect(owner)
        .createPresale(
          projectDetails,
          { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
          feeInfo,
          parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
          {
            value: serviceFee,
          }
        );
    });

    it("should OWNER be only able to revoke ADMIN role for presale", async () => {
      const tokenPresale = (await presaleFactory.getTokenPresales(presaleToken.address))[0];

      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      const summitCustomPresale = SummitCustomPresale.attach(tokenPresale);
      await presaleFactory.connect(owner).assignAdminsPresale([otherWallet1.address], tokenPresale);

      await expect(
        presaleFactory.connect(otherWallet1).revokeAdminsPresale([otherWallet1.address], tokenPresale)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      assert.equal(await summitCustomPresale.isAdmin(otherWallet1.address), true);
      await presaleFactory.connect(owner).revokeAdminsPresale([otherWallet1.address], tokenPresale);
      assert.equal(await summitCustomPresale.isAdmin(otherWallet1.address), false);
    });
  });
});
