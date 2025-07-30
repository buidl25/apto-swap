// This script uses ethers.js v5 directly instead of through hardhat-ethers
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const hre = require("hardhat");

async function main() {
  // Get the provider from hardhat
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  
  // Get the first account as the deployer
  const accounts = await hre.ethers.getSigners();
  const deployerAddress = accounts[0].address;
  
  // Create a wallet with the first account's private key
  // Note: In a real environment, you'd want to handle private keys more securely
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default hardhat first account
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying with account:", deployerAddress);

  // Get the contract factory
  const artifactPath = path.join(__dirname, "../artifacts/contracts/TestEvmToken.sol/TestEvmToken.json");
  const contractArtifact = JSON.parse(fs.readFileSync(artifactPath));
  const contractFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );

  // Deploy the contract
  const token = await contractFactory.deploy();
  await token.deployed();
  
  const tokenAddress = token.address;
  console.log("TestEvmToken deployed to:", tokenAddress);
  
  // Save the token address to the JSON file
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  
  const filePath = path.join(varsDir, "evm-token-address.json");
  const jsonContent = JSON.stringify({
    "evm-token-address": tokenAddress
  }, null, 4);
  
  fs.writeFileSync(filePath, jsonContent);
  console.log(`Token address saved to ${filePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
