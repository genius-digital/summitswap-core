import { waffle } from "hardhat";
import { expect, assert } from "chai";
import { Contract, utils } from "ethers";
import SummitReferral from "@built-contracts/SummitReferral.sol/SummitReferral.json";
import WETH from "@built-contracts/utils/WBNB.sol/WBNB.json";
import Token from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import SummitswapFactory from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitswapRouter02 from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";

const { deployContract, provider } = waffle;

describe("Summit Referral", () => {
  const [owner, leadInfluencer, subInfluencer, otherWallet, otherWallet2] = provider.getWallets();
  const feeDenominator = 10 ** 9;
  let weth: Contract;
  let summitswapFactory: Contract;
  let summitswapRouter02: Contract;
  let summitReferral: Contract;
  let tokenA: Contract;
  let tokenB: Contract;
  let tokenR: Contract;

  beforeEach(async () => {
    weth = await deployContract(owner, WETH, []);
    tokenA = await deployContract(owner, Token, []);
    tokenB = await deployContract(owner, Token, []);
    tokenR = await deployContract(owner, Token, []);
    summitswapFactory = await deployContract(owner, SummitswapFactory, [owner.address]);
    summitswapRouter02 = await deployContract(owner, SummitswapRouter02, [summitswapFactory.address, weth.address], {
      gasLimit: 4600000,
    });
    summitReferral = await deployContract(owner, SummitReferral, []);

    await summitswapFactory.setFeeTo(owner.address);
    await summitswapRouter02.setSummitReferral(summitReferral.address);
  });

  describe("owner() should be owner.address", async () => {
    it("owner() should not be otherWallet.address", async () => {
      assert.notEqual(await summitReferral.owner(), otherWallet.address);
    });
    it("owner() should be owner.address", async () => {
      assert.equal(await summitReferral.owner(), owner.address);
    });
  });

  describe("transferOwnership() to otherWallet", async () => {
    it("transferOwnership should not be called by otherWallet", async () => {
      await expect(summitReferral.connect(otherWallet).transferOwnership(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("transferOwnership to otherWallet.address, owner() should be otherWallet.address", async () => {
      assert.equal(await summitReferral.owner(), owner.address);
      await summitReferral.transferOwnership(otherWallet.address);
      assert.equal(await summitReferral.owner(), otherWallet.address);
    });
  });

  describe("SummitSwapRouter should have SummitReferral Address", async () => {
    it("SummitSwapRouter's SummitReferral Address should be summitReferral.address", async () => {
      assert.equal(await summitswapRouter02.summitReferral(), summitReferral.address);
    });
  });

  describe("feeDenominator should be 10**9", async () => {
    it("feeDenominator should be 10^9", async () => {
      assert.equal(await summitReferral.feeDenominator(), feeDenominator);
    });
  });

  describe("Account should be able to RecordReferral", async () => {
    it("OtherWallet's referrer should be address(0)", async () => {
      assert.equal(await summitReferral.getReferrer(otherWallet.address), "0x0000000000000000000000000000000000000000");
    });
    it("LeadInfluencer should be able to record otherWallet as referral ", async () => {
      await summitReferral.recordReferral(otherWallet.address, leadInfluencer.address);
      assert.equal(await summitReferral.getReferrer(otherWallet.address), leadInfluencer.address);
    });
  });

  describe("Account should be able to setFirstBuyFee", async () => {
    it("setFirstBuyFee with otherWallet (Not The Owner) should be reverted", async () => {
      await expect(summitReferral.connect(otherWallet).setFirstBuyFee(tokenA.address, 50000000)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("setFirstBuyFee value should be less than feeDenominator", async () => {
      await expect(summitReferral.setFirstBuyFee(tokenA.address, feeDenominator + 1)).to.be.revertedWith("Wrong Fee");
    });
    it("setFirstBuyFee to 50000000", async () => {
      await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
      const firstBuyFeeTokenA = await summitReferral.getFirstBuyFee(tokenA.address);
      assert.equal(firstBuyFeeTokenA, (50 * feeDenominator) / 100);

      await summitReferral.setFirstBuyFee(weth.address, (50 * feeDenominator) / 100);
      const firstBuyFeeWETH = await summitReferral.getFirstBuyFee(weth.address);
      assert.equal(firstBuyFeeWETH, (50 * feeDenominator) / 100);
    });
  });

  describe("Account should be able to setDevAddress to wallet", async () => {
    it("setDevAddress with otherWallet (Not The Owner) should be reverted", async () => {
      await expect(summitReferral.connect(otherWallet).setDevAddress(otherWallet.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("setDevAddress to wallet", async () => {
      await summitReferral.setDevAddress(owner.address);

      const devAddress = await summitReferral.getDevAddr();
      assert.equal(devAddress, owner.address);
    });
  });

  describe("Account should be able to setRouter to summitswapRouter02.address", async () => {
    it("setRouter with otherWallet (Not The Owner) should be reverted", async () => {
      await expect(summitReferral.connect(otherWallet).setRouter(summitswapRouter02.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("setRouter to summitswapRouter02.address", async () => {
      await summitReferral.setRouter(summitswapRouter02.address);

      const router = await summitReferral.getRouter();
      assert.equal(router, summitswapRouter02.address);
    });
  });

  // Here
  describe("Account should be able to setFeeInfo", async () => {
    it("refFee + devFee in setFeeInfo which is greater than feeDenominator should be reverted", async () => {
      await summitswapFactory.createPair(tokenA.address, tokenB.address);
      const pairAddress = await summitswapFactory.getPair(tokenA.address, tokenB.address);

      await expect(summitReferral.setFeeInfo(pairAddress, tokenR.address, feeDenominator, 1)).to.be.revertedWith(
        "Wrong Fee"
      );
    });
    it("setFeeInfo to TokenB, TokenR, refFee=500000000, devFee=500000000", async () => {
      await summitReferral.setFeeInfo(
        tokenB.address,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100
      );
      const pairInfo = await summitReferral.pairInfo(tokenB.address);
      assert.equal(pairInfo.tokenR, tokenR.address);
      assert.equal(pairInfo.refFee, (5 * feeDenominator) / 100);
      assert.equal(pairInfo.devFee, (5 * feeDenominator) / 100);
    });
    it("setFeeInfo with otherWallet (Not The Owner) should be reverted", async () => {
      await expect(
        summitReferral.connect(otherWallet).setFeeInfo(tokenB.address, tokenR.address, 50000000, 50000000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Account should be able to addLeadInfluencer", async () => {
    it("add LeadInfluencer with fee greater than feeDenominator should be reverted", async () => {
      await expect(summitReferral.addLeadInfluencer(owner.address, feeDenominator + 1)).to.be.revertedWith("Wrong Fee");
    });
    it("add owner as Lead Influencer", async () => {
      await summitReferral.addLeadInfluencer(owner.address, (5 * feeDenominator) / 100);
      const leadInfluencer = await summitReferral.leadInfluencers(owner.address);
      assert.equal(leadInfluencer, true);

      const leadInfFee = await summitReferral.leadInfFee(owner.address);
      assert.equal(leadInfFee, (5 * feeDenominator) / 100);
    });
    it("addLeadInfluencer with otherWallet (Not The Owner) should be reverted", async () => {
      await expect(
        summitReferral.connect(otherWallet).addLeadInfluencer(otherWallet.address, (5 * feeDenominator) / 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Account should be able to removeLeadInfluencer", async () => {
    beforeEach(async () => {
      await summitReferral.addLeadInfluencer(owner.address, (5 * feeDenominator) / 100);
    });
    it("remove owner from Lead Influencer", async () => {
      assert.equal(await summitReferral.leadInfluencers(owner.address), true);
      await summitReferral.removeLeadInfluencer(owner.address);
      assert.equal(await summitReferral.leadInfluencers(owner.address), false);
    });
    it("removeLeadInfluencer with otherWallet (Not The Owner) should be reverted", async () => {
      await expect(summitReferral.connect(otherWallet).removeLeadInfluencer(owner.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("LeadInfluencer should be able to add SubInfluencer", async () => {
    beforeEach(async () => {
      await summitReferral.addLeadInfluencer(leadInfluencer.address, (5 * feeDenominator) / 100);
    });
    it("addSubInfluencer should only be called by Lead Influencer", async () => {
      await expect(
        summitReferral.addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100)
      ).to.be.revertedWith("No permission to add influencer");
    });
    it("LeadInfluencer Should not be able to add LeadInfluencer as SubInfluencer", async () => {
      await summitReferral.addLeadInfluencer(owner.address, 5 * 10 ** 6);
      await expect(
        summitReferral.addSubInfluencer(
          leadInfluencer.address,
          (50 * feeDenominator) / 100,
          (50 * feeDenominator) / 100
        )
      ).to.be.revertedWith("Not able to add lead influencer as a sub influencer");
    });
    it("addSubInfluencer _leadFee + _infFee should be 10^9", async () => {
      await expect(
        summitReferral
          .connect(leadInfluencer)
          .addSubInfluencer(subInfluencer.address, (0.05 * feeDenominator) / 100, (50 * feeDenominator) / 100)
      ).to.be.revertedWith("Wrong Fee");
    });
    it("LeadInfluencer should able to add SubInfluencer", async () => {
      await summitReferral
        .connect(leadInfluencer)
        .addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100);
      const influencer = await summitReferral.influencers(subInfluencer.address);
      assert.equal(influencer.leadAddress, leadInfluencer.address);
      assert.equal(influencer.refFee, (50 * feeDenominator) / 100);
      assert.equal(influencer.leadFee, (50 * feeDenominator) / 100);
    });
    describe("SubInfluencer Test", async () => {
      beforeEach(async () => {
        await summitReferral.addLeadInfluencer(owner.address, 5 * 10 ** 6);
        await summitReferral
          .connect(leadInfluencer)
          .addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100);
      });
      it("Other LeadInfluencer should not be able to add SubInfluencer that already added by another lead", async () => {
        await expect(
          summitReferral.addSubInfluencer(
            subInfluencer.address,
            (50 * feeDenominator) / 100,
            (50 * feeDenominator) / 100
          )
        ).to.be.revertedWith("This address is already added by another lead");
      });
      it("SubInfluencer should not be added as Lead Influencer", async () => {
        await expect(
          summitReferral.addLeadInfluencer(subInfluencer.address, (50 * feeDenominator) / 100)
        ).to.be.revertedWith("Not able to add sub influencer as a lead influencer");
      });
    });
  });

  describe("Account Should able to swap", async () => {
    beforeEach(async () => {
      await summitReferral.recordReferral(otherWallet.address, leadInfluencer.address);
      await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
      await summitReferral.setFirstBuyFee(weth.address, (50 * feeDenominator) / 100);
      await summitReferral.setDevAddress(owner.address);
      await summitReferral.setRouter(summitswapRouter02.address);

      await tokenA.approve(summitswapRouter02.address, utils.parseEther("5").toString());
      await tokenR.approve(summitswapRouter02.address, utils.parseEther("5").toString());

      await summitReferral.addLeadInfluencer(owner.address, (5 * feeDenominator) / 100);
      await summitReferral.addLeadInfluencer(leadInfluencer.address, (5 * feeDenominator) / 100);
      await summitReferral
        .connect(leadInfluencer)
        .addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100);

      await summitswapRouter02.addLiquidityETH(
        tokenA.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );

      await summitswapRouter02.addLiquidityETH(
        tokenR.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );

      const pairAddress = await summitswapFactory.getPair(weth.address, tokenA.address);
      await summitReferral.setFeeInfo(
        pairAddress,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100
      );
    });
    it("swap which is not called by router should be reverted", async () => {
      await expect(summitReferral.swap(owner.address, tokenA.address, tokenB.address, 100, 0)).to.be.revertedWith(
        "caller is not the router"
      );
    });
    it("User will be able to swap eth to exact token", async () => {
      const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
      const amountOut = amount[0];
      const amountIn = amount[1];

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const swapList = await summitReferral.getSwapList(leadInfluencer.address);
      const swapInfo = swapList[0];
      const totalSharedReward = await summitReferral.totalSharedReward(tokenR.address);
      const otherWalletRewardBalance = await summitReferral.rewardBalance(otherWallet.address, tokenR.address);
      const leadInfRewardBalance = await summitReferral.rewardBalance(leadInfluencer.address, tokenR.address);
      const developerRewardBalance = await summitReferral.rewardBalance(owner.address, tokenR.address);

      assert.equal(swapInfo.tokenA, weth.address);
      assert.equal(swapInfo.tokenB, tokenA.address);
      assert.equal(swapInfo.tokenR, tokenR.address);
      assert.equal(swapInfo.amountA.toString(), 2046957198124988);
      assert.equal(swapInfo.amountB.toString(), 100000000000000000);
      assert.equal(swapInfo.amountR.toString(), 5000000000000001);
      assert.equal(swapInfo.amountD.toString(), 5000000000000001);

      assert.equal(totalSharedReward.toString(), "60000000000000020");
      assert.equal(otherWalletRewardBalance.toString(), "50000000000000018");
      assert.equal(leadInfRewardBalance.toString(), "5000000000000001");
      assert.equal(developerRewardBalance.toString(), "5000000000000001");
    });

    it("User will not get reward in the second swap", async () => {
      const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
      const amountOut = amount[0];
      const amountIn = amount[1];

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const totalSharedReward = await summitReferral.totalSharedReward(tokenR.address);
      const otherWalletRewardBalance = await summitReferral.rewardBalance(otherWallet.address, tokenR.address);
      const leadInfRewardBalance = await summitReferral.rewardBalance(leadInfluencer.address, tokenR.address);
      const developerRewardBalance = await summitReferral.rewardBalance(owner.address, tokenR.address);

      assert.equal(totalSharedReward.toString(), "60000000000000020");
      assert.equal(otherWalletRewardBalance.toString(), "50000000000000018");
      assert.equal(leadInfRewardBalance.toString(), "5000000000000001");
      assert.equal(developerRewardBalance.toString(), "5000000000000001");

      const amount2 = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
      const amountOut2 = amount2[0];
      const amountIn2 = amount2[1];
      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut2, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn2 }
      );

      const totalSharedReward2 = await summitReferral.totalSharedReward(tokenR.address);
      const otherWalletRewardBalance2 = await summitReferral.rewardBalance(otherWallet.address, tokenR.address);
      const leadInfRewardBalance2 = await summitReferral.rewardBalance(leadInfluencer.address, tokenR.address);
      const developerRewardBalance2 = await summitReferral.rewardBalance(owner.address, tokenR.address);

      assert.equal(totalSharedReward2.toString(), "70408606658518468");
      assert.equal(otherWalletRewardBalance2.toString(), "50000000000000018"); // other2 wallet remain the same
      assert.equal(leadInfRewardBalance2.toString(), "10204303329259225");
      assert.equal(developerRewardBalance2.toString(), "10204303329259225");
    });
  });

  describe("Account should be able to claimReward", async () => {
    beforeEach(async () => {
      await summitReferral.recordReferral(otherWallet.address, leadInfluencer.address);
      await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
      await summitReferral.setFirstBuyFee(weth.address, (50 * feeDenominator) / 100);
      await summitReferral.setDevAddress(owner.address);
      await summitReferral.setRouter(summitswapRouter02.address);

      await tokenA.approve(summitswapRouter02.address, utils.parseEther("5").toString());
      await tokenR.approve(summitswapRouter02.address, utils.parseEther("5").toString());

      await summitReferral.addLeadInfluencer(owner.address, (5 * feeDenominator) / 100);
      await summitReferral.addLeadInfluencer(leadInfluencer.address, (5 * feeDenominator) / 100);
      await summitReferral
        .connect(leadInfluencer)
        .addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100);

      await summitswapRouter02.addLiquidityETH(
        tokenA.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );

      await summitswapRouter02.addLiquidityETH(
        tokenR.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );

      const pairAddress = await summitswapFactory.getPair(weth.address, tokenA.address);
      await summitReferral.setFeeInfo(
        pairAddress,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100
      );

      const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
      const amountOut = amount[0];
      const amountIn = amount[1];

      await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      await tokenR.transfer(summitReferral.address, utils.parseEther("10").toString());
    });
    it("leadInfluencer should be able to claim reward", async () => {
      const rewardBalance = await summitReferral.rewardBalance(leadInfluencer.address, tokenR.address);
      await summitReferral.connect(leadInfluencer).claimReward(tokenR.address);

      const walletTokenRAmount = await tokenR.balanceOf(leadInfluencer.address);
      const totalSharedReward = await summitReferral.totalSharedReward(tokenR.address);

      assert.equal(rewardBalance.toString(), walletTokenRAmount.toString());
      assert.equal(totalSharedReward.toString(), "55000000000000019");
    });
    it("leadInfluencer should not be able to claim reward when balance is 0", async () => {
      await summitReferral.connect(leadInfluencer).claimReward(tokenR.address);
      const rewardBalance = await summitReferral.rewardBalance(leadInfluencer.address, tokenR.address);
      assert.equal(rewardBalance, 0);
      await expect(summitReferral.connect(leadInfluencer).claimReward(tokenR.address)).to.be.revertedWith(
        "Insufficient balance"
      );
    });
  });

  describe("LeadInfluencer should get reward if SubInfluencer get reward", async () => {
    beforeEach(async () => {
      await summitReferral.recordReferral(otherWallet.address, leadInfluencer.address);
      await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
      await summitReferral.setFirstBuyFee(weth.address, (50 * feeDenominator) / 100);
      await summitReferral.setDevAddress(owner.address);
      await summitReferral.setRouter(summitswapRouter02.address);

      await tokenA.approve(summitswapRouter02.address, utils.parseEther("5").toString());
      await tokenR.approve(summitswapRouter02.address, utils.parseEther("5").toString());

      await summitReferral.addLeadInfluencer(owner.address, (5 * feeDenominator) / 100);
      await summitReferral.addLeadInfluencer(leadInfluencer.address, (5 * feeDenominator) / 100);
      await summitReferral
        .connect(leadInfluencer)
        .addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100);
      await summitReferral.recordReferral(otherWallet2.address, subInfluencer.address);

      await summitswapRouter02.addLiquidityETH(
        tokenA.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );

      await summitswapRouter02.addLiquidityETH(
        tokenR.address, // address token,
        utils.parseEther("5"), // uint amountTokenDesired,
        utils.parseEther("5"), // uint amountTokenMin,
        utils.parseEther("0.1"), // uint amountETHMin,
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: utils.parseEther("0.1") }
      );

      const pairAddress = await summitswapFactory.getPair(weth.address, tokenA.address);
      await summitReferral.setFeeInfo(
        pairAddress,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100
      );
    });
    it("leadInfluencer.address should get reward if subInfluencer.address get reward", async () => {
      const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
      const amountOut = amount[0];
      const amountIn = amount[1];

      await summitswapRouter02.connect(otherWallet2).swapETHForExactTokens(
        amountOut, // uint amountOut
        [weth.address, tokenA.address], // address[] calldata path
        owner.address, // address to
        Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
        { value: amountIn }
      );

      const subInfluencerSwapList = await summitReferral.getSwapList(subInfluencer.address);
      const subInfluencerSwapInfo = subInfluencerSwapList[0];
      assert.equal(subInfluencerSwapInfo.tokenA, weth.address);
      assert.equal(subInfluencerSwapInfo.tokenB, tokenA.address);
      assert.equal(subInfluencerSwapInfo.tokenR, tokenR.address);
      assert.equal(subInfluencerSwapInfo.amountA.toString(), 2046957198124988);
      assert.equal(subInfluencerSwapInfo.amountB.toString(), 100000000000000000);
      assert.equal(subInfluencerSwapInfo.amountR.toString(), 2500000000000000);
      assert.equal(subInfluencerSwapInfo.amountD.toString(), 5000000000000001);

      const leadInfluencerSwapList = await summitReferral.getSwapList(leadInfluencer.address);
      const leadInfluencerSwapInfo = leadInfluencerSwapList[0];
      assert.equal(leadInfluencerSwapInfo.tokenA, weth.address);
      assert.equal(leadInfluencerSwapInfo.tokenB, tokenA.address);
      assert.equal(leadInfluencerSwapInfo.tokenR, tokenR.address);
      assert.equal(leadInfluencerSwapInfo.amountA.toString(), 2046957198124988);
      assert.equal(leadInfluencerSwapInfo.amountB.toString(), 100000000000000000);
      assert.equal(leadInfluencerSwapInfo.amountR.toString(), 2500000000000000);
      assert.equal(leadInfluencerSwapInfo.amountD.toString(), 0);

      const totalSharedReward = await summitReferral.totalSharedReward(tokenR.address);
      const otherWalletRewardBalance = await summitReferral.rewardBalance(otherWallet2.address, tokenR.address);
      const leadInfRewardBalance = await summitReferral.rewardBalance(leadInfluencer.address, tokenR.address);
      const subInfRewardBalance = await summitReferral.rewardBalance(subInfluencer.address, tokenR.address);
      const developerRewardBalance = await summitReferral.rewardBalance(owner.address, tokenR.address);

      assert.equal(totalSharedReward.toString(), "60000000000000019");
      assert.equal(otherWalletRewardBalance.toString(), "50000000000000018");
      assert.equal(leadInfRewardBalance.toString(), "2500000000000000");
      assert.equal(subInfRewardBalance.toString(), "2500000000000000");
      assert.equal(developerRewardBalance.toString(), "5000000000000001");
    });
  });
});
