import { waffle } from "hardhat";
import { expect, assert } from "chai";
import dayjs from "dayjs";
import { ethers, BigNumber } from "ethers";
import PresaleFactoryArtifact from "@built-contracts/SummitFactoryPresale.sol/SummitFactoryPresale.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import { DummyToken, SummitFactoryPresale } from "build/typechain";

const { deployContract, provider } = waffle;

describe("SummitFactoryPresale", () => {
  const [owner, otherOwner, otherWallet1] = provider.getWallets();

  let presaleFactory: SummitFactoryPresale;
  let presaleToken: DummyToken;

  const createPresaleFee = "100000000000000"; // 0.0001 ether
  const updatedPresaleFee = "1200000000000000";

  const MAX_APPROVE_AMOUNT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

  const FEE_DENOMINATOR = 10 ** 9;
  const BNB_FEE_TYPE_1 = 20000000; // 2 %

  const router = "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B";
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
      createPresaleFee,
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

  describe("serviceFeeReciever", () => {
    it("should be otherOwner", async () => {
      const feeRecieverAddress = await presaleFactory.serviceFeeReciever();
      assert.equal(feeRecieverAddress, otherOwner.address);
    });
  });

  describe("setServiceFeeReciver()", () => {
    it("should be reverted, if set with other than owner", async () => {
      await expect(presaleFactory.connect(otherWallet1).setServiceFeeReciver(otherWallet1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be set to otherWallet1", async () => {
      await presaleFactory.connect(owner).setServiceFeeReciver(otherWallet1.address);

      const feeRecieverAddress = await presaleFactory.serviceFeeReciever();
      assert.equal(feeRecieverAddress, otherWallet1.address);
    });
  });

  describe("preSaleFee", () => {
    it("should be createPresaleFee", async () => {
      const presaleFee = await presaleFactory.preSaleFee();
      assert.equal(presaleFee.toString(), createPresaleFee);
    });
  });

  describe("setFee()", () => {
    it("should be reverted, if set with other than owner", async () => {
      await expect(presaleFactory.connect(otherWallet1).setFee(updatedPresaleFee)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be set to updatedPresaleFee", async () => {
      await presaleFactory.connect(owner).setFee(updatedPresaleFee);
      const presaleFee = await presaleFactory.preSaleFee();
      assert.equal(presaleFee.toString(), updatedPresaleFee);
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
            ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            ethers.utils.parseUnits(presalePrice, 18),
            ethers.utils.parseUnits(listingPrice, 18),
            liquidityPrecentage,
          ],
          [
            ethers.utils.parseUnits(minBuyBnb, 18),
            ethers.utils.parseUnits(maxBuyBnb, 18),
            ethers.utils.parseUnits(softCap, 18),
            ethers.utils.parseUnits(hardCap, 18),
          ],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: createPresaleFee,
            gasLimit: 3000000,
          }
        );
    });
    it("should be accountPresales.lenght == 1", async () => {
      const accountPresales = await presaleFactory.getAccountPresales(owner.address);
      assert.equal(accountPresales.length, 1);
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
              ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              ethers.utils.parseUnits(presalePrice, 18),
              ethers.utils.parseUnits(listingPrice, 18),
              liquidityPrecentage,
            ],
            [
              ethers.utils.parseUnits(minBuyBnb, 18),
              ethers.utils.parseUnits(maxBuyBnb, 18),
              ethers.utils.parseUnits(softCap, 18),
              ethers.utils.parseUnits(hardCap, 18),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: BigNumber.from(createPresaleFee).sub("1"),
              gasLimit: 3000000,
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
            ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            ethers.utils.parseUnits(presalePrice, 18),
            ethers.utils.parseUnits(listingPrice, 18),
            liquidityPrecentage,
          ],
          [
            ethers.utils.parseUnits(minBuyBnb, 18),
            ethers.utils.parseUnits(maxBuyBnb, 18),
            ethers.utils.parseUnits(softCap, 18),
            ethers.utils.parseUnits(hardCap, 18),
          ],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: createPresaleFee,
            gasLimit: 3000000,
          }
        );
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, router],
            [
              ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              ethers.utils.parseUnits(presalePrice, 18),
              ethers.utils.parseUnits(listingPrice, 18),
              liquidityPrecentage,
            ],
            [
              ethers.utils.parseUnits(minBuyBnb, 18),
              ethers.utils.parseUnits(maxBuyBnb, 18),
              ethers.utils.parseUnits(softCap, 18),
              ethers.utils.parseUnits(hardCap, 18),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: createPresaleFee,
              gasLimit: 3000000,
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
              ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              ethers.utils.parseUnits(presalePrice, 18),
              ethers.utils.parseUnits(listingPrice, 18),
              liquidityPrecentage,
            ],
            [
              ethers.utils.parseUnits(minBuyBnb, 18),
              ethers.utils.parseUnits(maxBuyBnb, 18),
              ethers.utils.parseUnits(softCap, 18),
              ethers.utils.parseUnits(hardCap, 18),
            ],
            liquidityLockTime,
            dayjs(startPresaleTime).subtract(2, "day").unix(),
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: createPresaleFee,
              gasLimit: 3000000,
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
              ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              ethers.utils.parseUnits(presalePrice, 18),
              ethers.utils.parseUnits(listingPrice, 18),
              liquidityPrecentage,
            ],
            [
              ethers.utils.parseUnits(minBuyBnb, 18),
              ethers.utils.parseUnits(maxBuyBnb, 18),
              ethers.utils.parseUnits(softCap, 18),
              ethers.utils.parseUnits(hardCap, 18),
            ],
            liquidityLockTime,
            startPresaleTime,
            dayjs(endPresaleTime).subtract(2, "day").unix(),
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: createPresaleFee,
              gasLimit: 3000000,
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
              ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              ethers.utils.parseUnits(presalePrice, 18),
              ethers.utils.parseUnits(listingPrice, 18),
              liquidityPrecentage,
            ],
            [
              ethers.utils.parseUnits((Number(minBuyBnb) + Number(maxBuyBnb)).toString(), 18),
              ethers.utils.parseUnits(maxBuyBnb, 18),
              ethers.utils.parseUnits(softCap, 18),
              ethers.utils.parseUnits(hardCap, 18),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: createPresaleFee,
              gasLimit: 3000000,
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
              ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              ethers.utils.parseUnits(presalePrice, 18),
              ethers.utils.parseUnits(listingPrice, 18),
              liquidityPrecentage,
            ],
            [
              ethers.utils.parseUnits(minBuyBnb, 18),
              ethers.utils.parseUnits(maxBuyBnb, 18),
              ethers.utils.parseUnits((Number(hardCap) * 0.4).toString(), 18),
              ethers.utils.parseUnits(hardCap, 18),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: createPresaleFee,
              gasLimit: 3000000,
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
              ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              ethers.utils.parseUnits(presalePrice, 18),
              ethers.utils.parseUnits(listingPrice, 18),
              liquidityPrecentage - 30,
            ],
            [
              ethers.utils.parseUnits(minBuyBnb, 18),
              ethers.utils.parseUnits(maxBuyBnb, 18),
              ethers.utils.parseUnits(softCap, 18),
              ethers.utils.parseUnits(hardCap, 18),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            feeType,
            refundType,
            isWhiteListPhase,
            {
              value: createPresaleFee,
              gasLimit: 3000000,
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
            ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            ethers.utils.parseUnits(presalePrice, 18),
            ethers.utils.parseUnits(listingPrice, 18),
            liquidityPrecentage,
          ],
          [
            ethers.utils.parseUnits(minBuyBnb, 18),
            ethers.utils.parseUnits(maxBuyBnb, 18),
            ethers.utils.parseUnits(softCap, 18),
            ethers.utils.parseUnits(hardCap, 18),
          ],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: createPresaleFee,
            gasLimit: 3000000,
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
            ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            ethers.utils.parseUnits(presalePrice, 18),
            ethers.utils.parseUnits(listingPrice, 18),
            liquidityPrecentage,
          ],
          [
            ethers.utils.parseUnits(minBuyBnb, 18),
            ethers.utils.parseUnits(maxBuyBnb, 18),
            ethers.utils.parseUnits(softCap, 18),
            ethers.utils.parseUnits(hardCap, 18),
          ],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: createPresaleFee,
            gasLimit: 3000000,
          }
        );
      const finalBalance = await provider.getBalance(otherOwner.address);
      const feeToServiceFeeAddress = finalBalance.sub(initialBalance).toString();
      assert.equal(feeToServiceFeeAddress, createPresaleFee);
    });

    it("should be equal presale token amount and change owner token amount", async () => {
      const initialTokenAmount = await presaleToken.balanceOf(owner.address);
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, router],
          [
            ethers.utils.parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            ethers.utils.parseUnits(presalePrice, 18),
            ethers.utils.parseUnits(listingPrice, 18),
            liquidityPrecentage,
          ],
          [
            ethers.utils.parseUnits(minBuyBnb, 18),
            ethers.utils.parseUnits(maxBuyBnb, 18),
            ethers.utils.parseUnits(softCap, 18),
            ethers.utils.parseUnits(hardCap, 18),
          ],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          feeType,
          refundType,
          isWhiteListPhase,
          {
            value: createPresaleFee,
            gasLimit: 3000000,
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
