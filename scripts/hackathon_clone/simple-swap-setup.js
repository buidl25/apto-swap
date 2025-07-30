/**
 * Simple Cross-Chain Swap Setup Script
 * 
 * This script sets up the necessary environment for cross-chain swaps
 * without relying on hardhat directly.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

// Generate a random preimage and its hash
function generatePreimageAndHash() {
  const preimage = crypto.randomBytes(32).toString('hex');
  const preimageBuffer = Buffer.from(preimage, 'utf8');
  const hashlock = '0x' + crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
  
  return { preimage, hashlock };
}

async function main() {
  console.log("\n=== Cross-Chain Swap Setup ===\n");
  
  // Step 1: Generate preimage and hashlock
  const { preimage, hashlock } = generatePreimageAndHash();
  console.log(`Generated preimage: ${preimage}`);
  console.log(`Generated hashlock: ${hashlock}`);
  
  // Step 2: Set up parameters
  const amount = process.env.AMOUNT || "10"; // Default to 10 tokens
  const timelock = process.env.TIMELOCK || "3600"; // Default to 1 hour
  
  // Get Aptos module address
  let aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS;
  
  // Try to read from the saved file if not in environment
  if (!aptosModuleAddress) {
    try {
      const addressFile = path.join(__dirname, "..", "vars", "hackathon-clone-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        aptosModuleAddress = addressData["hackathon-clone-address"];
        console.log(`Loaded Aptos module address from file: ${aptosModuleAddress}`);
      }
    } catch (error) {
      console.error("Error reading Aptos module address:", error.message);
    }
  }
  
  if (!aptosModuleAddress) {
    console.error("Aptos module address not found. Please set APTOS_MODULE_ADDRESS or deploy the contracts first.");
    process.exit(1);
  }
  
  // Get EVM recipient address
  const evmRecipientAddress = process.env.EVM_RECIPIENT_ADDRESS || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Default hardhat account
  console.log(`Using EVM recipient: ${evmRecipientAddress}`);
  
  // Get Aptos recipient address
  const aptosRecipientAddress = process.env.APTOS_RECIPIENT || aptosModuleAddress;
  console.log(`Using Aptos recipient: ${aptosRecipientAddress}`);
  
  console.log("\nSwap Parameters:");
  console.log(`- Amount: ${amount} tokens`);
  console.log(`- Timelock: ${timelock} seconds`);
  console.log(`- Hashlock: ${hashlock}`);
  console.log(`- Aptos Module Address: ${aptosModuleAddress}`);
  console.log(`- EVM Recipient: ${evmRecipientAddress}`);
  console.log(`- Aptos Recipient: ${aptosRecipientAddress}`);
  
  // Step 3: Save the swap details to a file
  const swapDetails = {
    preimage,
    hashlock,
    amount,
    timelock,
    aptosModuleAddress,
    evmRecipientAddress,
    aptosRecipientAddress,
    timestamp: new Date().toISOString()
  };
  
  const varsDir = path.join(__dirname, "..", "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  
  const swapFile = path.join(varsDir, "cross-chain-swap-details.json");
  fs.writeFileSync(swapFile, JSON.stringify(swapDetails, null, 2));
  console.log(`\nSwap details saved to: ${swapFile}`);
  
  // Step 4: Export environment variables for other scripts
  console.log("\nExporting environment variables for other scripts...");
  process.env.PREIMAGE = preimage;
  process.env.HASHLOCK = hashlock;
  process.env.AMOUNT = amount;
  process.env.TIMELOCK = timelock;
  process.env.APTOS_MODULE_ADDRESS = aptosModuleAddress;
  process.env.APTOS_RECIPIENT = aptosRecipientAddress;
  process.env.EVM_RECIPIENT_ADDRESS = evmRecipientAddress;
  
  console.log("\n=== Cross-Chain Swap Setup Completed ===");
  console.log("\nNext steps:");
  console.log("1. Create Aptos escrow: npm run interact-escrow-dst create");
  console.log("2. Create EVM escrow: npx hardhat run scripts/escrow/deploy-escrow-src.js create --network localhost");
  console.log("3. Complete the swap by running the withdraw commands with the preimage:");
  console.log(`   PREIMAGE=${preimage} npm run interact-escrow-dst withdraw`);
  console.log(`   PREIMAGE=${preimage} npx hardhat run scripts/escrow/deploy-escrow-src.js withdraw --network localhost`);
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
