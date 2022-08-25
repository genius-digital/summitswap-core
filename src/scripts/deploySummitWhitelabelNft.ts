import { TokenInfoStruct } from "build/typechain/SummitWhitelabelNft";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { tryVerify } from "./utils/verify";

export async function deploySummitWhitelabelNft(tokenInfo: TokenInfoStruct, initialUri: string, owner: string) {
  console.log("Starting to deploy SummitWhitelabelNft");

  const SummitWhitelabelNft = await ethers.getContractFactory("SummitWhitelabelNft");
  const summitWhitelabelNft = await SummitWhitelabelNft.deploy(tokenInfo, initialUri, owner);
  await summitWhitelabelNft.deployed();

  console.log("SummitWhitelabelNft deployed to:", summitWhitelabelNft.address);

  await tryVerify(summitWhitelabelNft.address, [tokenInfo, initialUri, owner]);

  return summitWhitelabelNft;
}

async function main() {
  const tokenInfo: TokenInfoStruct = {
    name: "Summit Whitelabel NFT",
    symbol: "SWNFT",
    maxSupply: 999,
    whitelistMintPrice: parseEther("0.001"),
    publicMintPrice: parseEther("0.002"),
    signer: "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA",
    phase: 0,
  };
  const initialUri = "ipfs://QmSAo4kt2N9mdgwTF5MREgSWHoF3CxwwmbhZV5M3u83SVg/";
  const owner = "0x5f8397444c02c02BD1F20dAbAB42AFCdf396dacA";

  await deploySummitWhitelabelNft(tokenInfo, initialUri, owner);
}

if (require.main === module) {
  main();
}