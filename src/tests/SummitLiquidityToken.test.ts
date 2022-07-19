// import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
// import LiquidityGeneratorTokenArtifact from "@built-contracts/tokens/SummitLiquidityToken.sol/LiquidityGeneratorToken.json";
// import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
// import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
// import { LiquidityGeneratorToken, SummitswapFactory, SummitswapRouter02, WBNB } from "build/typechain";
// import { assert, expect } from "chai";
// import dayjs from "dayjs";
// import { BigNumber } from "ethers";
// import { parseEther, parseUnits } from "ethers/lib/utils";
// import { ethers, waffle } from "hardhat";
// import { MAX_VALUE, ZERO_ADDRESS } from "src/environment";

// const { deployContract, provider } = waffle;

// describe("SummitLiquidityGeneratorToken", () => {
//   const [owner, otherWallet1, otherWallet2, summitFactoryFeeToSetter, charityWallet] = provider.getWallets();

//   let liquidityGeneratorToken: LiquidityGeneratorToken;
//   let wbnb: WBNB;
//   let summitFactory: SummitswapFactory;
//   let summitRouter: SummitswapRouter02;

//   const TAX_DECIMALS = 2;

//   const tokenName = "Sample1";
//   const tokenSymbol = "SAM1";
//   const totalSupply = parseUnits("10000000", 9);
//   const taxFeeBps = parseUnits("4", TAX_DECIMALS); // 4%
//   const liquidityFeeBps = parseUnits("5", TAX_DECIMALS); // 5%
//   const charityFeeBps = parseUnits("1", TAX_DECIMALS); // 1%
//   const initialLiquidity = totalSupply.mul(3).div(10); // 30% of totalSupply

//   beforeEach(async () => {
//     wbnb = (await deployContract(owner, WbnbArtifact, [])) as WBNB;
//     summitFactory = (await deployContract(owner, SummitFactoryArtifact, [
//       summitFactoryFeeToSetter.address,
//     ])) as SummitswapFactory;
//     summitRouter = (await deployContract(owner, SummitRouterArtifact, [
//       summitFactory.address,
//       wbnb.address,
//     ])) as SummitswapRouter02;
//     liquidityGeneratorToken = (await deployContract(owner, LiquidityGeneratorTokenArtifact, [
//       tokenName,
//       tokenSymbol,
//       totalSupply,
//       summitRouter.address,
//       charityWallet.address,
//       taxFeeBps,
//       liquidityFeeBps,
//       charityFeeBps,
//       owner.address,
//     ])) as LiquidityGeneratorToken;
//   });

//   describe("constructor", () => {
//     it("should have initial value", async () => {
//       const balance = await liquidityGeneratorToken.balanceOf(owner.address);
//       const tSupply = await liquidityGeneratorToken.totalSupply();
//       assert.equal(balance.toString(), tSupply.toString());
//       assert.equal(tSupply.toString(), totalSupply.toString());
//       assert.equal(await liquidityGeneratorToken.isExcludedFromFee(owner.address), true);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromFee(liquidityGeneratorToken.address), true);
//     });
//   });

//   describe("owner", () => {
//     it("should be owner", async () => {
//       const ownerAddress = await liquidityGeneratorToken.owner();
//       assert.equal(ownerAddress, owner.address);
//     });
//   });

//   describe("transferOwnership", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(
//         liquidityGeneratorToken.connect(otherWallet1).transferOwnership(otherWallet1.address)
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });
//     it("should set owner to otherWallet", async () => {
//       await liquidityGeneratorToken.connect(owner).transferOwnership(otherWallet1.address);
//       const newOwner = await liquidityGeneratorToken.owner();
//       assert.equal(newOwner, otherWallet1.address);
//     });
//   });

//   describe("name", () => {
//     it("should be tokenName", async () => {
//       const name = await liquidityGeneratorToken.name();
//       assert.equal(name, tokenName);
//     });
//   });

//   describe("symbol", () => {
//     it("should be tokenSymbol", async () => {
//       const symbol = await liquidityGeneratorToken.symbol();
//       assert.equal(symbol, tokenSymbol);
//     });
//   });

