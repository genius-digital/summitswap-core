import { expect, assert } from "chai";
import { Contract, utils } from "ethers";
// import { deployContract, MockProvider, solidity } from "ethereum-waffle";
import SummitReferral from "../artifacts/contracts/SummitReferral.sol/SummitReferral.json";
import WETH from "../artifacts/contracts/utils/WBNB.sol/WBNB.json";
import Token from "../artifacts/contracts/utils/DummyToken.sol/DummyToken.json";
import SummitswapFactory from "../artifacts/contracts/SummitswapFactory.sol/SummitswapFactory.json";
import SummitswapRouter02 from "../artifacts/contracts/SummitswapRouter02.sol/SummitswapRouter02.json";

import { ethers, waffle } from "hardhat";

const { deployContract, provider } = waffle;

describe("Summit Referral", () => {
  const [owner, leadInfluencer, subInfluencer, otherWallet, otherWallet2] =
    provider.getWallets();
  const feeDenominator = 10 ** 9;
  let weth: Contract;
  let summitswapFactory: Contract;
  let summitswapRouter02: Contract;
  let summitReferral: Contract;
  let tokenA: Contract;
  let tokenB: Contract;
  let tokenR: Contract;

  before(async () => {
    weth = await deployContract(owner, WETH, []);
    tokenA = await deployContract(owner, Token, []);
    tokenB = await deployContract(owner, Token, []);
    tokenR = await deployContract(owner, Token, []);
    summitswapFactory = await deployContract(owner, SummitswapFactory, [
      owner.address,
    ]);
    summitswapRouter02 = await deployContract(
      owner,
      SummitswapRouter02,
      [summitswapFactory.address, weth.address],
      { gasLimit: 4600000 }
    );
    summitReferral = await deployContract(owner, SummitReferral, []);

    await summitswapFactory.setFeeTo(owner.address);
    await summitswapRouter02.setSummitReferral(summitReferral.address);
  });

  it("Owner should be owner.address", async () => {
    assert.equal(await summitReferral.owner(), owner.address);
  });

  it("SummitSwapRouter should have summitReferral address", async () => {
    assert.equal(
      await summitswapRouter02.summitReferral(),
      summitReferral.address
    );
  });

  it("feeDenominator should be 10^9", async () => {
    assert.equal(await summitReferral.feeDenominator(), feeDenominator);
  });

  it("wallet should able to recordReferral", async () => {
    await summitReferral.recordReferral(
      otherWallet.address,
      leadInfluencer.address
    );
    let otherWalletReferrer = await summitReferral.getReferrer(
      otherWallet.address
    );
    assert.equal(otherWalletReferrer, leadInfluencer.address);
  });

  it("setFirstBuyFee to 50000000", async () => {
    await summitReferral.setFirstBuyFee(
      tokenA.address,
      (50 * feeDenominator) / 100
    );
    let firstBuyFeeTokenA = await summitReferral.getFirstBuyFee(tokenA.address);
    assert.equal(firstBuyFeeTokenA, (50 * feeDenominator) / 100);

    await summitReferral.setFirstBuyFee(
      weth.address,
      (50 * feeDenominator) / 100
    );
    let firstBuyFeeWETH = await summitReferral.getFirstBuyFee(weth.address);
    assert.equal(firstBuyFeeWETH, (50 * feeDenominator) / 100);
  });

  it("setFirstBuyFee value should be less than feeDenominator", async () => {
    await expect(
      summitReferral.setFirstBuyFee(tokenA.address, feeDenominator + 1)
    ).to.be.revertedWith("Wrong Fee");
  });

  it("setFirstBuyFee with otherWallet (Not The Owner) should be reverted", async () => {
    await expect(
      summitReferral
        .connect(otherWallet)
        .setFirstBuyFee(tokenA.address, 50000000)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("setDevAddress to wallet", async () => {
    await summitReferral.setDevAddress(owner.address);

    let devAddress = await summitReferral.getDevAddr();
    assert.equal(devAddress, owner.address);
  });

  it("setDevAddress with otherWallet (Not The Owner) should be reverted", async () => {
    await expect(
      summitReferral.connect(otherWallet).setDevAddress(otherWallet.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("setRouter to summitswapRouter02.address", async () => {
    await summitReferral.setRouter(summitswapRouter02.address);

    let router = await summitReferral.getRouter();
    assert.equal(router, summitswapRouter02.address);
  });

  it("setRouter with otherWallet (Not The Owner) should be reverted", async () => {
    await expect(
      summitReferral.connect(otherWallet).setRouter(summitswapRouter02.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("refFee + devFee in setFeeInfo which is greater than feeDenominator should be reverted", async () => {
    await summitswapFactory.createPair(tokenA.address, tokenB.address);
    let pairAddress = await summitswapFactory.getPair(
      tokenA.address,
      tokenB.address
    );

    await expect(
      summitReferral.setFeeInfo(pairAddress, tokenR.address, feeDenominator, 1)
    ).to.be.revertedWith("Wrong Fee");
  });

  it("setFeeInfo to TokenB, TokenR, refFee=500000000, devFee=500000000", async () => {
    await summitReferral.setFeeInfo(
      tokenB.address,
      tokenR.address,
      (5 * feeDenominator) / 100,
      (5 * feeDenominator) / 100
    );
    let pairInfo = await summitReferral.pairInfo(tokenB.address);
    assert.equal(pairInfo.tokenR, tokenR.address);
    assert.equal(pairInfo.refFee, (5 * feeDenominator) / 100);
    assert.equal(pairInfo.devFee, (5 * feeDenominator) / 100);
  });

  it("setFeeInfo with otherWallet (Not The Owner) should be reverted", async () => {
    await expect(
      summitReferral
        .connect(otherWallet)
        .setFeeInfo(tokenB.address, tokenR.address, 50000000, 50000000)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("add LeadInfluencer with fee greater than feeDenominator should be reverted", async () => {
    await expect(
      summitReferral.addLeadInfluencer(owner.address, feeDenominator + 1)
    ).to.be.revertedWith("Wrong Fee");
  });

  it("add owner as Lead Influencer", async () => {
    await summitReferral.addLeadInfluencer(
      owner.address,
      (5 * feeDenominator) / 100
    );
    let leadInfluencer = await summitReferral.leadInfluencers(owner.address);
    assert.equal(leadInfluencer, true);

    let leadInfFee = await summitReferral.leadInfFee(owner.address);
    assert.equal(leadInfFee, (5 * feeDenominator) / 100);
  });

  it("addLeadInfluencer with otherWallet (Not The Owner) should be reverted", async () => {
    await expect(
      summitReferral
        .connect(otherWallet)
        .addLeadInfluencer(otherWallet.address, (5 * feeDenominator) / 100)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("remove owner from Lead Influencer", async () => {
    await summitReferral.removeLeadInfluencer(owner.address);
    let leadInfluencer = await summitReferral.leadInfluencers(owner.address);
    assert.equal(leadInfluencer, false);
  });

  it("removeLeadInfluencer with otherWallet (Not The Owner) should be reverted", async () => {
    await expect(
      summitReferral.connect(otherWallet).removeLeadInfluencer(owner.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("addSubInfluencer should only be called by Lead Influencer", async () => {
    await expect(
      summitReferral.addSubInfluencer(
        subInfluencer.address,
        (50 * feeDenominator) / 100,
        (50 * feeDenominator) / 100
      )
    ).to.be.revertedWith("No permission to add influencer");
  });

  it("LeadInfluencer Should not be able to add LeadInfluencer as SubInfluencer", async () => {
    await summitReferral.addLeadInfluencer(owner.address, 5 * 10 ** 6);
    await summitReferral.addLeadInfluencer(leadInfluencer.address, 5 * 10 ** 6);

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
      summitReferral.addSubInfluencer(
        subInfluencer.address,
        (0.05 * feeDenominator) / 100,
        (50 * feeDenominator) / 100
      )
    ).to.be.revertedWith("Wrong Fee");
  });

  it("LeadInfluencer should able to add SubInfluencer", async () => {
    await summitReferral
      .connect(leadInfluencer)
      .addSubInfluencer(
        subInfluencer.address,
        (50 * feeDenominator) / 100,
        (50 * feeDenominator) / 100
      );
    let influencer = await summitReferral.influencers(subInfluencer.address);
    assert.equal(influencer.leadAddress, leadInfluencer.address);
    assert.equal(influencer.refFee, (50 * feeDenominator) / 100);
    assert.equal(influencer.leadFee, (50 * feeDenominator) / 100);
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
      summitReferral.addLeadInfluencer(
        subInfluencer.address,
        (50 * feeDenominator) / 100
      )
    ).to.be.revertedWith("Not able to add sub influencer as a lead influencer");
  });

  it("swap which is not called by router should be reverted", async () => {
    await expect(
      summitReferral.swap(owner.address, tokenA.address, tokenB.address, 100, 0)
    ).to.be.revertedWith("caller is not the router");
  });

  it("User will be able to swap eth to exact token, and get the first reward", async () => {
    await tokenA.approve(
      summitswapRouter02.address,
      utils.parseEther("5").toString()
    );
    await tokenR.approve(
      summitswapRouter02.address,
      utils.parseEther("5").toString()
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

    let pairAddress = await summitswapFactory.getPair(
      weth.address,
      tokenA.address
    );
    await summitReferral.setFeeInfo(
      pairAddress,
      tokenR.address,
      (5 * feeDenominator) / 100,
      (5 * feeDenominator) / 100
    );

    let amount = await summitswapRouter02.getAmountsOut(
      utils.parseEther("0.1"),
      [weth.address, tokenA.address]
    );
    let amountOut = amount[0];
    let amountIn = amount[1];

    // 2046957198124988 - 100000000000000000
    await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
      amountOut, // uint amountOut
      [weth.address, tokenA.address], // address[] calldata path
      owner.address, // address to
      Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
      { value: amountIn }
    );

    let swapList = await summitReferral.getSwapList(leadInfluencer.address);
    let swapInfo = swapList[0];

    assert.equal(swapInfo.tokenA, weth.address);
    assert.equal(swapInfo.tokenB, tokenA.address);
    assert.equal(swapInfo.tokenR, tokenR.address);
    assert.equal(swapInfo.amountA.toString(), 2046957198124988);
    assert.equal(swapInfo.amountB.toString(), 100000000000000000);
    assert.equal(swapInfo.amountR.toString(), 5000000000000001);
    assert.equal(swapInfo.amountD.toString(), 5000000000000001);
  });

  it("totalSharedReward should be 60000000000000020", async () => {
    let totalSharedReward = await summitReferral.totalSharedReward(
      tokenR.address
    );
    assert(totalSharedReward.toString(), "60000000000000020");
  });

  it("reward for the user (first swap) should be 50000000000000018", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      otherWallet.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), 50000000000000018);
  });

  it("tokenR rewardBalance for Referrer should be 5000000000000001 wei", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      leadInfluencer.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), 5000000000000001);
  });

  it("tokenR rewardBalance for Developer should be 5000000000000001 wei", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      owner.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), 5000000000000001);
  });

  it("leadInfluencer should be able to claim reward", async () => {
    await tokenR.transfer(
      summitReferral.address,
      utils.parseEther("10").toString()
    );

    let rewardBalance = await summitReferral.rewardBalance(
      leadInfluencer.address,
      tokenR.address
    );
    await summitReferral.connect(leadInfluencer).claimReward(tokenR.address);

    let walletTokenRAmount = await tokenR.balanceOf(leadInfluencer.address);
    assert.equal(rewardBalance.toString(), walletTokenRAmount.toString());
  });

  it("totalSharedReward should be 55000000000000020", async () => {
    let totalSharedReward = await summitReferral.totalSharedReward(
      tokenR.address
    );
    assert(totalSharedReward.toString(), "55000000000000020");
  });

  it("leadInfluencer should not be able to claim reward when balance is 0", async () => {
    await expect(
      summitReferral.connect(leadInfluencer).claimReward(tokenR.address)
    ).to.be.revertedWith("Insufficient balance");
  });

  it("tokenR rewardBalance for LeadInfluencer should be 0", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      leadInfluencer.address,
      tokenR.address
    );
    assert.equal(rewardBalance, 0);
  });

  it("OtherWallet should not not get reward for the second swap", async () => {
    let amount = await summitswapRouter02.getAmountsOut(
      utils.parseEther("0.1"),
      [weth.address, tokenA.address]
    );
    let amountOut = amount[0];
    let amountIn = amount[1];

    await summitswapRouter02.connect(otherWallet).swapETHForExactTokens(
      amountOut, // uint amountOut
      [weth.address, tokenA.address], // address[] calldata path
      owner.address, // address to
      Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
      { value: amountIn }
    );

    let swapList = await summitReferral.getSwapList(leadInfluencer.address);

    let swapInfo = swapList[1];

    assert.equal(swapInfo.tokenA, weth.address);
    assert.equal(swapInfo.tokenB, tokenA.address);
    assert.equal(swapInfo.tokenR, tokenR.address);
    assert.equal(swapInfo.amountA.toString(), 2132375401164431);
    assert.equal(swapInfo.amountB.toString(), 100000000000000000);
    assert.equal(swapInfo.amountR.toString(), 5204303329259224);
    assert.equal(swapInfo.amountD.toString(), 5204303329259224);
  });

  it("tokenR rewardBalance for Referrer should be 5204303329259224 wei", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      leadInfluencer.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), 5204303329259224);
  });

  it("leadInfluencer should be able to claim reward", async () => {
    await summitReferral.connect(leadInfluencer).claimReward(tokenR.address);
    let rewardBalance = await summitReferral.rewardBalance(
      leadInfluencer.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), "0");
  });

  it("tokenR rewardBalance for Developer should be 10204303329259225 wei", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      owner.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), 10204303329259225);
  });

  it("reward for the user (the second swap) should be 50000000000000018", async () => {
    // 50000000000000018 is the value of that the user get from the first swap
    let rewardBalance = await summitReferral.rewardBalance(
      otherWallet.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), 50000000000000018);
  });

  it("LeadInfluencer should get reward if SubInfluencer getReward", async () => {
    await summitReferral.recordReferral(
      otherWallet2.address,
      subInfluencer.address
    );
    let otherWallet2Referrer = await summitReferral.getReferrer(
      otherWallet2.address
    );
    assert.equal(otherWallet2Referrer, subInfluencer.address);

    let amount = await summitswapRouter02.getAmountsOut(
      utils.parseEther("0.1"),
      [weth.address, tokenA.address]
    );
    let amountOut = amount[0];
    let amountIn = amount[1];

    await summitswapRouter02.connect(otherWallet2).swapETHForExactTokens(
      amountOut, // uint amountOut
      [weth.address, tokenA.address], // address[] calldata path
      owner.address, // address to
      Math.floor(Date.now() / 1000) + 24 * 60 * 60, // uint deadline
      { value: amountIn }
    );

    let swapList = await summitReferral.getSwapList(leadInfluencer.address);

    let swapInfo = swapList[2];

    assert.equal(swapInfo.tokenA, weth.address);
    assert.equal(swapInfo.tokenB, tokenA.address);
    assert.equal(swapInfo.tokenR, tokenR.address);
    assert.equal(swapInfo.amountA.toString(), 2223251298561417);
    assert.equal(swapInfo.amountB.toString(), 100000000000000000);
    assert.equal(swapInfo.amountR.toString(), 271064331144887);
    assert.equal(swapInfo.amountD.toString(), 0);
  });

  it("tokenR rewardBalance for LeadInfluencer should be 271064331144887 wei", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      leadInfluencer.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), "271064331144887");
  });

  it("tokenR rewardBalance for SubInfluencer should be 271064331144887 wei", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      subInfluencer.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), "271064331144887");
  });

  it("tokenR rewardBalance for OtherWallet2 should be 54212866228977482 wei", async () => {
    let rewardBalance = await summitReferral.rewardBalance(
      otherWallet2.address,
      tokenR.address
    );
    assert.equal(rewardBalance.toString(), "54212866228977482");
  });
});
