import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { tryVerify } from "../utils/verify";
import { environment, ZERO_ADDRESS } from "src/environment";

export async function deployStandardToken(
  serviceFee: BigNumber,
  serviceFeeAddress: string,
  tokenName: string,
  tokenSymbol: string,
  tokenSupply: BigNumber,
  summitswapRouter: string,
  taxFeeBps: string,
  liquidityFeeBps: string,
  charityAddress: string,
  charityFeeBps: string
) {
  console.log("Starting to deploy LiquidityTokenFactory");

  const TokenFactoryContract = await ethers.getContractFactory("LiquidityTokenFactory");
  const tokenFactoryDeploy = await TokenFactoryContract.deploy(serviceFee, serviceFeeAddress);
  await tokenFactoryDeploy.deployed();

  console.log("LiquidityTokenFactory deployed to:", tokenFactoryDeploy.address);
  console.log("Starting to deploy LiquidityToken");

  const tx = await tokenFactoryDeploy.createLiquidityToken(
    tokenName,
    tokenSymbol,
    tokenSupply,
    summitswapRouter,
    charityAddress,
    taxFeeBps,
    liquidityFeeBps,
    charityFeeBps,
    {
      value: serviceFee,
    }
  );

  await tx.wait();
  const tokenAddress = await tokenFactoryDeploy.customLiquidityTokens(0);
  console.log("LiquidityToken deployed to:", tokenAddress);

  const owner = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  await tryVerify(tokenAddress, [
    tokenName,
    tokenSymbol,
    tokenSupply,
    summitswapRouter,
    charityAddress,
    taxFeeBps,
    liquidityFeeBps,
    charityFeeBps,
    owner,
  ]);

  return tokenFactoryDeploy;
}

async function main() {
  const serviceFee = parseEther("0.0001");
  const serviceFeeReciever = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  const tokenName = "Sample1";
  const tokenSymbol = "SAM1";
  const tokenSupply = parseUnits("100000", 9);
  const summitswapRouter = environment.SUMMITSWAP_ROUTER ?? "0xD7803eB47da0B1Cf569F5AFf169DA5373Ef3e41B";
  const taxFeeBps = "400"; // 4%
  const liquidityFeeBps = "300"; // 3%
  const charityAddress = ZERO_ADDRESS;
  const charityFeeBps = "0";
  await deployStandardToken(
    serviceFee,
    serviceFeeReciever,
    tokenName,
    tokenSymbol,
    tokenSupply,
    summitswapRouter,
    taxFeeBps,
    liquidityFeeBps,
    charityAddress,
    charityFeeBps
  );
}

if (require.main === module) {
  main();
}
