import { ethers } from "hardhat";

export async function deploySummitPresaleFactory(feeToSetter: number, serviceFeeAddress: string) {
  console.log("Starting to deploy SummitPresaleFactory");

  const SummitFactoryPresale = await ethers.getContractFactory("SummitFactoryPresale");
  const summitFactoryPresale = await SummitFactoryPresale.deploy(100000000000000, serviceFeeAddress);
  await summitFactoryPresale.deployed();

  console.log("summitFactoryPresale deployed to:", summitFactoryPresale.address);

  return summitFactoryPresale;
}

async function main() {
  await deploySummitPresaleFactory(100000000000000, "0xE01C1Cd3c0a544adF8cB764dCCF855bcE4943B1F");
}

if (require.main === module) {
  main();
}
