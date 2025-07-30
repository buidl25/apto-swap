const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const EthereumHTLC = await hre.ethers.getContractFactory("EthereumHTLC");
  const htlc = await EthereumHTLC.deploy();
  await htlc.deployed(); // Use deployed() instead of waitForDeployment() for ethers v5
  
  const htlcAddress = htlc.address; // Use .address instead of getAddress() for ethers v5
  console.log("EthereumHTLC deployed to:", htlcAddress);
  
  // Save the address to the .env file for future use
  console.log("\nAdd this to your .env file:\nEVM_HTLC_ADDRESS=" + htlcAddress);
  
  // Save the HTLC address to a JSON file
  const filePath = path.join(__dirname, "vars", "evm-htlc-address.json");
  const jsonContent = JSON.stringify({
    "evm-htlc-address": htlcAddress
  }, null, 4);
  
  // Make sure the vars directory exists
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, jsonContent);
  console.log(`HTLC address saved to ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});