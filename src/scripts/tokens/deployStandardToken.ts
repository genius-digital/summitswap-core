import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { tryVerify } from "../utils/verify";

export async function deployStandardToken(
  serviceFee: BigNumber,
  serviceFeeAddress: string,
  tokenName: string,
  tokenSymbol: string,
  tokenDecimals: number,
  tokenSupply: BigNumber
) {
  console.log("Starting to deploy StandardTokenFactory");

  const TokenFactoryContract = await ethers.getContractFactory("StandardTokenFactory");
  const tokenFactoryDeploy = await TokenFactoryContract.deploy(serviceFee, serviceFeeAddress);
  await tokenFactoryDeploy.deployed();

  console.log("StandardTokenFactory deployed to:", tokenFactoryDeploy.address);
  console.log("Starting to deploy StandardToken");

  const tx = await tokenFactoryDeploy.createStandardToken(tokenName, tokenSymbol, tokenDecimals, tokenSupply, {
    value: serviceFee,
  });

  await tx.wait();
  const tokenAddress = await tokenFactoryDeploy.customStandardTokens(0);
  console.log("StandardToken deployed to:", tokenAddress);

  const owner = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  await tryVerify(tokenAddress, [tokenName, tokenSymbol, tokenDecimals, tokenSupply, owner]);

  return tokenFactoryDeploy;
}

async function main() {
  const tokenName = "Sample1";
  const tokenSymbol = "SAM1";
  const tokenDecimals = 18;
  const tokenSupply = parseUnits("100000", tokenDecimals);
  const serviceFee = parseEther("0.0001");
  const serviceFeeReciever = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  await deployStandardToken(serviceFee, serviceFeeReciever, tokenName, tokenSymbol, tokenDecimals, tokenSupply);
}

if (require.main === module) {
  main();
}
