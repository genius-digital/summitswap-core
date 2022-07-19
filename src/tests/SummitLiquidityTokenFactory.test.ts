// import SummitFactoryArtifact from "@built-contracts/SummitswapFactory.sol/SummitswapFactory.json";
// import SummitLiquidityTokenFactoryArtifact from "@built-contracts/creators/LiquidityTokenFactory.sol/LiquidityTokenFactory.json";
// import SummitRouterArtifact from "@built-contracts/SummitswapRouter02.sol/SummitswapRouter02.json";
// import WbnbArtifact from "@built-contracts/utils/WBNB.sol/WBNB.json";
// import { LiquidityTokenFactory, SummitswapFactory, SummitswapRouter02, WBNB } from "build/typechain";
// import { assert, expect } from "chai";
// import { parseEther, parseUnits } from "ethers/lib/utils";
// import { ethers, waffle } from "hardhat";

// const { deployContract, provider } = waffle;

// describe("SummitLiquidityGeneratorToken", () => {
//   const [owner, serviceFeeReceiver, otherWallet1, summitFactoryFeeToSetter, charityWallet] = provider.getWallets();

//   let liquidityTokenFactory: LiquidityTokenFactory;
//   let wbnb: WBNB;
//   let summitFactory: SummitswapFactory;
//   let summitRouter: SummitswapRouter02;

//   const TAX_DECIMALS = 2;

//   const serviceFee = parseEther("0.0001");
//   const newServiceFee = parseEther("0.00012");
//   const tokenName = "Sample1";
//   const tokenSymbol = "SAM1";
//   const totalSupply = parseUnits("10000000", 9);
//   const taxFeeBps = parseUnits("4", TAX_DECIMALS); // 4%
//   const liquidityFeeBps = parseUnits("5", TAX_DECIMALS); // 5%
//   const charityFeeBps = parseUnits("1", TAX_DECIMALS); // 1%

//   beforeEach(async () => {
//     liquidityTokenFactory = (await deployContract(owner, SummitLiquidityTokenFactoryArtifact, [
//       serviceFee,
//       serviceFeeReceiver.address,
//     ])) as LiquidityTokenFactory;
//     wbnb = (await deployContract(owner, WbnbArtifact, [])) as WBNB;
//     summitFactory = (await deployContract(owner, SummitFactoryArtifact, [
//       summitFactoryFeeToSetter.address,
//     ])) as SummitswapFactory;
//     summitRouter = (await deployContract(owner, SummitRouterArtifact, [
//       summitFactory.address,
//       wbnb.address,
//     ])) as SummitswapRouter02;
//   });

//   describe("owner", () => {
//     it("should be owner", async () => {
//       const ownerAddress = await liquidityTokenFactory.owner();
//       assert.equal(ownerAddress, owner.address);
//     });
//   });

//   describe("serviceFeeReceiver", () => {
//     it("should be serviceFeeReceiver", async () => {
//       const feeReceiverAddress = await liquidityTokenFactory.serviceFeeReceiver();
//       assert.equal(feeReceiverAddress, serviceFeeReceiver.address);
//     });
//   });

