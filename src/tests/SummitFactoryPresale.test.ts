/* eslint-disable node/no-unsupported-features/es-syntax */
import CustomPresaleArtifact from "@built-contracts/SummitCustomPresale.sol/SummitCustomPresale.json";
import PresaleFactoryArtifact from "@built-contracts/SummitFactoryPresale.sol/SummitFactoryPresale.json";
import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import { PresaleFeeInfoStruct, PresaleInfoStruct } from "build/typechain/SummitCustomPresale";
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
import { BigNumber, Wallet } from "ethers";
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
  const FEE_PAYMENT_TOKEN = 300000000; // 3%
  const FEE_PRESALE_TOKEN = 300000000; // 3%
  const FEE_EMERGENCY_WITHDRAW = 1000000000; // 10%

  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuy = "0.1";
  const maxBuy = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPercentage = 70;
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
    liquidityPrecentage: number,
    listingPrice: number
  ) => {
    const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
    const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
    const tokenAmount = presaleTokenAmount + tokensForLiquidity;
    return tokenAmount;
  };

  const createPresale = async ({
    _caller,
    _paymentTokenAddress,
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
    _serviceFee,
  }: {
    _caller?: Wallet;
    _paymentTokenAddress?: string;
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
    _isWhiteListPhase?: boolean;
    _isVestingEnabled?: boolean;
    _serviceFee?: string;
  }) => {
    const _tokenAmount = calculateTokenAmount(
      Number(_presalePrice || presalePrice),
      Number(_hardCap || hardCap),
      Number(_liquidityPercentage || liquidityPercentage),
      Number(_listingPrice || listingPrice)
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
        paymentToken: _paymentTokenAddress || ZERO_ADDRESS,
        feePaymentToken: FEE_PAYMENT_TOKEN,
        feePresaleToken: FEE_PRESALE_TOKEN,
        feeEmergencyWithdraw: FEE_EMERGENCY_WITHDRAW,
      } as PresaleFeeInfoStruct,
      parseUnits(_tokenAmount.toString(), await presaleToken.decimals()),
      {
        value: _serviceFee || serviceFee,
      }
    );
  };

  describe("owner", () => {
    it("should be owner", async () => {
      const ownerAddress = await presaleFactory.owner();
      assert.equal(ownerAddress, owner.address);
    });
  });

  describe("serviceFeeReceiver", () => {
    it("should be serviceFeeReceiver", async () => {
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
      await createPresale({});

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
      await presaleFactory.connect(owner).setServiceFeeReceiver(presaleFactory.address);
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});

      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await presaleFactory.connect(owner).withdraw(serviceFeeReceiver.address);
      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), serviceFee.toString());
    });
  });

  describe("createPresale()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
    });
    it("should be reverted, if not enough fee", async () => {
      await expect(
        createPresale({
          _serviceFee: BigNumber.from(serviceFee).sub("1").toString(),
        })
      ).to.be.revertedWith("Not Enough Fee");
    });

    it("should be reverted, if presale already exists", async () => {
      await createPresale({});

      await expect(createPresale({})).to.be.revertedWith("Presale Already Exists");
    });

    it("should be reverted, if presale start time less than current time", async () => {
      await expect(
        createPresale({
          _startPresaleTime: dayjs(startPresaleTime).subtract(2, "day").unix(),
        })
      ).to.be.revertedWith("Presale startTime > block.timestamp");
    });

    it("should be reverted, if presale end time less than start time", async () => {
      await expect(
        createPresale({
          _endPresaleTime: dayjs(endPresaleTime).subtract(2, "day").unix(),
        })
      ).to.be.revertedWith("Presale End time > presale start time");
    });

    it("should be reverted, if minBuy greater than maxBuy", async () => {
      await expect(
        createPresale({
          _minBuy: parseEther((Number(minBuy) + Number(maxBuy)).toString()).toString(),
        })
      ).to.be.revertedWith("MinBuy should be less than maxBuy");
    });

    it("should be reverted, if softCap less than 50% of hardCap", async () => {
      await expect(
        createPresale({
          _softCap: parseEther((Number(hardCap) * 0.4).toString()).toString(),
        })
      ).to.be.revertedWith("Softcap should be greater than or equal to 50% of hardcap");
    });

    it("should be reverted, if liquidity% less than 25%", async () => {
      await expect(
        createPresale({
          _liquidityPercentage: 24,
        })
      ).to.be.revertedWith("Liquidity Percentage should be between 25% & 100%");
    });

    it("should be able to add newly created presale address into pendingPresales and tokenPresales", async () => {
      await createPresale({});

      const presaleAddress = await presaleFactory.pendingPresales(0);
      const presaleAddressFromTokenPresales = (await presaleFactory.getTokenPresales(presaleToken.address))[0];
      assert.equal(presaleAddress, presaleAddressFromTokenPresales);
    });

    it("should be able to send service fee to serviceFeeReceiver address", async () => {
      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await createPresale({});

      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      const feeToServiceFeeAddress = finalBalance.sub(initialBalance).toString();
      assert.equal(feeToServiceFeeAddress, serviceFee.toString());
    });

    it("should be able to send token amount to presale contract from factory", async () => {
      const initialTokenAmount = await presaleToken.balanceOf(owner.address);

      await createPresale({});

      const finalTokenAmount = await presaleToken.balanceOf(owner.address);
      const changeTokenAmountOwner = initialTokenAmount.sub(finalTokenAmount).toString();
      const presaleAddress = (await presaleFactory.getTokenPresales(presaleToken.address))[0];
      const presaleTokenAmount = (await presaleToken.balanceOf(presaleAddress)).toString();

      assert.equal(changeTokenAmountOwner, presaleTokenAmount);
    });

    it("should be able to create presale again if last token presale cancelled", async () => {
      await createPresale({});

      const presaleAddress = (await presaleFactory.getTokenPresales(presaleToken.address))[0];
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      const summitCustomPresale = SummitCustomPresale.attach(presaleAddress);
      await summitCustomPresale.connect(owner).cancelPresale();
      await createPresale({});

      assert.equal((await presaleFactory.getTokenPresales(presaleToken.address)).length, 2);
    });

    it("should be able to create presale with paymentToken as feeToken", async () => {
      const feeToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      await createPresale({
        _paymentTokenAddress: feeToken.address,
      });

      assert.equal((await presaleFactory.getTokenPresales(presaleToken.address)).length, 1);
    });
  });

  describe("getTokenPresales()", () => {
    it("should be tokenPresales.length == 1", async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});

      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(tokenPresales.length, 1);
    });
  });

  describe("approvePresale()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});
    });

    it("should pendingPresales only have be custom presale", async () => {
      const pendingPresales = await presaleFactory.getPendingPresales();
      const tokenPresale = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(pendingPresales[0], tokenPresale[0]);
      assert.equal(pendingPresales.length, 1);
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

      await expect(presaleFactory.connect(otherWallet1).approvePresale(tokenPresales[0])).to.be.revertedWith(
        "Only admin or owner can call this function"
      );

      await presaleFactory.connect(admin).approvePresale(tokenPresales[0]);

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

      await expect(presaleFactory.connect(otherWallet1).approvePresale(tokenPresales[0])).to.be.revertedWith(
        "Only admin or owner can call this function"
      );

      await presaleFactory.connect(admin).approvePresale(tokenPresales[0]);

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

      await presaleFactory.connect(admin).approvePresale(tokenPresales[0]);

      pendingPresales = await presaleFactory.getPendingPresales();
      approvePresales = await presaleFactory.getApprovedPresales();

      assert.equal(pendingPresales.length, 0);
      assert.equal(approvePresales.length, 1);
    });

    it("should revert, if not is pendingPreseles", async () => {
      let pendingPresales = await presaleFactory.getPendingPresales();
      let approvePresales = await presaleFactory.getApprovedPresales();
      assert.equal(pendingPresales.length, 1);
      assert.equal(approvePresales.length, 0);
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(tokenPresales.length, 1);

      await expect(presaleFactory.connect(admin).approvePresale(otherWallet1.address)).to.be.revertedWith(
        "Presale not in pending presales."
      );

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

  describe("updatePresaleAndApprove()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});
    });

    it("should be reverted, if presale not in pending presales does", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      let pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 1);

      await presaleFactory.connect(admin).approvePresale(tokenPresales[0]);
      pendingPresales = await presaleFactory.getPendingPresales();

      assert.equal(pendingPresales.length, 0);
      await expect(
        presaleFactory
          .connect(admin)
          .updatePresaleAndApprove(
            { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken.address },
            feeInfo,
            tokenPresales[0]
          )
      ).to.be.revertedWith("Presale not in pending presales.");
    });

    it("should be reverted, if presale token not same", async () => {
      const presaleToken2 = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);

      await expect(
        presaleFactory
          .connect(admin)
          .updatePresaleAndApprove(
            { ...presaleInfo, router0: summitRouter.address, presaleToken: presaleToken2.address },
            feeInfo,
            tokenPresales[0]
          )
      ).to.be.revertedWith("Presale token should be same");
    });

    it("should be reverted, if presale price not same", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            presaleToken: presaleToken.address,
            router0: summitRouter.address,
            presalePrice: parseEther(presalePrice).add(1),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("Presale price should be same");
    });

    it("should be reverted, if listing price not same", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            presaleToken: presaleToken.address,
            router0: summitRouter.address,
            listingPrice: parseEther(listingPrice).add(1),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("listingPrice should be same");
    });

    it("should be reverted, if hardCap not same", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            presaleToken: presaleToken.address,
            router0: summitRouter.address,
            hardCap: parseEther(hardCap).add(1),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("hardCap should be same");
    });

    it("should be reverted, if liquidityPercentage not same", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            liquidityPercentage: ((liquidityPercentage + 1) * FEE_DENOMINATOR) / 100,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("liquidityPercentage should be same");
    });

    it("should be reverted, if startPresaleTime less than set startPresaleTime", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            startPresaleTime: dayjs().unix(),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("startPresaleTime >= set startPresaleTime");
    });

    it("should be reverted, if endPresaleTime less than startPresaleTime", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            endPresaleTime: dayjs().unix(),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("endPresaleTime >= startPresaleTime");
    });

    it("should be reverted, if softCap not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            softCap: parseEther(softCap).sub("1"),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("50% of hardcap <= softcap <= hardcap");
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            softCap: parseEther(hardCap).add("1"),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("50% of hardcap <= softcap <= hardcap");
    });

    it("should be reverted, if claimIntervalDay not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            claimIntervalDay: 0,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("claimIntervalDay should be between 1 & 31");
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            claimIntervalDay: 32,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("claimIntervalDay should be between 1 & 31");
    });

    it("should be reverted, if claimIntervalHour greater than 24", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            claimIntervalHour: 24,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("claimIntervalHour should be between 0 & 23");
    });

    it("should be reverted, if minBuy greater or equal than maxBuy", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            minBuy: parseEther(maxBuy),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("MinBuy should be less than maxBuy");
    });

    it("should be reverted, if maxBuy greater than hardCap", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            presaleToken: presaleToken.address,
            router0: summitRouter.address,
            maxBuy: parseEther(hardCap).add("1"),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("maxBuy should be less than hardCap");
    });

    it("should be reverted, if maxClaimPercentage not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            maxClaimPercentage: (0.9 * FEE_DENOMINATOR) / 100,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("maxClaimPercentage should be between 1% & 100%");

      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            maxClaimPercentage: (101 * FEE_DENOMINATOR) / 100,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("maxClaimPercentage should be between 1% & 100%");
    });

    it("should be reverted, if feeEmergencyWithdraw not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
          },
          { ...feeInfo, feeEmergencyWithdraw: (0.9 * FEE_DENOMINATOR) / 100 },
          tokenPresales[0]
        )
      ).to.be.revertedWith("feeEmergencyWithdraw should be between 1% & 100%");

      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
          },
          { ...feeInfo, feeEmergencyWithdraw: (0.9 * FEE_DENOMINATOR) / 100 },
          tokenPresales[0]
        )
      ).to.be.revertedWith("feeEmergencyWithdraw should be between 1% & 100%");
    });

    it("should be reverted, if feePaymentToken not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
          },
          { ...feeInfo, feePaymentToken: ((liquidityPercentage + 1) * FEE_DENOMINATOR) / 100 },
          tokenPresales[0]
        )
      ).to.be.revertedWith("fee payment Token should be less than liquidityPercentage");
    });

    it("should be reverted, if feePresaleToken not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
          },
          { ...feeInfo, feePresaleToken: ((liquidityPercentage + 1) * FEE_DENOMINATOR) / 100 },
          tokenPresales[0]
        )
      ).to.be.revertedWith("fee presale Token should be less than liquidityPercentage");
    });

    it("should be reverted, if refundType not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            refundType: 2,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("refundType should be between 0 or 1");
    });

    it("should be reverted, if listingChoice not valid", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      await expect(
        presaleFactory.connect(admin).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            listingChoice: 4,
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("listingChoice should be between 0 & 3");
    });

    it("should admin be only able to set updatePresaleAndApprove", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      let pendingPresales: string[];
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);

      await expect(
        presaleFactory.connect(otherWallet1).updatePresaleAndApprove(
          {
            ...presaleInfo,
            router0: summitRouter.address,
            presaleToken: presaleToken.address,
            minBuy: parseEther(minBuy).add("1"),
            maxBuy: parseEther(maxBuy).add("1"),
            softCap: parseEther(softCap).add("1"),
          },
          feeInfo,
          tokenPresales[0]
        )
      ).to.be.revertedWith("Only admin or owner can call this function");
      assert.equal(await customPresale.isAdmin(otherWallet1.address), false);
      assert.equal(await presaleFactory.isAdmin(otherWallet1.address), false);
      assert.equal(await presaleFactory.isAdmin(admin.address), true);
      assert.equal(await customPresale.isAdmin(presaleFactory.address), true);

      pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 1);
      assert.equal((await customPresale.getPresaleInfo()).isApproved, false);

      await presaleFactory.connect(admin).updatePresaleAndApprove(
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
        tokenPresales[0],
        {
          gasLimit: 30000000,
        }
      );
      pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 0);

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

  describe("assignAdminsPresale()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});
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

    it("should be reverted, if presale does not exist", async () => {
      await expect(
        presaleFactory.connect(owner).assignAdminsPresale([otherWallet1.address], otherWallet1.address)
      ).to.be.revertedWith("Presale does not exist");
    });
  });

  describe("revokeAdminsPresale()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});
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

    it("should be reverted, if presale does not exist", async () => {
      await expect(
        presaleFactory.connect(owner).assignAdminsPresale([otherWallet1.address], otherWallet1.address)
      ).to.be.revertedWith("Presale does not exist");
    });
  });
});
