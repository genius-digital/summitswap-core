import { ethers } from "hardhat";

export async function deploySummitPresaleFactory(feeToSetter: string, serviceFeeAddress: string) {
  console.log("Starting to deploy SummitPresaleFactory");

  const SummitFactoryPresale = await ethers.getContractFactory("SummitFactoryPresale");
  const summitFactoryPresale = await SummitFactoryPresale.deploy(feeToSetter, serviceFeeAddress);
  await summitFactoryPresale.deployed();

  console.log("summitFactoryPresale deployed to:", summitFactoryPresale.address);

  return summitFactoryPresale;
}

async function main() {
  const createPresaleFee = "100000000000000"; // 0.0001 ether
  const serviceFeeReciever = "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F";

  await deploySummitPresaleFactory(createPresaleFee, serviceFeeReciever);
}

if (require.main === module) {
  main();
}
