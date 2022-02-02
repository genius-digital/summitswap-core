import { waffle } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, utils } from "ethers";
import SummitReferralArtifact from "@built-contracts/SummitReferral.sol/SummitReferral.json";
import WETHArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import SummitswapFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitswapRouter02Artifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import { DummyToken, SummitReferral, SummitswapFactory, SummitswapRouter02, WBNB } from "build/typechain";
import { ZERO_ADDRESS } from "src/environment";

const { deployContract, provider } = waffle;

describe("summitReferral", () => {
  const [owner, leadInfluencer, subInfluencer, otherWallet, otherWallet2, dev, manager] = provider.getWallets();
  const feeDenominator = 10 ** 9;
  let weth: WBNB;
  let summitswapFactory: SummitswapFactory;
  let summitswapRouter02: SummitswapRouter02;
  let summitReferral: SummitReferral;
  let tokenA: DummyToken;
  let tokenB: DummyToken;
  let tokenR: DummyToken;

  beforeEach(async () => {
    weth = (await deployContract(owner, WETHArtifact, [])) as WBNB;

    tokenA = (await deployContract(owner, TokenArtifact, [])) as DummyToken;

    tokenB = (await deployContract(owner, TokenArtifact, [])) as DummyToken;

    tokenR = (await deployContract(owner, TokenArtifact, [])) as DummyToken;

    summitswapFactory = (await deployContract(owner, SummitswapFactoryArtifact, [owner.address])) as SummitswapFactory;

    summitswapRouter02 = (await deployContract(
      owner,
      SummitswapRouter02Artifact,
      [summitswapFactory.address, weth.address],
      {
        gasLimit: 4600000,
      }
    )) as SummitswapRouter02;

    summitReferral = (await deployContract(owner, SummitReferralArtifact, [
      dev.address,
      summitswapRouter02.address,
      ZERO_ADDRESS,
      tokenR.address,
      tokenB.address,
    ])) as SummitReferral;

    await summitReferral.setManager(tokenA.address, manager.address, true);
    await summitswapFactory.setFeeTo(owner.address);
    await summitswapRouter02.setSummitReferral(summitReferral.address);
  });

  describe("owner", async () => {
    it("should not be nonOwner", async () => {
      assert.notEqual(await summitReferral.owner(), otherWallet.address);
    });
    it("should be owner", async () => {
      assert.equal(await summitReferral.owner(), owner.address);
    });
  });

  describe("transferOwnership", async () => {
    it("should revert when called by nonOwner", async () => {
      await expect(summitReferral.connect(otherWallet).transferOwnership(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should transfer ownership to otherWallet", async () => {
      assert.equal(await summitReferral.owner(), owner.address);
      await summitReferral.transferOwnership(otherWallet.address);
      assert.equal(await summitReferral.owner(), otherWallet.address);
    });
  });

  describe("feeDenominator", async () => {
    it("should be equal to 10^9", async () => {
      assert.equal((await summitReferral.feeDenominator()).toString(), feeDenominator.toString());
    });
  });

  describe("setDevAddress", async () => {
    it("should revert if called by nonOwner", async () => {
      await expect(summitReferral.connect(otherWallet).setDevAddress(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should correctly set devAddr when called by owner", async () => {
      await summitReferral.setDevAddress(owner.address);
      assert.equal(await summitReferral.devAddr(), owner.address);
    });
  });

  describe("setSummitswapRouter", async () => {
    it("should not set summitswapRouter when called by nonOwner", async () => {
      await expect(summitReferral.connect(otherWallet).setSummitswapRouter(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should set summitswapRouter when called by owner", async () => {
      await summitReferral.setSummitswapRouter(owner.address);
      assert.equal(await summitReferral.summitswapRouter(), owner.address);
    });
  });

  describe("setPancakeswapRouter", async () => {
    it("should not set pancakeswapRouter when called by nonOwner", async () => {
      await expect(summitReferral.connect(otherWallet).setPancakeswapRouter(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should set pancakeswapRouter when called by owner", async () => {
      await summitReferral.setPancakeswapRouter(owner.address);

      assert.equal(await summitReferral.pancakeswapRouter(), owner.address);
    });
  });

  describe("setClaimingFee", async () => {
    it("should revert when when called by nonOwner", async () => {
      await expect(
        summitReferral.connect(otherWallet).setClaimingFee(tokenR.address, (5 * feeDenominator) / 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should set ClaimingFee when called by owner", async () => {
      await summitReferral.setClaimingFee(tokenR.address, (5 * feeDenominator) / 100);

      assert.equal(
        await (await summitReferral.claimingFee(tokenR.address)).toString(),
        String((5 * feeDenominator) / 100)
      );
    });
  });

  describe("setManager", async () => {
    it("should revert if called with nonOwner wallet", async () => {
      await expect(
        summitReferral.connect(otherWallet).setManager(tokenA.address, otherWallet2.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    // it("should add manager for tokenA if called with owner wallet", async () => {
    //   await expect(summitReferral.setManager(tokenA.address, otherWallet2.address, true));
    //   const isManager = await summitReferral.isManager(tokenA.address, otherWallet2.address);
    //   assert.equal(isManager, true);
    // });

    // it("should remove manager for tokenA if called with owner wallet", async () => {
    //   await expect(summitReferral.setManager(tokenA.address, otherWallet2.address, false));
    //   const isManager = await summitReferral.isManager(tokenA.address, otherWallet2.address);
    //   assert.equal(isManager, false);
    // });
  });

  describe("setFirstBuyFee", async () => {
    it("should revert if called by nonManager", async () => {
      await expect(summitReferral.connect(otherWallet).setFirstBuyFee(tokenA.address, 50000000)).to.be.revertedWith(
        "Caller is not the manager of specified token"
      );
    });
    it("should revert if setFirstBuyFee with owner wallet is greater than feeDenominator", async () => {
      await expect(summitReferral.setFirstBuyFee(tokenA.address, feeDenominator + 1)).to.be.revertedWith("Wrong Fee");
    });
    it("should revert if setFirstBuyFee with manager wallet is greater than feeDenominator", async () => {
      await expect(
        summitReferral.connect(manager).setFirstBuyFee(tokenA.address, feeDenominator + 1)
      ).to.be.revertedWith("Wrong Fee");
    });
    it("should set setFirstBuyFee to 50000000 with manager wallet", async () => {
      await summitReferral.connect(manager).setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
      const firstBuyFeeTokenA = await summitReferral.firstBuyRefereeFee(tokenA.address);
      assert.equal(firstBuyFeeTokenA.toString(), String((50 * feeDenominator) / 100));
    });
    it("should set setFirstBuyFee to 50000000 with owner wallet", async () => {
      await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
      const firstBuyFeeTokenA = await summitReferral.firstBuyRefereeFee(tokenA.address);
      assert.equal(firstBuyFeeTokenA.toString(), String((50 * feeDenominator) / 100));
    });
  });

  describe("setFeeInfo", async () => {
    it("should revert if called with nonManager or owner wallet", async () => {
      await expect(
        summitReferral
          .connect(otherWallet)
          .setFeeInfo(tokenB.address, tokenR.address, 50000000, 50000000, "0", "0", "0")
      ).to.be.revertedWith("Caller is not the manager of specified token");
    });
    it("should revert if setFeeInfo with owner wallet and refFee + devFee is greater than feeDenominator", async () => {
      await expect(
        summitReferral.setFeeInfo(tokenA.address, tokenR.address, feeDenominator, 1, "0", "0", "0")
      ).to.be.revertedWith("Wrong Fee");
    });
    it("should revert if setFeeInfo with manager wallet and refFee + devFee is greater than feeDenominator", async () => {
      await expect(
        summitReferral.connect(manager).setFeeInfo(tokenA.address, tokenR.address, feeDenominator, 1, "0", "0", "0")
      ).to.be.revertedWith("Wrong Fee");
    });
    it("should setFeeInfo correctly with owner wallet", async () => {
      await summitReferral.setFeeInfo(
        tokenB.address,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100,
        "0",
        "0",
        "0"
      );
      const feeInfo = await summitReferral.feeInfo(tokenB.address);
      assert.equal(feeInfo.tokenR, tokenR.address);
      assert.equal(feeInfo.refFee.toString(), String((5 * feeDenominator) / 100));
      assert.equal(feeInfo.devFee.toString(), String((5 * feeDenominator) / 100));
    });
    it("should setFeeInfo correctly with manager wallet", async () => {
      await summitReferral.setFeeInfo(
        tokenB.address,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100,
        "0",
        "0",
        "0"
      );
      const feeInfo = await summitReferral.connect(manager).feeInfo(tokenB.address);
      assert.equal(feeInfo.tokenR, tokenR.address);
      assert.equal(feeInfo.refFee.toString(), String((5 * feeDenominator) / 100));
      assert.equal(feeInfo.devFee.toString(), String((5 * feeDenominator) / 100));
    });
  });

  describe("recordReferral", async () => {
    it("should return address(0) if user wasn't referred", async () => {
      assert.equal(await summitReferral.referrers(tokenA.address, otherWallet.address), ZERO_ADDRESS);
    });
    it("should revert if user reffered himself", async () => {
      await expect(
        summitReferral.connect(otherWallet).recordReferral(tokenA.address, otherWallet.address)
      ).to.be.revertedWith("You can't refer yourself");
    });
    it("should revert referrer was burn address", async () => {
      await expect(summitReferral.connect(otherWallet).recordReferral(tokenA.address, ZERO_ADDRESS)).to.be.revertedWith(
        "You can't use burn address as a refferer"
      );
    });
    it("should revert if referred already", async () => {
      await summitReferral.connect(otherWallet).recordReferral(tokenA.address, otherWallet2.address);
      await expect(
        summitReferral.connect(otherWallet).recordReferral(tokenA.address, otherWallet2.address)
      ).to.be.revertedWith("You are already referred on this token");
    });
    it("should be able to record otherWallet as referree", async () => {
      await summitReferral.connect(otherWallet).recordReferral(tokenA.address, otherWallet2.address);
      assert.equal(await summitReferral.referrers(tokenA.address, otherWallet.address), otherWallet2.address);
    });
    it("should able to have more than 1 referral for different token", async () => {
      await summitReferral.connect(otherWallet).recordReferral(tokenA.address, otherWallet2.address);
      await summitReferral.connect(otherWallet).recordReferral(tokenB.address, otherWallet2.address);
      await summitReferral.connect(otherWallet).recordReferral(tokenR.address, owner.address);

      assert.equal(await summitReferral.referrers(tokenA.address, otherWallet.address), otherWallet2.address);
      assert.equal(await summitReferral.referrers(tokenB.address, otherWallet.address), otherWallet2.address);
      assert.equal(await summitReferral.referrers(tokenR.address, otherWallet.address), owner.address);
    });
  });

  describe("setLeadInfluencer", async () => {
    it("should be reverted if called with nonOwner wallet", async () => {
      await expect(
        summitReferral
          .connect(otherWallet)
          .setLeadInfluencer(tokenA.address, otherWallet.address, (5 * feeDenominator) / 100)
      ).to.be.revertedWith("Caller is not the manager of specified token");
    });
    it("should be reverted if with fee is greater than feeDenominator ", async () => {
      await expect(
        summitReferral.setLeadInfluencer(tokenA.address, owner.address, feeDenominator + 1)
      ).to.be.revertedWith("Wrong Fee");
    });
    it("should add otherWallet as a Lead Influencer with owner wallet", async () => {
      await summitReferral.setLeadInfluencer(tokenA.address, owner.address, (5 * feeDenominator) / 100);
      const leadInfluencer = await summitReferral.influencers(tokenA.address, owner.address);
      assert.equal(leadInfluencer.isLead, true);

      assert.equal(leadInfluencer.leadFee.toString(), String((5 * feeDenominator) / 100));
    });
    it("should add otherWallet as a Lead Influencer with manager wallet", async () => {
      await summitReferral
        .connect(manager)
        .setLeadInfluencer(tokenA.address, owner.address, (5 * feeDenominator) / 100);
      const leadInfluencer = await summitReferral.influencers(tokenA.address, owner.address);
      assert.equal(leadInfluencer.isLead, true);

      assert.equal(leadInfluencer.leadFee.toString(), String((5 * feeDenominator) / 100));
    });
    it("should be able to add Sub Influencer as Lead Influencer", async () => {
      await summitReferral
        .connect(manager)
        .setLeadInfluencer(tokenA.address, owner.address, (5 * feeDenominator) / 100);
      await summitReferral.connect(subInfluencer).acceptLeadInfluencer(tokenA.address, owner.address);
      await summitReferral.setSubInfluencer(
        tokenA.address,
        subInfluencer.address,
        (50 * feeDenominator) / 100,
        (50 * feeDenominator) / 100
      );
      let currentSubInfluencer = await summitReferral.influencers(tokenA.address, subInfluencer.address);
      assert.equal(currentSubInfluencer.isLead, false);
      assert.equal(currentSubInfluencer.lead, owner.address);

      await summitReferral
        .connect(manager)
        .setLeadInfluencer(tokenA.address, subInfluencer.address, (5 * feeDenominator) / 100);
      currentSubInfluencer = await summitReferral.influencers(tokenA.address, subInfluencer.address);
      assert.equal(currentSubInfluencer.isLead, true);
      assert.equal(currentSubInfluencer.lead, ZERO_ADDRESS);
      assert.equal(currentSubInfluencer.leadFee.toString(), String((5 * feeDenominator) / 100));
    });
  });

  describe("removeLeadInfluencer", async () => {
    beforeEach(async () => {
      await summitReferral.setLeadInfluencer(tokenA.address, otherWallet.address, (5 * feeDenominator) / 100);
    });
    it("should revert if called with nonManager wallet", async () => {
      await expect(
        summitReferral.connect(otherWallet).removeLeadInfluencer(tokenA.address, owner.address)
      ).to.be.revertedWith("Caller is not the manager of specified token");
    });
    it("should remove otherwallet from Lead Influencer with owner wallet", async () => {
      let influencer = await summitReferral.influencers(tokenA.address, otherWallet.address);
      assert.equal(influencer.isLead, true);
      await summitReferral.removeLeadInfluencer(tokenA.address, otherWallet.address);
      influencer = await summitReferral.influencers(tokenA.address, otherWallet.address);
      assert.equal(influencer.isLead, false);
    });
    it("should remove otherwallet from Lead Influencer with manager wallet", async () => {
      let influencer = await summitReferral.influencers(tokenA.address, otherWallet.address);
      assert.equal(influencer.isLead, true);
      await summitReferral.connect(manager).removeLeadInfluencer(tokenA.address, otherWallet.address);
      influencer = await summitReferral.influencers(tokenA.address, otherWallet.address);
      assert.equal(influencer.isLead, false);
    });
  });

  describe("setSubInfluencer", async () => {
    beforeEach(async () => {
      await summitReferral.setLeadInfluencer(tokenA.address, leadInfluencer.address, (5 * feeDenominator) / 100);
      await summitReferral.connect(subInfluencer).acceptLeadInfluencer(tokenA.address, leadInfluencer.address);
    });
    it("should revert if caller is not leadInfluencer on that outputToken", async () => {
      await expect(
        summitReferral.setSubInfluencer(
          tokenA.address,
          subInfluencer.address,
          (50 * feeDenominator) / 100,
          (50 * feeDenominator) / 100
        )
      ).to.be.revertedWith("You aren't lead influencer on this output token");
    });
    it("should revert if not called by accepted leadInfluencer", async () => {
      await expect(
        summitReferral
          .connect(leadInfluencer)
          .setSubInfluencer(
            tokenA.address,
            otherWallet.address,
            (50 * feeDenominator) / 100,
            (50 * feeDenominator) / 100
          )
      ).to.be.revertedWith("This user didn't accept you as a lead influencer");
    });
    it("should revert if not called by leadInfluencer", async () => {
      await expect(
        summitReferral
          .connect(otherWallet)
          .setSubInfluencer(
            tokenA.address,
            subInfluencer.address,
            (50 * feeDenominator) / 100,
            (50 * feeDenominator) / 100
          )
      ).to.be.revertedWith("You aren't lead influencer on this output token");
    });
    it("should revert if set leadInfluencer as subInfluencer", async () => {
      await summitReferral.connect(leadInfluencer).acceptLeadInfluencer(tokenA.address, leadInfluencer.address);
      await expect(
        summitReferral
          .connect(leadInfluencer)
          .setSubInfluencer(
            tokenA.address,
            leadInfluencer.address,
            (50 * feeDenominator) / 100,
            (50 * feeDenominator) / 100
          )
      ).to.be.revertedWith("User is already lead influencer on this output token");
    });
    it("should revert if _leadFee + _infFee is not equal to feeDenominator", async () => {
      await expect(
        summitReferral
          .connect(leadInfluencer)
          .setSubInfluencer(
            tokenA.address,
            subInfluencer.address,
            (0.05 * feeDenominator) / 100,
            (50 * feeDenominator) / 100
          )
      ).to.be.revertedWith("Wrong Fee");
    });
    it("should revert if ex-leadInfluencer setSubInfluencer", async () => {
      await summitReferral.removeLeadInfluencer(tokenA.address, leadInfluencer.address);
      await expect(
        summitReferral
          .connect(leadInfluencer)
          .setSubInfluencer(
            tokenA.address,
            subInfluencer.address,
            (50 * feeDenominator) / 100,
            (50 * feeDenominator) / 100
          )
      ).to.be.revertedWith("You aren't lead influencer on this output token");
    });
    it("should add subInfluencer if leadInfluencer called and was accepted", async () => {
      await summitReferral
        .connect(leadInfluencer)
        .setSubInfluencer(
          tokenA.address,
          subInfluencer.address,
          (50 * feeDenominator) / 100,
          (50 * feeDenominator) / 100
        );
      const influencer = await summitReferral.influencers(tokenA.address, subInfluencer.address);
      assert.equal(influencer.lead, leadInfluencer.address);
      assert.equal(influencer.refFee.toString(), String((50 * feeDenominator) / 100));
      assert.equal(influencer.leadFee.toString(), String((50 * feeDenominator) / 100));
    });
    it("should add subInfluencer if leadInfluencer called and was accepted, even if subInfluencer has Lead already", async () => {
      await summitReferral
        .connect(leadInfluencer)
        .setSubInfluencer(
          tokenA.address,
          subInfluencer.address,
          (50 * feeDenominator) / 100,
          (50 * feeDenominator) / 100
        );
      let influencer = await summitReferral.influencers(tokenA.address, subInfluencer.address);
      assert.equal(influencer.lead, leadInfluencer.address);

      await summitReferral.setLeadInfluencer(tokenA.address, owner.address, (5 * feeDenominator) / 100);
      await summitReferral.connect(subInfluencer).acceptLeadInfluencer(tokenA.address, owner.address);
      await summitReferral.setSubInfluencer(
        tokenA.address,
        subInfluencer.address,
        (70 * feeDenominator) / 100,
        (30 * feeDenominator) / 100
      );
      influencer = await summitReferral.influencers(tokenA.address, subInfluencer.address);
      assert.equal(influencer.lead, owner.address);
      assert.equal(influencer.refFee.toString(), String((30 * feeDenominator) / 100));
      assert.equal(influencer.leadFee.toString(), String((70 * feeDenominator) / 100));
    });
  });

  // describe("getSwapListCount", async () => {});

  // describe("SummitSwapRouter should have SummitReferral Address", async () => {
  //   it("SummitSwapRouter's SummitReferral Address should be summitReferral.address", async () => {
  //     assert.equal(await summitswapRouter02.summitReferral(), summitReferral.address);
  //   });
  // });

  describe("swap", async () => {
    let amountOut: BigNumber;
    let amountIn: BigNumber;

    beforeEach(async () => {
      await summitReferral.setFeeInfo(
        tokenA.address,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100,
        "0",
        "0",
        "0"
      );

      await tokenA.transfer(summitReferral.address, utils.parseEther("50"));
      await tokenB.transfer(summitReferral.address, utils.parseEther("50"));
      await tokenR.transfer(summitReferral.address, utils.parseEther("50"));

      await summitReferral.connect(otherWallet).recordReferral(tokenA.address, leadInfluencer.address);
      await summitReferral.connect(otherWallet).recordReferral(tokenB.address, leadInfluencer.address);
      await summitReferral.connect(otherWallet2).recordReferral(tokenA.address, subInfluencer.address);

      await tokenA.approve(summitswapRouter02.address, utils.parseEther("5").toString());
      await tokenB.approve(summitswapRouter02.address, utils.parseEther("5").toString());
      await tokenR.approve(summitswapRouter02.address, utils.parseEther("5").toString());

      await summitswapRouter02.addLiquidityETH(
        tokenA.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("1") }
      );

      await summitswapRouter02.addLiquidityETH(
        tokenB.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("1") }
      );

      await summitswapRouter02.addLiquidityETH(
        tokenR.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("1") }
      );

      const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
      amountOut = amount[1];
      amountIn = amount[0];
    });
    it("should revert if called by nonSummitswapRouter", async () => {
      await expect(summitReferral.swap(owner.address, tokenA.address, tokenB.address, 100, 0)).to.be.revertedWith(
        "Caller is not the router"
      );
    });
    it("should give rewards when calling ethForExactTokens on router", async () => {
      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const referrerRewardAmount = amountOut.mul(5).div(100);
      const devRewardAmount = amountOut.mul(5).div(100);

      // Balances
      const leadBalance = await summitReferral
        .balances(tokenA.address, leadInfluencer.address)
        .then((o) => o.toString());
      assert.equal(leadBalance, referrerRewardAmount.toString());

      const devBalance = await summitReferral.balances(tokenA.address, dev.address).then((o) => o.toString());
      assert.equal(devBalance, devRewardAmount.toString());

      // Other
      const totalReward = await summitReferral.totalReward(tokenA.address).then((o) => o.toString());
      const referrerAndDevReward = referrerRewardAmount.add(devRewardAmount);
      assert.equal(totalReward, referrerAndDevReward.toString());
    });
    it("should give promotion rewards when calling ethForExactTokens on router", async () => {
      await summitReferral.setFeeInfo(
        tokenA.address,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100,
        (15 * feeDenominator) / 100,
        "0",
        Math.floor(Date.now() / 1000) + 24 * 60 * 60
      );

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const referrerRewardAmount = amountOut.mul(15).div(100);
      const devRewardAmount = amountOut.mul(5).div(100);

      // Balances
      const leadBalance = await summitReferral
        .balances(tokenA.address, leadInfluencer.address)
        .then((o) => o.toString());
      assert.equal(leadBalance, referrerRewardAmount.toString());

      const devBalance = await summitReferral.balances(tokenA.address, dev.address).then((o) => o.toString());
      assert.equal(devBalance, devRewardAmount.toString());

      // Other
      const totalReward = await summitReferral.totalReward(tokenA.address).then((o) => o.toString());
      const referrerAndDevReward = referrerRewardAmount.add(devRewardAmount);
      assert.equal(totalReward, referrerAndDevReward.toString());
    });
    it("should give reward when swapping for the first time", async () => {
      await summitReferral.setFirstBuyFee(tokenA.address, (5 * feeDenominator) / 100);

      let referreRewardBalance = await tokenA.balanceOf(otherWallet.address).then((o) => o.toString());
      assert.equal(referreRewardBalance, "0");

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const subReward = amountOut.mul(5).div(100);
      const devReward = amountOut.mul(5).div(100);

      referreRewardBalance = await tokenA.balanceOf(otherWallet.address).then((o) => o.toString());
      const referreeBalanceShouldBe = amountOut.mul(5).div(100).toString();
      assert.equal(referreRewardBalance, referreeBalanceShouldBe);

      const totalRewardBalance = await summitReferral.totalReward(tokenA.address).then((o) => o.toString());
      assert.equal(totalRewardBalance, subReward.add(devReward).toString());
    });
    it("shouldn't give reward when swapping for the second time", async () => {
      await summitReferral.setFirstBuyFee(tokenA.address, (5 * feeDenominator) / 100);

      let referreRewardBalance = await tokenA.balanceOf(otherWallet.address).then((o) => o.toString());
      assert.equal(referreRewardBalance, "0");

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      referreRewardBalance = await tokenA.balanceOf(otherWallet.address).then((o) => o.toString());
      const referreeBalanceShouldBe = amountOut.mul(5).div(100).toString();
      assert.equal(referreRewardBalance, referreeBalanceShouldBe);

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn.mul(2) }
      );

      referreRewardBalance = await tokenA.balanceOf(otherWallet.address).then((o) => o.toString());
      assert.equal(referreRewardBalance, referreeBalanceShouldBe);
    });
    it("should give correct rewards to lead when lead influencer referrs", async () => {
      await summitReferral.setLeadInfluencer(tokenA.address, leadInfluencer.address, (20 * feeDenominator) / 100);

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const leadReward = amountOut.mul(20).div(100).add(amountOut.mul(5).div(100));
      const devReward = amountOut.mul(5).div(100);

      // Balances
      const leadBalance = await summitReferral.balances(tokenA.address, leadInfluencer.address);
      assert.equal(leadBalance.toString(), leadReward.toString());

      const devBalance = await summitReferral.balances(tokenA.address, dev.address);
      assert.equal(devBalance.toString(), devReward.toString());

      const totalRewardBalance = await summitReferral.totalReward(tokenA.address);
      assert.equal(totalRewardBalance.toString(), leadReward.add(devReward).toString());
    });
    it("should give rewards to lead, sub and dev when sub influencer referrs", async () => {
      await summitReferral.setLeadInfluencer(tokenA.address, leadInfluencer.address, (20 * feeDenominator) / 100);
      await summitReferral.connect(subInfluencer).acceptLeadInfluencer(tokenA.address, leadInfluencer.address);
      await summitReferral
        .connect(leadInfluencer)
        .setSubInfluencer(
          tokenA.address,
          subInfluencer.address,
          (60 * feeDenominator) / 100,
          (40 * feeDenominator) / 100
        );

      await summitswapRouter02.connect(otherWallet2).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const leadFee = amountOut.mul(20).div(100);
      const leadReward = leadFee.mul(60).div(100);
      const subReward = leadFee.mul(40).div(100).add(amountOut.mul(5).div(100));
      const devReward = amountOut.mul(5).div(100);

      // Balances
      const leadBalance = await summitReferral.balances(tokenA.address, leadInfluencer.address);
      assert.equal(leadBalance.toString(), leadReward.toString());

      const subInfluencerBalance = await summitReferral.balances(tokenA.address, subInfluencer.address);
      assert.equal(subInfluencerBalance.toString(), subReward.toString());

      const devBalance = await summitReferral.balances(tokenA.address, dev.address);
      assert.equal(devBalance.toString(), devReward.toString());

      const totalRewardBalance = await summitReferral.totalReward(tokenA.address);
      assert.equal(totalRewardBalance.toString(), leadReward.add(subReward).add(devReward).toString());
    });

    describe("claiming", async () => {
      let leadRewardBalanceIndex: BigNumber;
      let leadHasBalance: string;
      let isValidLeadRewardBalanceIndex: boolean;

      let refReward: BigNumber;
      let devReward: BigNumber;

      beforeEach(async () => {
        assert.equal((await tokenA.balanceOf(leadInfluencer.address)).toString(), "0");
        assert.equal((await tokenR.balanceOf(leadInfluencer.address)).toString(), "0");
        assert.equal((await tokenB.balanceOf(leadInfluencer.address)).toString(), "0");
        assert.equal((await summitReferral.balances(tokenA.address, leadInfluencer.address)).toString(), "0");
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), "0");

        await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
          amountOut, // uint amountOut
          [weth.address, tokenA.address], // address[] calldata path
          owner.address, // address to
          Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
          { value: amountIn }
        );

        refReward = amountOut.mul(5).div(100);
        devReward = amountOut.mul(5).div(100);

        assert.equal((await tokenA.balanceOf(leadInfluencer.address)).toString(), "0");
        assert.equal(
          (await summitReferral.balances(tokenA.address, leadInfluencer.address)).toString(),
          refReward.toString()
        );
        assert.equal(
          (await summitReferral.totalReward(tokenA.address)).toString(),
          refReward.add(devReward).toString()
        );

        leadRewardBalanceIndex = await summitReferral.hasBalanceIndex(tokenA.address, leadInfluencer.address);
        leadHasBalance = await summitReferral.hasBalance(leadInfluencer.address, leadRewardBalanceIndex);
        isValidLeadRewardBalanceIndex = await summitReferral.isBalanceIndex(tokenA.address, leadInfluencer.address);

        assert.equal(leadHasBalance, tokenA.address);
        assert.equal(isValidLeadRewardBalanceIndex, true);
      });
      it("should revert if balance is 0", async () => {
        await expect(
          summitReferral.connect(otherWallet2).claimRewardIn(tokenA.address, tokenA.address)
        ).to.be.revertedWith("Insufficient balance");
      });
      it("should revert if claiming in unknown token", async () => {
        await expect(
          summitReferral.connect(otherWallet).claimRewardIn(tokenA.address, ZERO_ADDRESS)
        ).to.be.revertedWith("You can't claim in that token");
      });
      it("should be able claim rewards in outputToken", async () => {
        await summitReferral.connect(leadInfluencer).claimRewardIn(tokenA.address, tokenA.address);

        leadRewardBalanceIndex = await summitReferral.hasBalanceIndex(tokenA.address, leadInfluencer.address);
        isValidLeadRewardBalanceIndex = await summitReferral.isBalanceIndex(tokenA.address, leadInfluencer.address);

        assert.equal(leadHasBalance, tokenA.address);
        assert.equal(isValidLeadRewardBalanceIndex, false);

        assert.equal((await tokenA.balanceOf(leadInfluencer.address)).toString(), refReward.toString());
        assert.equal((await summitReferral.balances(tokenA.address, leadInfluencer.address)).toString(), "0");
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), refReward.toString());

        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), devReward.toString());
      });
      it("should be able claim rewards in rewardToken", async () => {
        const shouldGetRewardTokenAmount = await summitswapRouter02
          .getAmountsOut(amountOut.mul(5).div(100), [tokenA.address, await summitswapRouter02.WETH(), tokenR.address])
          .then((o) => o[2]);

        await summitReferral.connect(leadInfluencer).claimRewardIn(tokenA.address, tokenR.address);

        leadRewardBalanceIndex = await summitReferral.hasBalanceIndex(tokenA.address, leadInfluencer.address);
        isValidLeadRewardBalanceIndex = await summitReferral.isBalanceIndex(tokenA.address, leadInfluencer.address);

        assert.equal(leadHasBalance, tokenA.address);
        assert.equal(isValidLeadRewardBalanceIndex, false);

        assert.equal(
          (await tokenR.balanceOf(leadInfluencer.address)).toString(),
          shouldGetRewardTokenAmount.toString()
        );
        assert.equal((await summitReferral.balances(tokenA.address, leadInfluencer.address)).toString(), "0");
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), refReward.toString());
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), devReward.toString());
      });
      it("should be able claim 1 reward using claimAllRewardsIn", async () => {
        const shoulGetTokenRAmount = await summitswapRouter02
          .getAmountsOut(amountOut.mul(5).div(100), [tokenA.address, await summitswapRouter02.WETH(), tokenR.address])
          .then((o) => o[2]);

        await summitReferral.connect(leadInfluencer).claimAllRewardsIn(tokenR.address);

        leadRewardBalanceIndex = await summitReferral.hasBalanceIndex(tokenA.address, leadInfluencer.address);
        isValidLeadRewardBalanceIndex = await summitReferral.isBalanceIndex(tokenA.address, leadInfluencer.address);

        assert.equal(leadHasBalance, tokenA.address);
        assert.equal(isValidLeadRewardBalanceIndex, false);

        assert.equal((await tokenR.balanceOf(leadInfluencer.address)).toString(), shoulGetTokenRAmount.toString());
        assert.equal((await summitReferral.balances(tokenA.address, leadInfluencer.address)).toString(), "0");
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), refReward.toString());
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), devReward.toString());
      });
      it("should be able claim 1 reward using claimAllRewardsInOutput", async () => {
        await summitReferral.connect(leadInfluencer).claimAllRewardsInOutput();

        leadRewardBalanceIndex = await summitReferral.hasBalanceIndex(tokenA.address, leadInfluencer.address);
        isValidLeadRewardBalanceIndex = await summitReferral.isBalanceIndex(tokenA.address, leadInfluencer.address);

        assert.equal(leadHasBalance, tokenA.address);
        assert.equal(isValidLeadRewardBalanceIndex, false);

        assert.equal((await tokenA.balanceOf(leadInfluencer.address)).toString(), refReward.toString());
        assert.equal((await summitReferral.balances(tokenA.address, leadInfluencer.address)).toString(), "0");
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), refReward.toString());
        assert.equal((await summitReferral.totalReward(tokenA.address)).toString(), devReward.toString());
      });
      it("should claim multiple tokens using claim all", async () => {
        await summitReferral.setFeeInfo(
          tokenB.address,
          tokenR.address,
          (5 * feeDenominator) / 100,
          (5 * feeDenominator) / 100,
          "0",
          "0",
          "0"
        );

        await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
          amountOut, // uint amountOut
          [weth.address, tokenB.address], // address[] calldata path
          owner.address, // address to
          Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
          { value: amountIn.mul(2) }
        );

        let balancesLength = await summitReferral.getBalancesLength(leadInfluencer.address);
        assert.equal(balancesLength.toString(), "2");

        await summitReferral.connect(leadInfluencer).claimAllRewardsInOutput();

        balancesLength = await summitReferral.getBalancesLength(leadInfluencer.address);
        assert.equal(balancesLength.toString(), "0");

        assert.equal((await tokenA.balanceOf(leadInfluencer.address)).toString(), refReward.toString());
        assert.equal((await tokenB.balanceOf(leadInfluencer.address)).toString(), refReward.toString());
      });
    });
  });
});
