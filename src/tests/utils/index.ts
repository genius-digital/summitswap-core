import { ContractTransaction } from "ethers";

export const getGasCostByTx = async (tx: ContractTransaction) => {
  const txReceipt = await tx.wait();
  const gasUsed = txReceipt.gasUsed;
  const gasPrice = txReceipt.effectiveGasPrice;
  const gasCost = gasUsed.mul(gasPrice);
  return gasCost;
};