//   describe("decimals", () => {
//     it("should be 9", async () => {
//       const decimals = await liquidityGeneratorToken.decimals();
//       assert.equal(decimals.toString(), "9");
//     });
//   });

//   describe("summitswapV2Router", () => {
//     it("should be summitRouter", async () => {
//       const router = await liquidityGeneratorToken.summitswapV2Router();
//       assert.equal(router, summitRouter.address);
//     });
//   });

//   describe("_charityAddress", () => {
//     it("should be charityAddress", async () => {
//       const charityAddress = await liquidityGeneratorToken._charityAddress();
//       assert.equal(charityAddress, charityWallet.address);
//     });
//   });

//   describe("_taxFee", () => {
//     it("should be taxFeeBps", async () => {
//       const taxFee = await liquidityGeneratorToken._taxFee();
//       assert.equal(taxFee.toString(), taxFeeBps.toString());
//     });
//   });

//   describe("_liquidityFee", () => {
//     it("should be liquidityFeeBps", async () => {
//       const liquidityFee = await liquidityGeneratorToken._liquidityFee();
//       assert.equal(liquidityFee.toString(), liquidityFeeBps.toString());
//     });
//   });

//   describe("_charityFee", () => {
//     it("should be charityFeeBps", async () => {
//       const charityFee = await liquidityGeneratorToken._charityFee();
//       assert.equal(charityFee.toString(), charityFeeBps.toString());
//     });
//   });

//   describe("balanceOf", () => {
//     it("should be equal to total Supply", async () => {
//       const balance = await liquidityGeneratorToken.balanceOf(owner.address);
//       assert.equal(balance.toString(), totalSupply.toString());
//     });

//     it("should be equal to amountTransfer", async () => {
//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       const amountTransfer = parseUnits("1000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       assert.equal(balance1.sub(balance0).toString(), amountTransfer);
//     });

//     it("should be equal to amountTransfer also when excluded from reward", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);
//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       const amountTransfer = parseUnits("1000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       assert.equal(balance1.sub(balance0).toString(), amountTransfer);
//     });
//   });

//   describe("transfer", () => {
//     it("should be reverted, if transfers to ZERO ADDRESS", async () => {
//       const amountTransfer = parseUnits("1", "8").toString();
//       await expect(
//         liquidityGeneratorToken.connect(otherWallet1).transfer(ZERO_ADDRESS, amountTransfer)
//       ).to.be.revertedWith("ERC20: transfer to the zero address");
//     });

//     it("should be reverted, if transfer ampount is 0", async () => {
//       await expect(liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, "0")).to.be.revertedWith(
//         "Transfer amount must be greater than zero"
//       );
//     });

//     it("should be equal amountTransfer and change in owner balance if owner excluded from fee", async () => {
//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       const amountTransfer = parseUnits("1000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       assert.equal(balance1.sub(balance0).toString(), amountTransfer);
//     });

//     it("should be equal amountTransfer and change in owner balance if otherWallet1 excluded from fee", async () => {
//       const amountTransfer = parseUnits("1000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).excludeFromFee(otherWallet1.address);
//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       assert.equal(balance1.sub(balance0).toString(), amountTransfer);
//     });

//     it("should be equal tokensTransfered and change in otherWallet1 balance when otherWallet1 excluded from reward", async () => {
//       const amountTransfer = parseUnits("1000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).includeInFee(owner.address);
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);

//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);

//       const reflection = await liquidityGeneratorToken.reflectionFromToken(amountTransfer, true);
//       const tokensTransfered = await liquidityGeneratorToken.tokenFromReflection(reflection);

//       assert.equal(balance1.sub(balance0).toString(), tokensTransfered.toString());
//     });

//     it("should be equal (tokensTransfered + tokensFromReflection) and (change in otherWallet1 balance) when owner excluded from reward", async () => {
//       const amountTransfer = parseUnits("10000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).includeInFee(owner.address);
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(owner.address);

//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);

