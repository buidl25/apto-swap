/**
 * Withdraw from Aptos and EVM Escrows to Complete Cross-Chain Swap
 * 
 * This script completes the cross-chain swap by:
 * 1. Withdrawing from the EVM escrow using the preimage
 * 2. Withdrawing from the Aptos escrow using the same preimage
 */

// Use explicit path to hardhat to avoid TypeScript config issues
const hre = require("../../node_modules/hardhat");

// Set the config path to use JavaScript config
process.env.HARDHAT_CONFIG = "hardhat.config.js";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("\n=== Completing Cross-Chain Swap: Withdrawing from Escrows ===\n");
  
  // Step 1: Get the preimage
  let preimage = process.env.PREIMAGE;
  
  // Try to read from the saved file if not in environment
  if (!preimage) {
    try {
      const swapFile = path.join(__dirname, "..", "vars", "aptos-evm-swap-details.json");
      if (fs.existsSync(swapFile)) {
        const swapData = JSON.parse(fs.readFileSync(swapFile, 'utf8'));
        preimage = swapData.preimage;
        console.log(`Loaded preimage from file: ${preimage}`);
      }
    } catch (error) {
      console.error("Error reading swap details:", error.message);
    }
  }
  
  if (!preimage) {
    console.error("Preimage not found. Please set PREIMAGE environment variable or run the swap setup script first.");
    process.exit(1);
  }
  
  // Step 2: Withdraw from EVM escrow
  console.log("\n=== Withdrawing from EVM Escrow ===");
  
  try {
    // Get the EscrowSrc address
    let escrowSrcAddress;
    try {
      const addressFile = path.join(__dirname, "..", "vars", "escrow-src-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        escrowSrcAddress = addressData["escrow-src-address"];
        console.log(`Loaded EscrowSrc address from file: ${escrowSrcAddress}`);
      }
    } catch (error) {
      console.error("Error reading EscrowSrc address:", error.message);
      process.exit(1);
    }
    
    // Get the escrow ID
    let escrowId;
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        escrowId = escrowData.escrowId;
        console.log(`Loaded EVM escrow ID: ${escrowId}`);
      }
    } catch (error) {
      console.error("Error reading EVM escrow details:", error.message);
      process.exit(1);
    }
    
    if (!escrowId) {
      console.error("EVM escrow ID not found. Please run the swap setup script first.");
      process.exit(1);
    }
    
    // Set environment variables for the withdraw
    process.env.ESCROW_SRC_ADDRESS = escrowSrcAddress;
    process.env.ESCROW_ID = escrowId;
    process.env.PREIMAGE = preimage;
    
    console.log("Withdrawing from EVM escrow...");
    const withdrawEvmCommand = `npx hardhat run ${path.join(__dirname, "..", "escrow", "deploy-escrow-src.js")} withdraw --network localhost`;
    
    console.log(`Executing: ${withdrawEvmCommand}`);
    execSync(withdrawEvmCommand, { stdio: 'inherit' });
    
    console.log("\nEVM escrow withdrawal successful!");
  } catch (error) {
    console.error("Error withdrawing from EVM escrow:", error.message);
    process.exit(1);
  }
  
  // Step 3: Withdraw from Aptos escrow
  console.log("\n=== Withdrawing from Aptos Escrow ===");
  
  try {
    // Get Aptos module address
    let aptosModuleAddress;
    try {
      const addressFile = path.join(__dirname, "..", "vars", "hackathon-clone-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        aptosModuleAddress = addressData["hackathon-clone-address"];
        console.log(`Loaded Aptos module address from file: ${aptosModuleAddress}`);
      }
    } catch (error) {
      console.error("Error reading Aptos module address:", error.message);
      process.exit(1);
    }
    
    // Get the escrow ID
    let escrowId;
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        escrowId = escrowData.escrowId;
        console.log(`Loaded Aptos escrow ID: ${escrowId}`);
      }
    } catch (error) {
      console.error("Error reading Aptos escrow details:", error.message);
      process.exit(1);
    }
    
    if (!escrowId) {
      console.error("Aptos escrow ID not found. Please run the swap setup script first.");
      process.exit(1);
    }
    
    // Set environment variables for the withdraw
    process.env.APTOS_MODULE_ADDRESS = aptosModuleAddress;
    process.env.ESCROW_ID = escrowId;
    process.env.PREIMAGE = preimage;
    
    console.log("Withdrawing from Aptos escrow...");
    const withdrawAptosCommand = `node ${path.join(__dirname, "interact-escrow-dst.js")} withdraw`;
    
    console.log(`Executing: ${withdrawAptosCommand}`);
    execSync(withdrawAptosCommand, { stdio: 'inherit' });
    
    console.log("\nAptos escrow withdrawal successful!");
  } catch (error) {
    console.error("Error withdrawing from Aptos escrow:", error.message);
    process.exit(1);
  }
  
  console.log("\n=== Cross-Chain Swap Completed Successfully! ===");
  console.log("\nTokens have been transferred across chains using the escrow contracts.");
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
