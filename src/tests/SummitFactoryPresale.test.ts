import CustomPresaleArtifact from "@built-contracts/SummitCustomPresale.sol/SummitCustomPresale.json";
import PresaleFactoryArtifact from "@built-contracts/SummitFactoryPresale.sol/SummitFactoryPresale.json";
import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
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
import { MAX_VALUE, ZERO_ADDRESS, ADMIN_ROLE } from "src/environment";

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
    _raisedTokenAddress,
    _pairToken,
    _presalePrice,
    _listingPrice,
    _liquidityPrecentage,
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
    _raisedTokenAddress?: string;
    _pairToken?: string;
    _presalePrice?: string;
    _listingPrice?: string;
    _liquidityPrecentage?: number;
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
      Number(_liquidityPrecentage || liquidityPrecentage),
      Number(_listingPrice || listingPrice)
    );

    return presaleFactory.connect(_caller || owner).createPresale(
      projectDetails,
      // tokenAdress, raisedTokenAddress, pairToken, SS router, PS router, admin
      [
        presaleToken.address,
        _raisedTokenAddress || ZERO_ADDRESS,
        _pairToken || ZERO_ADDRESS,
        summitRouter.address,
        summitRouter.address,
        admin.address,
      ],
      // _tokenAmount, _presalePrice, _listingPrice, liquidityPercent, maxClaimPercentage
      [
        parseUnits(_tokenAmount.toString(), await presaleToken.decimals()),
        parseEther(_presalePrice || presalePrice),
        parseEther(_listingPrice || listingPrice),
        _liquidityPrecentage || liquidityPrecentage,
        _maxClaimPercentage || maxClaimPercentage,
      ],
      [
        parseEther(_minBuy || minBuy),
        parseEther(_maxBuy || maxBuy),
        parseEther(_softCap || softCap),
        parseEther(_hardCap || hardCap),
      ],
      [
        _startPresaleTime || startPresaleTime,
        _endPresaleTime || endPresaleTime,
        _dayClaimInterval || dayClaimInterval,
        _hourClaimInterval || hourClaimInterval,
        _liquidityLockTime || liquidityLockTime,
      ],
      [_refundType || refundType, _listingChoice || listingChoice],
      [_isWhiteListPhase || isWhiteListPhase, _isVestingEnabled || isVestingEnabled],
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

    it("should be reverted, if presale start less than current time", async () => {
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
      await expect(createPresale({ _minBuy: (Number(minBuy) + Number(maxBuy)).toString() })).to.be.revertedWith(
        "MinBuy should be less than maxBuy"
      );
    });

    it("should be reverted, if softCap less than 50% of hardCap", async () => {
      await expect(createPresale({ _softCap: (Number(hardCap) * 0.4).toString() })).to.be.revertedWith(
        "Softcap should be greater than or equal to 50% of hardcap"
      );
    });

    it("should be reverted, if liquidity% less than 25%", async () => {
      await expect(createPresale({ _liquidityPrecentage: 24 })).to.be.revertedWith(
        "Liquidity Percentage should be between 25% & 100%"
      );
    });

    it("should be able to set insert newly created presale address into presaleAddresses and tokenPresales", async () => {
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

    it("should be able to create presale with feeToken", async () => {
      const feeToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;

      await createPresale({ _raisedTokenAddress: feeToken.address });

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

  describe("approvePresales()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});
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

      await expect(presaleFactory.connect(owner).approvePresales(tokenPresales)).to.be.revertedWith(
        "msg.sender does not have ADMIN role"
      );
      await expect(presaleFactory.connect(otherWallet1).approvePresales(tokenPresales)).to.be.revertedWith(
        "msg.sender does not have ADMIN role"
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

  describe("grantRole()", () => {
    it("should admin be only able to grant ADMIN role", async () => {
      await expect(presaleFactory.connect(otherWallet1).grantRole(ADMIN_ROLE, otherWallet1.address)).to.be.revertedWith(
        "AccessControl: sender must be an admin to grant"
      );

      assert.equal(await presaleFactory.hasRole(ADMIN_ROLE, otherWallet1.address), false);
      await presaleFactory.connect(admin).grantRole(ADMIN_ROLE, otherWallet1.address);
      assert.equal(await presaleFactory.hasRole(ADMIN_ROLE, otherWallet1.address), true);
    });
  });

  describe("setFeeInfo()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);

      await createPresale({});
    });

    it("should admin be only able to set feeInfo", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      customPresale = SummitCustomPresale.attach(tokenPresales[0]);

      await expect(
        presaleFactory
          .connect(otherWallet1)
          .setFeeInfo(FEE_RAISED_TOKEN, FEE_PRESALE_TOKEN, EMERGENCY_WITHDRAW_FEE, ZERO_ADDRESS, tokenPresales[0])
      ).to.be.revertedWith("msg.sender does not have ADMIN role");
      assert.equal(await customPresale.hasRole(ADMIN_ROLE, otherWallet1.address), false);
      assert.equal(await customPresale.hasRole(ADMIN_ROLE, admin.address), true);

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
      await createPresale({});
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
      ).to.be.revertedWith("msg.sender does not have ADMIN role");
      assert.equal(await customPresale.hasRole(ADMIN_ROLE, otherWallet1.address), false);
      assert.equal(await customPresale.hasRole(ADMIN_ROLE, admin.address), true);

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

  describe("setRolesForPresale()", () => {
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_VALUE);
      await createPresale({});
    });

    it("should admin be only able to grant ADMIN role to presale", async () => {
      const tokenPresale = (await presaleFactory.getTokenPresales(presaleToken.address))[0];

      const SummitCustomPresale = await ethers.getContractFactory("SummitCustomPresale");
      const summitCustomPresale = SummitCustomPresale.attach(tokenPresale);

      await expect(
        presaleFactory.connect(otherWallet1).setRolesForPresale(ADMIN_ROLE, tokenPresale, otherWallet1.address)
      ).to.be.revertedWith("msg.sender does not have ADMIN role");
      assert.equal(await summitCustomPresale.hasRole(ADMIN_ROLE, otherWallet1.address), false);
      await presaleFactory.connect(admin).setRolesForPresale(ADMIN_ROLE, tokenPresale, otherWallet1.address);
      assert.equal(await summitCustomPresale.hasRole(ADMIN_ROLE, otherWallet1.address), true);
    });

    it("should be reverted, if presale not in pending presales does", async () => {
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      let pendingPresales = await presaleFactory.getPendingPresales();
      assert.equal(pendingPresales.length, 1);

      await presaleFactory.connect(admin).approvePresales(tokenPresales);
      pendingPresales = await presaleFactory.getPendingPresales();

      assert.equal(pendingPresales.length, 0);
      await expect(
        presaleFactory.connect(admin).setRolesForPresale(ADMIN_ROLE, tokenPresales[0], otherWallet1.address)
      ).to.be.revertedWith("Presale not in pending presales.");
    });
  });
});
