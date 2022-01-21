import { environment } from "../../environment";
import hre from "hardhat";

export async function tryVerify(address: string, constructorArguments?: any) {
  if (environment.IS_VERIFY_SUPPORTED) {
    try {
      await hre.run("verify:verify", {
        address,
        constructorArguments,
      });
    } catch (err: any) {
      if (err.message.includes("Already Verified")) {
        process.stdout.write("Already Verified\n");
      } else {
        console.log(err);
      }
    }
  }
}