//       const rAmount = await liquidityGeneratorToken.reflectionFromToken(amountTransfer, true);
//       const tokensTransfered = await liquidityGeneratorToken.tokenFromReflection(rAmount);
//       const percentageOfTotalSupply = balance1.mul(10000000000).div(totalSupply);

//       const tokensFromReflections = (await liquidityGeneratorToken.totalFees())
//         .mul(percentageOfTotalSupply)
//         .div(10000000);
//       assert.equal(balance1.sub(balance0).toString(), tokensTransfered.add(tokensFromReflections).toString());
//     });

//     it("should be equal (tokensTransfered + tokensFromReflection) and (change in otherWallet1 balance)", async () => {
//       const amountTransfer = parseUnits("10000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).includeInFee(owner.address);

//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);

//       const rAmount = await liquidityGeneratorToken.reflectionFromToken(amountTransfer, true);
//       const tokensTransfered = await liquidityGeneratorToken.tokenFromReflection(rAmount);
//       const percentageOfTotalSupply = balance1.mul(1000000000).div(totalSupply);

//       const tokensFromReflections = (await liquidityGeneratorToken.totalFees())
//         .mul(percentageOfTotalSupply)
//         .div(1000000000);
//       assert.equal(balance1.sub(balance0).toString(), tokensTransfered.add(tokensFromReflections).toString());
//     });

//     it("should be equal tokensTransfered and change in otherWallet1 balance when both excluded from reward", async () => {
//       const amountTransfer = parseUnits("1000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).includeInFee(owner.address);
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(owner.address);
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);

//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, amountTransfer);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);

//       const reflection = await liquidityGeneratorToken.reflectionFromToken(amountTransfer, true);
//       const tokensTransfered = await liquidityGeneratorToken.tokenFromReflection(reflection);

//       assert.equal(balance1.sub(balance0).toString(), tokensTransfered.toString());
//     });

//     it("should add liquidity to liquidity pool when tokensForLiquidity >= numTokensSellToAddToLiquidity", async () => {
//       await liquidityGeneratorToken.connect(owner).approve(summitRouter.address, initialLiquidity);
//       await summitRouter.addLiquidityETH(
//         liquidityGeneratorToken.address,
//         initialLiquidity,
//         0,
//         0,
//         owner.address,
//         dayjs().add(10000, "seconds").unix(),
//         {
//           value: parseEther("80"),
//           gasLimit: 3000000,
//         }
//       );
//       const numTokensSellToAddToLiquidity = totalSupply.mul(5).div(10 ** 4); // 0.05%
//       await liquidityGeneratorToken
//         .connect(owner)
//         .transfer(liquidityGeneratorToken.address, numTokensSellToAddToLiquidity);

//       const pairAddress = await summitFactory.getPair(liquidityGeneratorToken.address, await summitRouter.WETH());
//       const SummitswapPair = await ethers.getContractFactory("SummitswapPair");
//       const summitswapPair = SummitswapPair.attach(pairAddress);

//       const balance = await liquidityGeneratorToken.balanceOf(liquidityGeneratorToken.address);
//       assert.equal(balance.toString(), numTokensSellToAddToLiquidity.toString());

//       const reserves0 = await summitswapPair.getReserves();
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, parseUnits("100", "9"));
//       const reserves1 = await summitswapPair.getReserves();

//       assert.equal(reserves1[0].gt(reserves0[0]) || reserves1[1].gt(reserves0[1]), true);
//     });
//   });

//   describe("allowance", () => {
//     it("should get allowance of A to B", async () => {
//       const allowance = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance.toString(), "0");

//       await liquidityGeneratorToken.connect(owner).approve(otherWallet1.address, "1000");
//       const allowance1 = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance1.toString(), "1000");
//     });
//   });

//   describe("approve", () => {
//     it("should approve some amount to address", async () => {
//       const amountApprove = parseUnits("1000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).approve(otherWallet1.address, amountApprove);
//       const allowance = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance.toString(), amountApprove);
//     });
//   });

