/**
 * Check EVM Token Balance
 * 
 * This script checks the balance of the TestEvmToken for a specified address.
 */

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // Get the address to check (default to the first signer if not specified)
  const [signer] = await hre.ethers.getSigners();
  const addressToCheck = process.env.EVM_ADDRESS || await signer.getAddress();
  
  // Get the token contract
  const tokenAddress = process.env.EVM_TOKEN_ADDRESS;
  
  if (!tokenAddress) {
    console.error("Error: EVM_TOKEN_ADDRESS environment variable is not set.");
    console.error("Please deploy the EVM token first with 'npm run deploy-evm-token' and set the address.");
    process.exit(1);
  }
  
  const TestEvmToken = await hre.ethers.getContractFactory("TestEvmToken");
  const token = TestEvmToken.attach(tokenAddress);
  
  // Get token details
  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  
  // Get balance
  const balance = await token.balanceOf(addressToCheck);
  const formattedBalance = hre.ethers.formatUnits(balance, decimals);
  
  console.log("\n=== EVM Token Balance ===");
  console.log(`Token: ${name} (${symbol})`);
  console.log(`Address: ${addressToCheck}`);
  console.log(`Balance: ${formattedBalance} ${symbol}`);
  console.log("========================\n");
  
  return formattedBalance;
}

// Execute the main function and handle errors
main()
  .then((balance) => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
