import SummitFactoryArtifact from "@built-contracts/creators/StandardTokenFactory.sol/StandardTokenFactory.json";
import { StandardTokenFactory } from "build/typechain";
import { assert, expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, waffle } from "hardhat";

const { deployContract, provider } = waffle;

describe("SummitStandardTokenFactory", () => {
  const [owner, serviceFeeReceiver, otherWallet1] = provider.getWallets();

  let standardTokenFactory: StandardTokenFactory;

  const serviceFee = parseEther("0.0001");
  const newServiceFee = parseEther("0.00012");
  const tokenName = "Sample1";
  const tokenSymbol = "SAM1";
  const tokenDecimals = 18;
  const totalSupply = parseUnits("100000", tokenDecimals);

  beforeEach(async () => {
    standardTokenFactory = (await deployContract(owner, SummitFactoryArtifact, [
      serviceFee,
      serviceFeeReceiver.address,
    ])) as StandardTokenFactory;
  });

  describe("owner", () => {
    it("should be owner", async () => {
      const ownerAddress = await standardTokenFactory.owner();
      assert.equal(ownerAddress, owner.address);
    });
  });

  describe("serviceFeeReceiver", () => {
    it("should be serviceFeeReceiver", async () => {
      const feeReceiverAddress = await standardTokenFactory.serviceFeeReceiver();
      assert.equal(feeReceiverAddress, serviceFeeReceiver.address);
    });
  });

  describe("setServiceFeeReceiver()", () => {
    it("should be reverted, if set with other than owner", async () => {
      await expect(
        standardTokenFactory.connect(otherWallet1).setServiceFeeReceiver(otherWallet1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should be set to otherWallet1", async () => {
      await standardTokenFactory.connect(owner).setServiceFeeReceiver(otherWallet1.address);
      const feeReceiverAddress = await standardTokenFactory.serviceFeeReceiver();
      assert.equal(feeReceiverAddress, otherWallet1.address);
    });
  });

  describe("createTokenFee", () => {
    it("should be serviceFee", async () => {
      const createTokenFee = await standardTokenFactory.createTokenFee();
      assert.equal(createTokenFee.toString(), serviceFee.toString());
    });
  });

  describe("setFee()", () => {
    it("should be reverted, if set with other than owner", async () => {
      await expect(standardTokenFactory.connect(otherWallet1).setFee(newServiceFee)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be able to set new service fee", async () => {
      await standardTokenFactory.connect(owner).setFee(newServiceFee);
      const presaleFee = await standardTokenFactory.createTokenFee();
      assert.equal(presaleFee.toString(), newServiceFee.toString());
    });
  });

  describe("transferOwnership()", () => {
    it("should be reverted, if set with otherWallet1", async () => {
      await expect(
        standardTokenFactory.connect(otherWallet1).transferOwnership(otherWallet1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should set owner to otherWallet1", async () => {
      await standardTokenFactory.connect(owner).transferOwnership(otherWallet1.address);
      const newOwner = await standardTokenFactory.owner();
      assert.equal(newOwner, otherWallet1.address);
    });
  });

  describe("createStandardToken()", () => {
    it("should be able to create standard token", async () => {
      const initialCount = await standardTokenFactory.customStandardTokensMade();
      await standardTokenFactory
        .connect(otherWallet1)
        .createStandardToken(tokenName, tokenSymbol, tokenDecimals, totalSupply, {
          value: serviceFee,
        });
      const finalCount = await standardTokenFactory.customStandardTokensMade();
      assert.equal(finalCount.sub(initialCount).toString(), "1");
    });

    it("should otherWallet1 be the owner of created token", async () => {
      await standardTokenFactory
        .connect(otherWallet1)
        .createStandardToken(tokenName, tokenSymbol, tokenDecimals, totalSupply, {
          value: serviceFee,
        });
      const tokenAddress = await standardTokenFactory.customStandardTokens(0);
      const StandardToken = await ethers.getContractFactory("StandardToken");
      const standardToken = StandardToken.attach(tokenAddress);
      assert.equal(await standardToken.owner(), otherWallet1.address);
    });

    it("should created token arguments be equal", async () => {
      await standardTokenFactory
        .connect(otherWallet1)
        .createStandardToken(tokenName, tokenSymbol, tokenDecimals, totalSupply, {
          value: serviceFee,
        });
      const tokenAddress = await standardTokenFactory.customStandardTokens(0);
      const StandardToken = await ethers.getContractFactory("StandardToken");
      const standardToken = StandardToken.attach(tokenAddress);
      assert.equal(await standardToken.name(), tokenName);
      assert.equal(await standardToken.symbol(), tokenSymbol);
      assert.equal(await standardToken.decimals(), tokenDecimals);
      assert.equal((await standardToken.totalSupply()).toString(), totalSupply.toString());
    });

    it("should increase balance of serviceFeeReceiver equal to serviceFee", async () => {
      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await standardTokenFactory
        .connect(otherWallet1)
        .createStandardToken(tokenName, tokenSymbol, tokenDecimals, totalSupply, {
          value: serviceFee,
        });
      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), serviceFee.toString());
    });
  });

  describe("withdraw()", () => {
    it("should be reverted if non-owner try to withdraw", async () => {
      await expect(standardTokenFactory.connect(otherWallet1).withdraw(serviceFeeReceiver.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be able to withdraw fee by owner", async () => {
      await standardTokenFactory.connect(owner).setServiceFeeReceiver(standardTokenFactory.address);
      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await standardTokenFactory
        .connect(otherWallet1)
        .createStandardToken(tokenName, tokenSymbol, tokenDecimals, totalSupply, {
          value: serviceFee,
        });
      await standardTokenFactory.connect(owner).withdraw(serviceFeeReceiver.address);
      const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), serviceFee.toString());
    });
  });
});