//   describe("transferFrom", () => {
//     it("should transfer some N amount to address if have <= N amount of it", async () => {
//       const amountTransfer = parseUnits("1000", "9").toString();
//       const balance0 = await liquidityGeneratorToken.balanceOf(owner.address);
//       await liquidityGeneratorToken.connect(owner).approve(otherWallet1.address, amountTransfer);
//       await liquidityGeneratorToken
//         .connect(otherWallet1)
//         .transferFrom(owner.address, otherWallet2.address, amountTransfer);
//       const allowance = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance.toString(), "0");
//       const balance1 = await liquidityGeneratorToken.balanceOf(owner.address);
//       const balance2 = await liquidityGeneratorToken.balanceOf(otherWallet2.address);
//       assert.equal(balance0.toString(), balance1.add(amountTransfer).toString());
//       assert.equal(balance2.toString(), amountTransfer);
//     });

//     it("should not transfer if have > N amount of it", async () => {
//       const amountTransfer = parseUnits("1000", "9");
//       const balance0 = await liquidityGeneratorToken.balanceOf(owner.address);
//       await liquidityGeneratorToken.connect(owner).approve(otherWallet1.address, amountTransfer);
//       await expect(
//         liquidityGeneratorToken
//           .connect(otherWallet1)
//           .transferFrom(owner.address, otherWallet2.address, amountTransfer.add("1"))
//       ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
//       const allowance = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance.toString(), amountTransfer.toString());
//       const balance1 = await liquidityGeneratorToken.balanceOf(owner.address);
//       const balance2 = await liquidityGeneratorToken.balanceOf(otherWallet2.address);
//       assert.equal(balance0.toString(), balance1.toString());
//       assert.equal(balance2.toString(), "0");
//     });
//   });

//   describe("increaseAllowance", () => {
//     it("should increase allowance some amount to address", async () => {
//       const approveAmount = parseUnits("1000", "9");
//       await liquidityGeneratorToken.connect(owner).approve(otherWallet1.address, approveAmount);
//       const allowance = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance.toString(), approveAmount.toString());

//       const increaseAmount = parseUnits("2000", "9").toString();
//       await liquidityGeneratorToken.connect(owner).increaseAllowance(otherWallet1.address, increaseAmount);
//       const allowance1 = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance1.toString(), approveAmount.add(increaseAmount).toString());
//     });
//   });

//   describe("decreaseAllowance", () => {
//     it("should decrease allowance some amount to address", async () => {
//       const approveAmount = parseUnits("1000", "9");
//       await liquidityGeneratorToken.connect(owner).approve(otherWallet1.address, approveAmount);
//       const allowance = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance.toString(), approveAmount.toString());

//       const decreaseAmount = parseUnits("500", "9").toString();
//       await liquidityGeneratorToken.connect(owner).decreaseAllowance(otherWallet1.address, decreaseAmount);
//       const allowance1 = await liquidityGeneratorToken.allowance(owner.address, otherWallet1.address);
//       assert.equal(allowance1.toString(), approveAmount.sub(decreaseAmount).toString());
//     });
//   });

//   describe("isExcludedFromReward", () => {
//     it("should otherWallet1 be excluded from reward", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromReward(otherWallet1.address), true);
//     });
//     it("should otherWallet1 not be excluded from reward", async () => {
//       assert.equal(await liquidityGeneratorToken.isExcludedFromReward(otherWallet1.address), false);
//     });
//   });

//   describe("totalFees", () => {
//     it("should totalFees be 0", async () => {
//       assert.equal((await liquidityGeneratorToken.totalFees()).toString(), "0");
//     });
//     it("should be equal to taxFee", async () => {
//       await liquidityGeneratorToken.connect(owner).includeInFee(owner.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, parseUnits("1000", "9"));
//       assert.equal(
//         (await liquidityGeneratorToken.totalFees()).toString(),
//         parseUnits(taxFeeBps.toString(), "9").div("10").toString()
//       );
//     });
//   });

//   describe("deliver", () => {
//     it("should be reverted, if address is excluded from reward", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);
//       await expect(liquidityGeneratorToken.connect(otherWallet1).deliver(parseUnits("1000", "9"))).to.be.revertedWith(
//         "Excluded addresses cannot call this function"
//       );
//     });