//   describe("setServiceFeeReceiver()", () => {
//     it("should be reverted, if set with other than owner", async () => {
//       await expect(
//         liquidityTokenFactory.connect(otherWallet1).setServiceFeeReceiver(otherWallet1.address)
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("should be set to otherWallet1", async () => {
//       await liquidityTokenFactory.connect(owner).setServiceFeeReceiver(otherWallet1.address);
//       const feeReceiverAddress = await liquidityTokenFactory.serviceFeeReceiver();
//       assert.equal(feeReceiverAddress, otherWallet1.address);
//     });
//   });

//   describe("createTokenFee", () => {
//     it("should be serviceFee", async () => {
//       const createTokenFee = await liquidityTokenFactory.createTokenFee();
//       assert.equal(createTokenFee.toString(), serviceFee.toString());
//     });
//   });

//   describe("setFee()", () => {
//     it("should be reverted, if set with other than owner", async () => {
//       await expect(liquidityTokenFactory.connect(otherWallet1).setFee(newServiceFee)).to.be.revertedWith(
//         "Ownable: caller is not the owner"
//       );
//     });

//     it("should be able to set new service fee", async () => {
//       await liquidityTokenFactory.connect(owner).setFee(newServiceFee);
//       const presaleFee = await liquidityTokenFactory.createTokenFee();
//       assert.equal(presaleFee.toString(), newServiceFee.toString());
//     });
//   });

//   describe("transferOwnership()", () => {
//     it("should be reverted, if set with otherWallet1", async () => {
//       await expect(
//         liquidityTokenFactory.connect(otherWallet1).transferOwnership(otherWallet1.address)
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("should set owner to otherWallet1", async () => {
//       await liquidityTokenFactory.connect(owner).transferOwnership(otherWallet1.address);
//       const newOwner = await liquidityTokenFactory.owner();
//       assert.equal(newOwner, otherWallet1.address);
//     });
//   });

//   describe("createLiquidityToken()", () => {
//     beforeEach(async () => {
//       await liquidityTokenFactory
//         .connect(otherWallet1)
//         .createLiquidityToken(
//           tokenName,
//           tokenSymbol,
//           totalSupply,
//           summitRouter.address,
//           charityWallet.address,
//           taxFeeBps,
//           liquidityFeeBps,
//           charityFeeBps,
//           {
//             value: serviceFee,
//           }
//         );
//     });

//     it("should be able to create Liquidity generator token", async () => {
//       const initialCount = await liquidityTokenFactory.customLiquidityTokensMade();
//       await liquidityTokenFactory
//         .connect(otherWallet1)
//         .createLiquidityToken(
//           tokenName,
//           tokenSymbol,
//           totalSupply,
//           summitRouter.address,
//           charityWallet.address,
//           taxFeeBps,
//           liquidityFeeBps,
//           charityFeeBps,
//           {
//             value: serviceFee,
//           }
//         );
//       const finalCount = await liquidityTokenFactory.customLiquidityTokensMade();
//       assert.equal(finalCount.sub(initialCount).toString(), "1");
//     });

//     it("should otherWallet1 be the owner of created token", async () => {
//       const tokenAddress = await liquidityTokenFactory.customLiquidityTokens(0);
//       const LiquidityGeneratorToken = await ethers.getContractFactory("LiquidityGeneratorToken");
//       const liquidityGeneratorToken = LiquidityGeneratorToken.attach(tokenAddress);
//       assert.equal(await liquidityGeneratorToken.owner(), otherWallet1.address);
//     });

//     it("should created token arguments be equal to arguments provided", async () => {
//       const tokenAddress = await liquidityTokenFactory.customLiquidityTokens(0);
//       const LiquidityGeneratorToken = await ethers.getContractFactory("LiquidityGeneratorToken");
//       const liquidityGeneratorToken = LiquidityGeneratorToken.attach(tokenAddress);
//       assert.equal(await liquidityGeneratorToken.name(), tokenName);
//       assert.equal(await liquidityGeneratorToken.symbol(), tokenSymbol);
//       assert.equal(await liquidityGeneratorToken.decimals(), 9);
//       assert.equal(await liquidityGeneratorToken.summitswapV2Router(), summitRouter.address);
//       assert.equal(await liquidityGeneratorToken._charityAddress(), charityWallet.address);
//       assert.equal((await liquidityGeneratorToken._taxFee()).toString(), taxFeeBps.toString());
//       assert.equal((await liquidityGeneratorToken._liquidityFee()).toString(), liquidityFeeBps.toString());
//       assert.equal((await liquidityGeneratorToken._charityFee()).toString(), charityFeeBps.toString());
//     });

//     it("should increase balance of serviceFeeReceiver equal to serviceFee", async () => {
//       const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
//       await liquidityTokenFactory
//         .connect(otherWallet1)
//         .createLiquidityToken(
//           tokenName,
//           tokenSymbol,
//           totalSupply,
//           summitRouter.address,
//           charityWallet.address,
//           taxFeeBps,
//           liquidityFeeBps,
//           charityFeeBps,
//           {
//             value: serviceFee,
//           }
//         );
//       const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
//       assert.equal(finalBalance.sub(initialBalance).toString(), serviceFee.toString());
//     });

//     it("should revert, if not enough fee", async () => {
//       await expect(
//         liquidityTokenFactory
//           .connect(otherWallet1)
//           .createLiquidityToken(
//             tokenName,
//             tokenSymbol,
//             totalSupply,
//             summitRouter.address,
//             charityWallet.address,
//             taxFeeBps,
//             liquidityFeeBps,
//             charityFeeBps,
//             {
//               value: serviceFee.sub(1),
//             }
//           )
//       ).to.be.revertedWith("Not enough Fee");
//     });
//   });

//   describe("withdraw()", () => {
//     it("should be reverted if non-owner try to withdraw", async () => {
//       await expect(liquidityTokenFactory.connect(otherWallet1).withdraw(serviceFeeReceiver.address)).to.be.revertedWith(
//         "Ownable: caller is not the owner"
//       );
//     });

//     it("should be able to withdraw fee by owner", async () => {
//       await liquidityTokenFactory.connect(owner).setServiceFeeReceiver(liquidityTokenFactory.address);
//       const initialBalance = await provider.getBalance(serviceFeeReceiver.address);
//       await liquidityTokenFactory
//         .connect(otherWallet1)
//         .createLiquidityToken(
//           tokenName,
//           tokenSymbol,
//           totalSupply,
//           summitRouter.address,
//           charityWallet.address,
//           taxFeeBps,
//           liquidityFeeBps,
//           charityFeeBps,
//           {
//             value: serviceFee,
//           }
//         );
//       await liquidityTokenFactory.connect(owner).withdraw(serviceFeeReceiver.address);
//       const finalBalance = await provider.getBalance(serviceFeeReceiver.address);
//       assert.equal(finalBalance.sub(initialBalance).toString(), serviceFee.toString());
//     });
//   });
// });
