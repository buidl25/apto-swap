const { run } = require("hardhat");

async function main() {

  const testTokenAddress = "0x0d7c24afc5D32d2a4c8114cd5C7F6f02f4b52529";
  try {
    await run("verify:verify", {
      address: testTokenAddress,
      constructorArguments: [],
    });
    console.log("Token verified successfully!");
  } catch (error) {
    console.error("Token verification failed:", error.message);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});