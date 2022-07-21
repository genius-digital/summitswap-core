import SummitStandardTokenArtifact from "@built-contracts/tokens/SummitStandardToken.sol/StandardToken.json";
import { StandardToken } from "build/typechain";
import { assert, expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { waffle } from "hardhat";

const { deployContract, provider } = waffle;

describe("SummitStandardToken", () => {
  const [owner, otherWallet1, otherWallet2] = provider.getWallets();

  let standardToken: StandardToken;

  const tokenName = "Sample1";
  const tokenSymbol = "SAM1";
  const tokenDecimals = 18;
  const totalSupply = parseUnits("100000", tokenDecimals);

  beforeEach(async () => {
    standardToken = (await deployContract(owner, SummitStandardTokenArtifact, [
      tokenName,
      tokenSymbol,
      tokenDecimals,
      totalSupply,
      owner.address,
    ])) as StandardToken;
  });

  describe("constructor", () => {
    it("should totalSupply equal to owner balance", async () => {
      const balance = await standardToken.balanceOf(owner.address);
      assert.equal(balance.toString(), totalSupply.toString());
    });
  });

  describe("name", () => {
    it("should be tokenName", async () => {
      const name = await standardToken.name();
      assert.equal(name, tokenName);
    });
  });

  describe("symbol", () => {
    it("should be tokenSymbol", async () => {
      const symbol = await standardToken.symbol();
      assert.equal(symbol, tokenSymbol);
    });
  });

  describe("decimals", () => {
    it("should be tokenDecimals", async () => {
      const decimals = await standardToken.decimals();
      assert.equal(decimals, tokenDecimals);
    });
  });

  describe("totalSupply", () => {
    it("should be totalSupply", async () => {
      const supply = await standardToken.totalSupply();
      assert.equal(supply.toString(), totalSupply.toString());
    });
  });

  describe("owner", () => {
    it("should be owner", async () => {
      const ownerAddress = await standardToken.owner();
      assert.equal(ownerAddress, owner.address);
    });
  });

  describe("transferOwnership()", () => {
    it("should be reverted, if set with otherWallet1", async () => {
      await expect(standardToken.connect(otherWallet1).transferOwnership(otherWallet1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should set owner to otherWallet1", async () => {
      await standardToken.connect(owner).transferOwnership(otherWallet1.address);
      const newOwner = await standardToken.owner();
      assert.equal(newOwner, otherWallet1.address);
    });
  });

  describe("transfer", () => {
    it("should be reverted, if not enought balance", async () => {
      const amountTransfer = parseUnits("1000", tokenDecimals).toString();
      await expect(standardToken.connect(otherWallet1).transfer(owner.address, amountTransfer)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("should transfer some amount to address", async () => {
      const balance0 = await standardToken.balanceOf(owner.address);
      const amountTransfer = parseUnits("1000", tokenDecimals).toString();
      await standardToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
      const balance1 = await standardToken.balanceOf(owner.address);
      assert.equal(balance1.toString(), balance0.sub(amountTransfer).toString());

      const balance2 = await standardToken.balanceOf(otherWallet1.address);
      assert.equal(balance2.toString(), amountTransfer.toString());
    });
  });

  describe("balanceOf", () => {
    it("should be equal to total Supply", async () => {
      const balance = await standardToken.balanceOf(owner.address);
      assert.equal(balance.toString(), totalSupply.toString());
    });
    it("should be equal to amountTransfer", async () => {
      const balance0 = await standardToken.balanceOf(otherWallet1.address);
      const amountTransfer = parseUnits("1000", tokenDecimals).toString();
      await standardToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
      const balance1 = await standardToken.balanceOf(otherWallet1.address);
      assert.equal(balance1.sub(balance0).toString(), amountTransfer);
    });
  });

  describe("allowance", () => {
    it("should get allowance of A to B", async () => {
      const allowance = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance.toString(), "0");

      await standardToken.connect(owner).approve(otherWallet1.address, "1000");
      const allowance1 = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance1.toString(), "1000");
    });
  });

  describe("approve", () => {
    it("should approve some amount to address", async () => {
      const amountApprove = parseUnits("1000", tokenDecimals).toString();
      await standardToken.connect(owner).approve(otherWallet1.address, amountApprove);
      const allowance = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance.toString(), amountApprove);
    });
  });

  describe("transferFrom", () => {
    it("should transfer some N amount to address if have <= N amount of it", async () => {
      const amountTransfer = parseUnits("1000", tokenDecimals).toString();
      const balance0 = await standardToken.balanceOf(owner.address);
      await standardToken.connect(owner).approve(otherWallet1.address, amountTransfer);
      await standardToken.connect(otherWallet1).transferFrom(owner.address, otherWallet2.address, amountTransfer);
      const allowance = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance.toString(), "0");
      const balance1 = await standardToken.balanceOf(owner.address);
      const balance2 = await standardToken.balanceOf(otherWallet2.address);
      assert.equal(balance0.toString(), balance1.add(amountTransfer).toString());
      assert.equal(balance2.toString(), amountTransfer);
    });

    it("should not transfer if have > N amount of it", async () => {
      const amountTransfer = parseUnits("1000", tokenDecimals);
      const balance0 = await standardToken.balanceOf(owner.address);
      await standardToken.connect(owner).approve(otherWallet1.address, amountTransfer);
      await expect(
        standardToken.connect(otherWallet1).transferFrom(owner.address, otherWallet2.address, amountTransfer.add("1"))
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
      const allowance = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance.toString(), amountTransfer.toString());
      const balance1 = await standardToken.balanceOf(owner.address);
      const balance2 = await standardToken.balanceOf(otherWallet2.address);
      assert.equal(balance0.toString(), balance1.toString());
      assert.equal(balance2.toString(), "0");
    });
  });

  describe("increaseAllowance", () => {
    it("should increase allowance some amount to address", async () => {
      const approveAmount = parseUnits("1000", tokenDecimals);
      await standardToken.connect(owner).approve(otherWallet1.address, approveAmount);
      const allowance = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance.toString(), approveAmount.toString());

      const increaseAmount = parseUnits("2000", tokenDecimals).toString();
      await standardToken.connect(owner).increaseAllowance(otherWallet1.address, increaseAmount);
      const allowance1 = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance1.toString(), approveAmount.add(increaseAmount).toString());
    });
  });

  describe("decreaseAllowance", () => {
    it("should decrease allowance some amount to address", async () => {
      const approveAmount = parseUnits("1000", tokenDecimals);
      await standardToken.connect(owner).approve(otherWallet1.address, approveAmount);
      const allowance = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance.toString(), approveAmount.toString());

      const decreaseAmount = parseUnits("500", tokenDecimals).toString();
      await standardToken.connect(owner).decreaseAllowance(otherWallet1.address, decreaseAmount);
      const allowance1 = await standardToken.allowance(owner.address, otherWallet1.address);
      assert.equal(allowance1.toString(), approveAmount.sub(decreaseAmount).toString());
    });
  });
});