//     it("should change in balance equal to deliver amount", async () => {
//       const deliverAmount = parseUnits("100", "9");

//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, deliverAmount);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       assert.equal(balance1.sub(balance0).toString(), deliverAmount.toString());

//       await liquidityGeneratorToken.connect(otherWallet1).deliver(deliverAmount);
//       const balance2 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       assert.equal(balance1.sub(balance2).toString(), deliverAmount.toString());
//     });

//     it("should increase in totalFees equal to deliver amount ", async () => {
//       const deliverAmount = parseUnits("100", "9");
//       const totalFees0 = await liquidityGeneratorToken.totalFees();
//       await liquidityGeneratorToken.connect(owner).deliver(deliverAmount);
//       const totalFees1 = await liquidityGeneratorToken.totalFees();
//       assert.equal(totalFees1.sub(totalFees0).toString(), deliverAmount.toString());
//     });
//   });

//   describe("reflectionFromToken", () => {
//     it("should be reverted, if amount greater than supply", async () => {
//       await expect(liquidityGeneratorToken.reflectionFromToken(totalSupply.add("1"), true)).to.be.revertedWith(
//         "Amount must be less than supply"
//       );
//     });

//     it("should be equal tAmount and change in balance if excluded from fee", async () => {
//       const tokenAmount = parseUnits("1000", "9");
//       const rAmount = await liquidityGeneratorToken.reflectionFromToken(tokenAmount, false);
//       const tAmount = await liquidityGeneratorToken.tokenFromReflection(rAmount);

//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, tokenAmount);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);

//       assert.equal(balance1.sub(balance0).toString(), tAmount.toString());
//     });

//     it("should be equal tAmount and change in balance if fee included", async () => {
//       await liquidityGeneratorToken.connect(owner).includeInFee(owner.address);
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);
//       const tokenAmount = parseUnits("1000", "9");
//       const rAmount = await liquidityGeneratorToken.reflectionFromToken(tokenAmount, true);
//       const tAmount = await liquidityGeneratorToken.tokenFromReflection(rAmount);

//       const balance0 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);
//       await liquidityGeneratorToken.connect(owner).transfer(otherWallet1.address, tokenAmount);
//       const balance1 = await liquidityGeneratorToken.balanceOf(otherWallet1.address);

//       assert.equal(balance1.sub(balance0).toString(), tAmount.toString());
//     });
//   });

//   describe("tokenFromReflection", () => {
//     it("should be reverted, if amount greater than reflections", async () => {
//       const rTotal = BigNumber.from(MAX_VALUE).sub(BigNumber.from(MAX_VALUE).mod(totalSupply));
//       await expect(liquidityGeneratorToken.tokenFromReflection(rTotal.add("1"))).to.be.revertedWith(
//         "Amount must be less than total reflections"
//       );
//     });
//     it("should be equal to totalSupply", async () => {
//       const rTotal = BigNumber.from(MAX_VALUE).sub(BigNumber.from(MAX_VALUE).mod(totalSupply));
//       const tTotal = await liquidityGeneratorToken.tokenFromReflection(rTotal);
//       assert.equal(tTotal.toString(), totalSupply.toString());
//     });
//   });

//   describe("excludeFromReward", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(
//         liquidityGeneratorToken.connect(otherWallet1).excludeFromReward(otherWallet1.address)
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("should be reverted, if address already excluded", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);
//       await expect(liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address)).to.be.revertedWith(
//         "Account is already excluded"
//       );
//     });

//     it("should exclude otherWallet1 from reward", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromReward(otherWallet1.address), true);
//     });
//   });

