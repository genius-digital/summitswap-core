import PresaleFactoryArtifact from "@built-contracts/SummitFactoryPresale.sol/SummitFactoryPresale.json";
import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import { DummyToken, SummitFactoryPresale, SummitswapFactory, SummitswapRouter02, WBNB } from "build/typechain";
import { assert, expect } from "chai";
import dayjs from "dayjs";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, waffle } from "hardhat";
import { MAX_VALUE, ZERO_ADDRESS } from "src/environment";

const { deployContract, provider } = waffle;

describe("SummitFactoryPresale", () => {
  const [owner, serviceFeeReceiver, otherWallet1, summitFactoryFeeToSetter] = provider.getWallets();

  let presaleFactory: SummitFactoryPresale;
  let presaleToken: DummyToken;
  let wbnb: WBNB;
  let summitFactory: SummitswapFactory;
  let summitRouter: SummitswapRouter02;

  const serviceFee = parseEther("0.00010");
  const updatedServiceFee = parseEther("0.00012");

  const presalePrice = "100";
  const listingPrice = "100";
  const liquidityLockTime = 12 * 60;
  const minBuy = "0.1";
  const maxBuy = "0.2";
  const softCap = "0.1";
  const hardCap = "0.2";
  const liquidityPrecentage = 70;
  const startPresaleTime = dayjs().add(1, "day").unix();
  const endPresaleTime = dayjs().add(2, "day").unix();
  const refundType = 0;
  const isWhiteListPhase = false;

  beforeEach(async () => {
    presaleFactory = (await deployContract(owner, PresaleFactoryArtifact, [
      serviceFee,
      serviceFeeReceiver.address,
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
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
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
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
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
            [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
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
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
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
            [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
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
            [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            dayjs(startPresaleTime).subtract(2, "day").unix(),
            endPresaleTime,
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
            [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            dayjs(endPresaleTime).subtract(2, "day").unix(),
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Presale End time should be greater than presale start time");
    });

    it("should be reverted, if minBuy greater than maxBuy", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [
              parseEther((Number(minBuy) + Number(maxBuy)).toString()),
              parseEther(maxBuy),
              parseEther(softCap),
              parseEther(hardCap),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("MinBuy should be less than maxBuy");
    });

    it("should be reverted, if softCap less than 50% of hardCap", async () => {
      await expect(
        presaleFactory
          .connect(owner)
          .createPresale(
            [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage,
            ],
            [
              parseEther(minBuy),
              parseEther(maxBuy),
              parseEther((Number(hardCap) * 0.4).toString()),
              parseEther(hardCap),
            ],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
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
            [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
            [
              parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
              parseEther(presalePrice),
              parseEther(listingPrice),
              liquidityPrecentage - 30,
            ],
            [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
            liquidityLockTime,
            startPresaleTime,
            endPresaleTime,
            refundType,
            isWhiteListPhase,
            {
              value: serviceFee,
            }
          )
      ).to.be.revertedWith("Liquidity Percentage should be Greater than or equal to 51%");
    });

    it("should be able to set insert newly created presale address into presaleAddresses and tokenPresales", async () => {
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );
      const presaleAddress = await presaleFactory.presaleAddresses(0);
      const presaleAddressFromTokenPresales = (await presaleFactory.getTokenPresales(presaleToken.address))[0];
      assert.equal(presaleAddress, presaleAddressFromTokenPresales);
    });

    it("should be able to send service fee to serviceFeeReceiver address", async () => {
      const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
      await presaleFactory
        .connect(owner)
        .createPresale(
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
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
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
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
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
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
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
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
          [presaleToken.address, summitRouter.address, feeToken.address, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
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
          [presaleToken.address, summitRouter.address, ZERO_ADDRESS, ZERO_ADDRESS],
          [
            parseUnits(tokenAmount.toString(), await presaleToken.decimals()),
            parseEther(presalePrice),
            parseEther(listingPrice),
            liquidityPrecentage,
          ],
          [parseEther(minBuy), parseEther(maxBuy), parseEther(softCap), parseEther(hardCap)],
          liquidityLockTime,
          startPresaleTime,
          endPresaleTime,
          refundType,
          isWhiteListPhase,
          {
            value: serviceFee,
          }
        );
      const tokenPresales = await presaleFactory.getTokenPresales(presaleToken.address);
      assert.equal(tokenPresales.length, 1);
    });
  });
});
