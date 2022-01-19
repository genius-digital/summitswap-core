import { waffle } from "hardhat";
import { expect, assert } from "chai";
import { utils } from "ethers";
import SummitReferralArtifact from "@built-contracts/SummitReferral.sol/SummitReferral.json";
import WETHArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
import TokenArtifact from "@built-contracts/utils/DummyToken.sol/DummyToken.json";
import SummitswapFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitswapRouter02Artifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
import { DummyToken, SummitReferral, SummitswapFactory, SummitswapRouter02, WBNB } from "build/typechain";

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
      summitswapRouter02.address,
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
      assert.equal(await (await summitReferral.feeDenominator()).toString(), feeDenominator.toString());
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
    it("should revert if setFirstBuyFee is greater than feeDenominator", async () => {
      await expect(summitReferral.setFirstBuyFee(tokenA.address, feeDenominator + 1)).to.be.revertedWith("Wrong Fee");
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
    it("should revert if called with nonManager wallet", async () => {
      await expect(
        summitReferral.connect(otherWallet).setFeeInfo(tokenB.address, tokenR.address, 50000000, 50000000)
      ).to.be.revertedWith("Caller is not the manager of specified token");
    });
    it("should revert if refFee + devFee is greater than feeDenominator", async () => {
      await expect(summitReferral.setFeeInfo(tokenA.address, tokenR.address, feeDenominator, 1)).to.be.revertedWith(
        "Wrong Fee"
      );
    });
    it("should set fee info correctly", async () => {
      await summitReferral.setFeeInfo(
        tokenB.address,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100
      );
      const feeInfo = await summitReferral.feeInfo(tokenB.address);
      assert.equal(feeInfo.tokenR, tokenR.address);
      assert.equal(feeInfo.refFee.toString(), String((5 * feeDenominator) / 100));
      assert.equal(feeInfo.devFee.toString(), String((5 * feeDenominator) / 100));
    });
  });

  describe("recordReferral", async () => {
    it("should return address(0) if user wasn't referred", async () => {
      assert.equal(
        await summitReferral.referrers(tokenA.address, otherWallet.address),
        "0x0000000000000000000000000000000000000000"
      );
    });
    it("should be able to record otherWallet as referree", async () => {
      await summitReferral.connect(otherWallet).recordReferral(tokenA.address, otherWallet2.address);
      assert.equal(await summitReferral.referrers(tokenA.address, otherWallet.address), otherWallet2.address);
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
    it("should add otherWallet as a Lead Influencer", async () => {
      await summitReferral.setLeadInfluencer(tokenA.address, owner.address, (5 * feeDenominator) / 100);
      const leadInfluencer = await summitReferral.influencers(tokenA.address, owner.address);
      assert.equal(leadInfluencer.isLead, true);

      assert.equal(leadInfluencer.leadFee.toString(), String((5 * feeDenominator) / 100));
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
    it("should remove otherwallet from Lead Influencer", async () => {
      let influencer = await summitReferral.influencers(tokenA.address, otherWallet.address);
      assert.equal(influencer.isLead, true);
      await summitReferral.removeLeadInfluencer(tokenA.address, otherWallet.address);
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
    it("should not set leadInfluencer as subInfluencer", async () => {
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
  });

  // describe("getSwapListCount", async () => {});

  // describe("SummitSwapRouter should have SummitReferral Address", async () => {
  //   it("SummitSwapRouter's SummitReferral Address should be summitReferral.address", async () => {
  //     assert.equal(await summitswapRouter02.summitReferral(), summitReferral.address);
  //   });
  // });

  describe("swap", async () => {
    beforeEach(async () => {
      await summitReferral.connect(otherWallet).recordReferral(tokenA.address, leadInfluencer.address);
      await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
      await summitReferral.setFirstBuyFee(weth.address, (50 * feeDenominator) / 100);

      await tokenA.approve(summitswapRouter02.address, utils.parseEther("5").toString());
      await tokenR.approve(summitswapRouter02.address, utils.parseEther("5").toString());

      await summitReferral.setLeadInfluencer(tokenA.address, owner.address, (5 * feeDenominator) / 100);
      await summitReferral.setLeadInfluencer(tokenA.address, leadInfluencer.address, (5 * feeDenominator) / 100);
      await summitReferral.connect(subInfluencer).acceptLeadInfluencer(tokenA.address, leadInfluencer.address);
      await summitReferral
        .connect(leadInfluencer)
        .setSubInfluencer(
          tokenA.address,
          subInfluencer.address,
          (50 * feeDenominator) / 100,
          (50 * feeDenominator) / 100
        );

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

      await summitReferral.setFeeInfo(
        tokenA.address,
        tokenR.address,
        (5 * feeDenominator) / 100,
        (5 * feeDenominator) / 100
      );

      await tokenR.transfer(summitReferral.address, utils.parseEther("50"));
    });
    it("should revert if called by nonSummitswapRouter", async () => {
      await expect(summitReferral.swap(owner.address, tokenA.address, tokenB.address, 100, 0)).to.be.revertedWith(
        "Caller is not the router"
      );
    });
    it("should give rewards when calling ethForExactTokens on router", async () => {
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

      // const swapInfo = await summitReferral.swapList(leadInfluencer.address, 0);
      // const totalSharedReward = await summitReferral.totalReward(tokenR.address);
      // const otherWalletRewardBalance = await summitReferral.balances(otherWallet.address, tokenR.address);
      // const leadInfRewardBalance = await summitReferral.balances(leadInfluencer.address, tokenR.address);
      // const developerRewardBalance = await summitReferral.balances(owner.address, tokenR.address);

      // assert.equal(swapInfo.tokenA, weth.address);
      // assert.equal(swapInfo.tokenB, tokenA.address);
      // assert.equal(swapInfo.tokenR, tokenR.address);
      // assert.equal(swapInfo.amountA.toString(), "2046957198124988");
      // assert.equal(swapInfo.amountB.toString(), "100000000000000000");
      // assert.equal(swapInfo.amountR.toString(), "5000000000000001");
      // assert.equal(swapInfo.amountD.toString(), "5000000000000001");

      // assert.equal(totalSharedReward.toString(), "60000000000000020");
      // assert.equal(otherWalletRewardBalance.toString(), "50000000000000018");
      // assert.equal(leadInfRewardBalance.toString(), "5000000000000001");
      // assert.equal(developerRewardBalance.toString(), "5000000000000001");
    });

    // it("User will not get reward in the second swap", async () => {
    //   const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
    //   const amountOut = amount[0];
    //   const amountIn = amount[1];

    //   await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
    //     amountOut, // uint amountOut
    //     [weth.address, tokenA.address], // address[] calldata path
    //     owner.address, // address to
    //     Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
    //     { value: amountIn }
    //   );

    //   const totalSharedReward = await summitReferral.totalSharedReward(tokenR.address);
    //   const otherWalletRewardBalance = await summitReferral._balances(otherWallet.address, tokenR.address);
    //   const leadInfRewardBalance = await summitReferral._balances(leadInfluencer.address, tokenR.address);
    //   const developerRewardBalance = await summitReferral._balances(owner.address, tokenR.address);

    //   assert.equal(totalSharedReward.toString(), "60000000000000020");
    //   assert.equal(otherWalletRewardBalance.toString(), "50000000000000018");
    //   assert.equal(leadInfRewardBalance.toString(), "5000000000000001");
    //   assert.equal(developerRewardBalance.toString(), "5000000000000001");

    //   const amount2 = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
    //   const amountOut2 = amount2[0];
    //   const amountIn2 = amount2[1];
    //   await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
    //     amountOut2, // uint amountOut
    //     [weth.address, tokenA.address], // address[] calldata path
    //     owner.address, // address to
    //     Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
    //     { value: amountIn2 }
    //   );

    //   const totalSharedReward2 = await summitReferral.totalSharedReward(tokenR.address);
    //   const otherWalletRewardBalance2 = await summitReferral._balances(otherWallet.address, tokenR.address);
    //   const leadInfRewardBalance2 = await summitReferral._balances(leadInfluencer.address, tokenR.address);
    //   const developerRewardBalance2 = await summitReferral._balances(owner.address, tokenR.address);

    //   assert.equal(totalSharedReward2.toString(), "70408606658518468");
    //   assert.equal(otherWalletRewardBalance2.toString(), "50000000000000018"); // other2 wallet remain the same
    //   assert.equal(leadInfRewardBalance2.toString(), "10204303329259225");
    //   assert.equal(developerRewardBalance2.toString(), "10204303329259225");
    // });
  });

  // xdescribe("Account should be able to claimReward", async () => {
  //   beforeEach(async () => {
  //     await summitReferral.connect(otherWallet).recordReferral(leadInfluencer.address);
  //     await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
  //     await summitReferral.setFirstBuyFee(weth.address, (50 * feeDenominator) / 100);
  //     await summitReferral.setDevAddress(owner.address);
  //     await summitReferral.setRouter(summitswapRouter02.address);

  //     await tokenA.approve(summitswapRouter02.address, utils.parseEther("5").toString());
  //     await tokenR.approve(summitswapRouter02.address, utils.parseEther("5").toString());

  //     await summitReferral.addLeadInfluencer(owner.address, (5 * feeDenominator) / 100);
  //     await summitReferral.addLeadInfluencer(leadInfluencer.address, (5 * feeDenominator) / 100);
  //     await summitReferral
  //       .connect(leadInfluencer)
  //       .addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100);

  //     await summitswapRouter02.addLiquidityETH(
  //       tokenA.address, // address token,
  //       utils.parseEther("5"), // uint amountTokenDesired,
  //       utils.parseEther("5"), // uint amountTokenMin,
  //       utils.parseEther("0.1"), // uint amountETHMin,
  //       owner.address, // address to
  //       Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
  //       { value: utils.parseEther("0.1") }
  //     );

  //     await summitswapRouter02.addLiquidityETH(
  //       tokenR.address, // address token,
  //       utils.parseEther("5"), // uint amountTokenDesired,
  //       utils.parseEther("5"), // uint amountTokenMin,
  //       utils.parseEther("0.1"), // uint amountETHMin,
  //       owner.address, // address to
  //       Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
  //       { value: utils.parseEther("0.1") }
  //     );

  //     const pairAddress = await summitswapFactory.getPair(weth.address, tokenA.address);
  //     await summitReferral.setFeeInfo(
  //       pairAddress,
  //       tokenR.address,
  //       (5 * feeDenominator) / 100,
  //       (5 * feeDenominator) / 100
  //     );

  //     const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
  //     const amountOut = amount[0];
  //     const amountIn = amount[1];

  //     await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
  //       amountOut, // uint amountOut
  //       [weth.address, tokenA.address], // address[] calldata path
  //       owner.address, // address to
  //       Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
  //       { value: amountIn }
  //     );

  //     await tokenR.transfer(summitReferral.address, utils.parseEther("10").toString());
  //   });
  //   it("leadInfluencer should be able to claim reward", async () => {
  //     const rewardBalance = await summitReferral._balances(leadInfluencer.address, tokenR.address);
  //     await summitReferral.connect(leadInfluencer).claimReward(tokenR.address);

  //     const walletTokenRAmount = await tokenR.balanceOf(leadInfluencer.address);
  //     const totalSharedReward = await summitReferral.totalSharedReward(tokenR.address);

  //     assert.equal(rewardBalance.toString(), walletTokenRAmount.toString());
  //     assert.equal(totalSharedReward.toString(), "55000000000000019");
  //   });
  //   it("leadInfluencer should not be able to claim reward when balance is 0", async () => {
  //     await summitReferral.connect(leadInfluencer).claimReward(tokenR.address);
  //     const rewardBalance = await summitReferral._balances(leadInfluencer.address, tokenR.address);
  //     assert.equal(rewardBalance.toString(), "0");
  //     await expect(summitReferral.connect(leadInfluencer).claimReward(tokenR.address)).to.be.revertedWith(
  //       "Insufficient balance"
  //     );
  //   });
  // });

  // xdescribe("LeadInfluencer should get reward if SubInfluencer get reward", async () => {
  //   beforeEach(async () => {
  //     await summitReferral.connect(otherWallet).recordReferral(leadInfluencer.address);
  //     await summitReferral.setFirstBuyFee(tokenA.address, (50 * feeDenominator) / 100);
  //     await summitReferral.setFirstBuyFee(weth.address, (50 * feeDenominator) / 100);
  //     await summitReferral.setDevAddress(owner.address);
  //     await summitReferral.setRouter(summitswapRouter02.address);

  //     await tokenA.approve(summitswapRouter02.address, utils.parseEther("5").toString());
  //     await tokenR.approve(summitswapRouter02.address, utils.parseEther("5").toString());

  //     await summitReferral.addLeadInfluencer(owner.address, (5 * feeDenominator) / 100);
  //     await summitReferral.addLeadInfluencer(leadInfluencer.address, (5 * feeDenominator) / 100);
  //     await summitReferral
  //       .connect(leadInfluencer)
  //       .addSubInfluencer(subInfluencer.address, (50 * feeDenominator) / 100, (50 * feeDenominator) / 100);
  //     await summitReferral.connect(otherWallet2).recordReferral(subInfluencer.address);

  //     await summitswapRouter02.addLiquidityETH(
  //       tokenA.address, // address token,
  //       utils.parseEther("5"), // uint amountTokenDesired,
  //       utils.parseEther("5"), // uint amountTokenMin,
  //       utils.parseEther("0.1"), // uint amountETHMin,
  //       owner.address, // address to
  //       Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
  //       { value: utils.parseEther("0.1") }
  //     );

  //     await summitswapRouter02.addLiquidityETH(
  //       tokenR.address, // address token,
  //       utils.parseEther("5"), // uint amountTokenDesired,
  //       utils.parseEther("5"), // uint amountTokenMin,
  //       utils.parseEther("0.1"), // uint amountETHMin,
  //       owner.address, // address to
  //       Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
  //       { value: utils.parseEther("0.1") }
  //     );

  //     const pairAddress = await summitswapFactory.getPair(weth.address, tokenA.address);
  //     await summitReferral.setFeeInfo(
  //       pairAddress,
  //       tokenR.address,
  //       (5 * feeDenominator) / 100,
  //       (5 * feeDenominator) / 100
  //     );
  //   });
  //   it("leadInfluencer.address should get reward if subInfluencer.address get reward", async () => {
  //     const amount = await summitswapRouter02.getAmountsOut(utils.parseEther("0.1"), [weth.address, tokenA.address]);
  //     const amountOut = amount[0];
  //     const amountIn = amount[1];

  //     await summitswapRouter02.connect(otherWallet2).swapETHForExactTokens(
  //       amountOut, // uint amountOut
  //       [weth.address, tokenA.address], // address[] calldata path
  //       owner.address, // address to
  //       Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
  //       { value: amountIn }
  //     );

  //     const subInfluencerSwapList = await summitReferral.getSwapList(subInfluencer.address);
  //     const subInfluencerSwapInfo = subInfluencerSwapList[0];
  //     assert.equal(subInfluencerSwapInfo.tokenA, weth.address);
  //     assert.equal(subInfluencerSwapInfo.tokenB, tokenA.address);
  //     assert.equal(subInfluencerSwapInfo.tokenR, tokenR.address);
  //     assert.equal(subInfluencerSwapInfo.amountA.toString(), "2046957198124988");
  //     assert.equal(subInfluencerSwapInfo.amountB.toString(), "100000000000000000");
  //     assert.equal(subInfluencerSwapInfo.amountR.toString(), "2500000000000000");
  //     assert.equal(subInfluencerSwapInfo.amountD.toString(), "5000000000000001");

  //     const leadInfluencerSwapList = await summitReferral.getSwapList(leadInfluencer.address);
  //     const leadInfluencerSwapInfo = leadInfluencerSwapList[0];
  //     assert.equal(leadInfluencerSwapInfo.tokenA, weth.address);
  //     assert.equal(leadInfluencerSwapInfo.tokenB, tokenA.address);
  //     assert.equal(leadInfluencerSwapInfo.tokenR, tokenR.address);
  //     assert.equal(leadInfluencerSwapInfo.amountA.toString(), "2046957198124988");
  //     assert.equal(leadInfluencerSwapInfo.amountB.toString(), "100000000000000000");
  //     assert.equal(leadInfluencerSwapInfo.amountR.toString(), "2500000000000000");
  //     assert.equal(leadInfluencerSwapInfo.amountD.toString(), "0");

  //     const totalSharedReward = await summitReferral.totalSharedReward(tokenR.address);
  //     const otherWalletRewardBalance = await summitReferral._balances(otherWallet2.address, tokenR.address);
  //     const leadInfRewardBalance = await summitReferral._balances(leadInfluencer.address, tokenR.address);
  //     const subInfRewardBalance = await summitReferral._balances(subInfluencer.address, tokenR.address);
  //     const developerRewardBalance = await summitReferral._balances(owner.address, tokenR.address);

  //     assert.equal(totalSharedReward.toString(), "60000000000000019");
  //     assert.equal(otherWalletRewardBalance.toString(), "50000000000000018");
  //     assert.equal(leadInfRewardBalance.toString(), "2500000000000000");
  //     assert.equal(subInfRewardBalance.toString(), "2500000000000000");
  //     assert.equal(developerRewardBalance.toString(), "5000000000000001");
  //   });
  // });
});
