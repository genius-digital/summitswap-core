import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { deployStandardTokenFactory } from "../tokenCreators/deployStandardTokenFactory";
import { tryVerify } from "../utils/verify";

export async function deployStandardToken(
  serviceFee: BigNumber,
  serviceFeeAddress: string,
  tokenName: string,
  tokenSymbol: string,
  tokenDecimals: number,
  tokenSupply: BigNumber
) {
  const deployedStandardTokenFactory = await deployStandardTokenFactory(serviceFee, serviceFeeAddress);
  console.log("Starting to deploy StandardToken");

  const tx = await deployedStandardTokenFactory.createStandardToken(
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenSupply,
    {
      value: serviceFee,
    }
  );

  await tx.wait();
  const tokenAddress = await deployedStandardTokenFactory.customStandardTokens(0);
  console.log("StandardToken deployed to:", tokenAddress);

  const owner = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";
  await tryVerify(tokenAddress, [tokenName, tokenSymbol, tokenDecimals, tokenSupply, owner]);

  return deployedStandardTokenFactory;
}

async function main() {
  const tokenName = "Sample1";
  const tokenSymbol = "SAM1";
  const tokenDecimals = 18;
  const tokenSupply = parseUnits("100000", tokenDecimals);
  const serviceFee = parseEther("0.0001");
  const serviceFeeReciever = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";
  await deployStandardToken(serviceFee, serviceFeeReciever, tokenName, tokenSymbol, tokenDecimals, tokenSupply);
}

if (require.main === module) {
  main();
}
