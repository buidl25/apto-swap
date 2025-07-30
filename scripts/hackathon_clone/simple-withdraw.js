/**
 * Simple Cross-Chain Swap Withdraw Script
 * 
 * This script helps complete the cross-chain swap by providing instructions
 * for withdrawing from both Aptos and EVM escrows.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
require("dotenv").config();

async function main() {
  console.log("\n=== Cross-Chain Swap Withdraw Helper ===\n");
  
  // Step 1: Get the preimage
  let preimage = process.env.PREIMAGE;
  
  // Try to read from the saved file if not in environment
  if (!preimage) {
    try {
      const swapFile = path.join(__dirname, "..", "vars", "cross-chain-swap-details.json");
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
  
  // Step 2: Load other swap details
  let swapDetails;
  try {
    const swapFile = path.join(__dirname, "..", "vars", "cross-chain-swap-details.json");
    if (fs.existsSync(swapFile)) {
      swapDetails = JSON.parse(fs.readFileSync(swapFile, 'utf8'));
      console.log("Loaded swap details from file.");
    }
  } catch (error) {
    console.error("Error reading swap details:", error.message);
    process.exit(1);
  }
  
  if (!swapDetails) {
    console.error("Swap details not found. Please run the swap setup script first.");
    process.exit(1);
  }
  
  // Step 3: Display swap information
  console.log("\nSwap Information:");
  console.log(`- Preimage: ${preimage}`);
  console.log(`- Hashlock: ${swapDetails.hashlock}`);
  console.log(`- Amount: ${swapDetails.amount} tokens`);
  console.log(`- Aptos Module Address: ${swapDetails.aptosModuleAddress}`);
  console.log(`- EVM Recipient: ${swapDetails.evmRecipientAddress}`);
  console.log(`- Aptos Recipient: ${swapDetails.aptosRecipientAddress}`);
  
  // Step 4: Check if escrow IDs exist
  let aptosEscrowId;
  try {
    const escrowFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
    if (fs.existsSync(escrowFile)) {
      const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
      aptosEscrowId = escrowData.escrowId;
      console.log(`\nFound Aptos escrow ID: ${aptosEscrowId}`);
    }
  } catch (error) {
    console.warn("Could not load Aptos escrow ID:", error.message);
  }
  
  let evmEscrowId;
  try {
    const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
    if (fs.existsSync(escrowFile)) {
      const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
      evmEscrowId = escrowData.escrowId;
      console.log(`Found EVM escrow ID: ${evmEscrowId}`);
    }
  } catch (error) {
    console.warn("Could not load EVM escrow ID:", error.message);
  }
  
  // Step 5: Provide withdraw commands
  console.log("\n=== Withdraw Commands ===");
  
  if (aptosEscrowId) {
    console.log("\nTo withdraw from Aptos escrow, run:");
    console.log(`PREIMAGE=${preimage} ESCROW_ID=${aptosEscrowId} APTOS_MODULE_ADDRESS=${swapDetails.aptosModuleAddress} npm run interact-escrow-dst withdraw`);
  } else {
    console.log("\nAptos escrow ID not found. Please create an Aptos escrow first with:");
    console.log(`HASHLOCK=${swapDetails.hashlock} AMOUNT=${swapDetails.amount} TIMELOCK=${swapDetails.timelock} APTOS_MODULE_ADDRESS=${swapDetails.aptosModuleAddress} APTOS_RECIPIENT=${swapDetails.aptosRecipientAddress} npm run interact-escrow-dst create`);
  }
  
  if (evmEscrowId) {
    console.log("\nTo withdraw from EVM escrow, run:");
    console.log(`npx hardhat --config hardhat.config.js run scripts/escrow/deploy-escrow-src.js withdraw --network localhost`);
    console.log("With these environment variables:");
    console.log(`PREIMAGE=${preimage} ESCROW_ID=${evmEscrowId}`);
  } else {
    console.log("\nEVM escrow ID not found. Please create an EVM escrow first with:");
    console.log(`npx hardhat --config hardhat.config.js run scripts/escrow/deploy-escrow-src.js create --network localhost`);
    console.log("With these environment variables:");
    console.log(`HASHLOCK=${swapDetails.hashlock} AMOUNT=${swapDetails.amount} TIMELOCK=${swapDetails.timelock} EVM_RECIPIENT_ADDRESS=${swapDetails.evmRecipientAddress}`);
  }
  
  console.log("\n=== Cross-Chain Swap Withdraw Helper Completed ===");
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