//   describe("includeInReward", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(
//         liquidityGeneratorToken.connect(otherWallet1).excludeFromReward(otherWallet1.address)
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("should be reverted, if address already included", async () => {
//       await expect(liquidityGeneratorToken.connect(owner).includeInReward(otherWallet1.address)).to.be.revertedWith(
//         "Account is already included"
//       );
//     });

//     it("should include otherWallet1 for reward", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromReward(otherWallet1.address);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromReward(otherWallet1.address), true);

//       await liquidityGeneratorToken.connect(owner).includeInReward(otherWallet1.address);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromReward(otherWallet1.address), false);
//     });
//   });

//   describe("excludeFromFee", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(
//         liquidityGeneratorToken.connect(otherWallet1).excludeFromFee(otherWallet1.address)
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("should exclude otherWallet1 from fee", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromFee(otherWallet1.address);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromFee(otherWallet1.address), true);
//     });
//   });

//   describe("includeInFee", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(liquidityGeneratorToken.connect(otherWallet1).includeInFee(otherWallet1.address)).to.be.revertedWith(
//         "Ownable: caller is not the owner"
//       );
//     });

//     it("should include otherWallet1 for fee", async () => {
//       await liquidityGeneratorToken.connect(owner).excludeFromFee(otherWallet1.address);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromFee(otherWallet1.address), true);

//       await liquidityGeneratorToken.connect(owner).includeInFee(otherWallet1.address);
//       assert.equal(await liquidityGeneratorToken.isExcludedFromFee(otherWallet1.address), false);
//     });
//   });

//   describe("isExcludedFromFee", () => {
//     it("should owner be exculed from fee", async () => {
//       assert.equal(await liquidityGeneratorToken.isExcludedFromFee(owner.address), true);
//     });
//     it("should otherWallet1 be included for fee", async () => {
//       assert.equal(await liquidityGeneratorToken.isExcludedFromFee(otherWallet1.address), false);
//     });
//   });

//   describe("setTaxFeePercent", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(liquidityGeneratorToken.connect(otherWallet1).setTaxFeePercent(taxFeeBps)).to.be.revertedWith(
//         "Ownable: caller is not the owner"
//       );
//     });

//     it("should be reverted, if total fee greater than 25%", async () => {
//       await expect(liquidityGeneratorToken.connect(owner).setTaxFeePercent("2501")).to.be.revertedWith(
//         "Total fee is over 25%"
//       );
//     });

//     it("should be able to set _taxFee", async () => {
//       const newTaxFee = "600";
//       await liquidityGeneratorToken.connect(owner).setTaxFeePercent(newTaxFee);

//       assert.equal((await liquidityGeneratorToken._taxFee()).toString(), newTaxFee);
//     });
//   });

//   describe("setLiquidityFeePercent", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(
//         liquidityGeneratorToken.connect(otherWallet1).setLiquidityFeePercent(liquidityFeeBps)
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("should be reverted, if total fee greater than 25%", async () => {
//       await expect(liquidityGeneratorToken.connect(owner).setLiquidityFeePercent("2501")).to.be.revertedWith(
//         "Total fee is over 25%"
//       );
//     });

//     it("should be able to set _liquidityFee", async () => {
//       const newLiquidityFee = "600";
//       await liquidityGeneratorToken.connect(owner).setLiquidityFeePercent(newLiquidityFee);

//       assert.equal((await liquidityGeneratorToken._liquidityFee()).toString(), newLiquidityFee);
//     });
//   });

//   describe("setSwapAndLiquifyEnabled", () => {
//     it("should be reverted, if set with otherWallet", async () => {
//       await expect(liquidityGeneratorToken.connect(otherWallet1).setSwapAndLiquifyEnabled(true)).to.be.revertedWith(
//         "Ownable: caller is not the owner"
//       );
//     });

//     it("should be set true", async () => {
//       await liquidityGeneratorToken.connect(owner).setSwapAndLiquifyEnabled(true);
//       assert.equal(await liquidityGeneratorToken.swapAndLiquifyEnabled(), true);
//     });
//   });

//   describe("receive", () => {
//     it("should receive BNB", async () => {
//       const amountBNB = parseEther("30");

//       const balance0 = await provider.getBalance(liquidityGeneratorToken.address);
//       await otherWallet1.sendTransaction({
//         to: liquidityGeneratorToken.address,
//         value: amountBNB,
//       });
//       const balance1 = await provider.getBalance(liquidityGeneratorToken.address);

//       assert.equal(balance1.sub(balance0).toString(), amountBNB.toString());
//     });
//   });
// });
