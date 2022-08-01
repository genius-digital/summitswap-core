import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { MAX_VALUE } from "src/environment";
import { deployDummyToken } from "./deployDummyToken";
import { deploySummitFactoryPresale } from "./deploySummitFactoryPresale";
import { tryVerify } from "./utils/verify";

export async function deploySummitCustomPresale(
  createPresaleFee: BigNumber,
  serviceFeeReciever: string,
  admin: string
) {
  const summitFactoryPresale = await deploySummitFactoryPresale(createPresaleFee, serviceFeeReciever, admin);
  const dummyToken = await deployDummyToken();

  console.log("Approving Factory");
  await dummyToken.approve(summitFactoryPresale.address, MAX_VALUE);

  console.log("Factory Approved");
  console.log("Starting to deploy SummitCustomPresaleLibrary");

  const SummitCustomPresaleLibrary = await ethers.getContractFactory("SummitCustomPresale");
  const summitCustomPresaleLibrary = await SummitCustomPresaleLibrary.deploy();
  await summitCustomPresaleLibrary.deployed();

  console.log("SummitCustomPresaleLibrary deployed to:", summitCustomPresaleLibrary.address);

  await tryVerify(summitCustomPresaleLibrary.address);

  console.log("Setting library Address for factory Presale");

  await summitFactoryPresale.setLibraryAddress(summitCustomPresaleLibrary.address);

  console.log("Library Address for factory Presale set to: ", summitCustomPresaleLibrary.address);

  return summitCustomPresaleLibrary;
}

async function main() {
  const createPresaleFee = parseEther("0.0001");
  const serviceFeeReciever = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";
  const admin = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";

  await deploySummitCustomPresale(createPresaleFee, serviceFeeReciever, admin);
}

if (require.main === module) {
  main();
}
