import { waffle } from "hardhat";
import { expect, assert } from "chai";
import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import PresaleFactoryArtifact from "@built-contracts/SummitFactoryPresale.sol/SummitFactoryPresale.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import { DummyToken, SummitFactoryPresale } from "build/typechain";
import { environment, MAX_APPROVE_AMOUNT } from "src/environment";

const { deployContract, provider } = waffle;

describe("SummitFactoryPresale", () => {
  const [owner, otherOwner, otherWallet1] = provider.getWallets();

  let presaleFactory: SummitFactoryPresale;
  let presaleToken: DummyToken;

  const serviceFee = parseEther("0.00010");
  const updatedServiceFee = parseEther("0.00012");

  const FEE_DENOMINATOR = 10 ** 9;
  const BNB_FEE_TYPE_1 = 20000000; // 2 %

  const router = environment.SUMMITSWAP_ROUTER ?? "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B";
  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuyBnb = "0.1";
  const maxBuyBnb = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPrecentage = 70;
  const startPresaleTime = dayjs().add(1, "day").unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const feeType = 0;
  const refundType = 0;
  const isWhiteListPhase = false;

  beforeEach(async () => {
    presaleFactory = (await deployContract(owner, PresaleFactoryArtifact, [
      serviceFee,
      otherOwner.address,
    ])) as SummitFactoryPresale;
    presaleToken = (await deployContract(owner, TokenArtifact, [])) as DummyToken;
  });

  describe("owner", () => {
    it("should be owner", async () => {
      const ownerAddress = await presaleFactory.owner();
      assert.equal(ownerAddress, owner.address);
    });
  });

  describe("serviceFeeReceiver", () => {
    it("should be otherOwner", async () => {
      const feeReceiverAddress = await presaleFactory.serviceFeeReceiver();
      assert.equal(feeReceiverAddress, otherOwner.address);
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

    it("should be set to updatedServiceFee", async () => {
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
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_APPROVE_AMOUNT);
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, router],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );
    });
    it("should be accountPresales.lenght == 1", async () => {
      const accountPresales = await presaleFactory.getAccountPresales(owner.address);
      assert.equal(accountPresales.length, 1);
    });
  });

  describe("withdraw()", () => {
    it("should be reverted, if withdrawn with otherWallet", async () => {
      await expect(presaleFactory.connect(otherWallet1).withdraw(otherOwner.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be equal increase in serviceFeeReceiverAddress and serviceFee", async () => {
      const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
      const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
      const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
      const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
      await presaleFactory.connect(owner).setServiceFeeReceiver(presaleFactory.address);
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_APPROVE_AMOUNT);
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, router],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );

      const initialBalance = await provider.getBalance(otherOwner.address);
      await presaleFactory.connect(owner).withdraw(otherOwner.address);
      const finalBalance = await provider.getBalance(otherOwner.address);
      assert.equal(finalBalance.sub(initialBalance).toString(), serviceFee.toString());
    });
  });

  describe("createPresale()", () => {
    const presaleTokenAmount = Number(presalePrice) * Number(hardCap);
    const tokensForLiquidity = Number(liquidityPrecentage / 100) * Number(hardCap) * Number(listingPrice);
    const feeTokens = feeType === 0 ? 0 : presaleTokenAmount * (BNB_FEE_TYPE_1 / FEE_DENOMINATOR);
    const tokenAmount = presaleTokenAmount + tokensForLiquidity + feeTokens;
    beforeEach(async () => {
      await presaleToken.connect(owner).approve(presaleFactory.address, MAX_APPROVE_AMOUNT);
    });
    it("should be reverted, if not enough fee", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
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
          [presaleToken.address, router],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Presale Already Exists");
    });

    it("should be reverted, if presale start less than current time", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            dayjs(startPresaleTime).subtract(2, "day").unix(),
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Presale start time should be greater than block.timestamp");
    });

    it("should be reverted, if presale end time less than start time", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            dayjs(endPresaleTime).subtract(2, "day").unix(),
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Presale End time should be greater than presale start time");
    });

    it("should be reverted, if minbuybnb greater than maxBuybnb", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [
              parseEther((Number(minBuyBnb) + Number(maxBuyBnb)).toString()),
              parseEther(maxBuyBnb),
              parseEther(softCap),
              parseEther(hardCap),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("MinBuybnb should be less than maxBuybnb");
    });

    it("should be reverted, if soft less than 50% of hardcap", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [
              parseEther(minBuyBnb),
              parseEther(maxBuyBnb),
              parseEther((Number(hardCap) * 0.4).toString()),
              parseEther(hardCap),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Softcap should be greater than or equal to 50% of hardcap");
    });

    it("should be reverted, if liquidity% less than 51%", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage - 30,
            ],
            [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Liquidity Percentage should be Greater than or equal to 51%");
    });

    it("should be equal to tokenPresale address", async () => {
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, router],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );
      const presaleAddress = await presaleFactory.presaleAddresses(0);
      const presaleAddressFromTokenPresales = await presaleFactory.tokenPresales(presaleToken.address);
      assert.equal(presaleAddress, presaleAddressFromTokenPresales);
    });

    it("should be equal create presalefee and balance of service fee add", async () => {
      const initialBalance = await provider.getBalance(otherOwner.address);
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, router],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );
      const finalBalance = await provider.getBalance(otherOwner.address);
      const feeToServiceFeeAddress = finalBalance.sub(initialBalance).toString();
      assert.equal(feeToServiceFeeAddress, serviceFee.toString());
    });

    it("should be equal presale token amount and change owner token amount", async () => {
      const initialTokenAmount = await presaleToken.balanceOf(owner.address);
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, router],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuyBnb), parseEther(maxBuyBnb), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );
      const finalTokenAmount = await presaleToken.balanceOf(owner.address);
      const changeTokenAmountOwner = initialTokenAmount.sub(finalTokenAmount).toString();
      const presaleAddress = await presaleFactory.tokenPresales(presaleToken.address);
      const presaleTokenAmount = (await presaleToken.balanceOf(presaleAddress)).toString();

      assert.equal(changeTokenAmountOwner, presaleTokenAmount);
    });
  });
});
