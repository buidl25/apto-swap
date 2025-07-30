/**
 * Aptos to EVM Cross-Chain Swap using Hackathon Clone and Escrow Contracts
 * 
 * This script demonstrates swapping tokens from Aptos to EVM using the new contracts:
 * 1. Creates an escrow on Aptos using EscrowDst from hackathon_clone
 * 2. Creates an escrow on EVM using EscrowSrc
 * 3. Withdraws from both escrows to complete the swap
 */

// Use ethers directly instead of through hardhat
const { ethers } = require("ethers");
const { execSync } = require("child_process");
const { AptosClient } = require("aptos");
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
  console.log("\n=== Aptos to EVM Cross-Chain Swap using Escrow Contracts ===\n");
  
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
  let evmRecipientAddress = process.env.EVM_RECIPIENT_ADDRESS;
  if (!evmRecipientAddress) {
    // If no recipient address is provided, use a default one
    evmRecipientAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Default hardhat account
    console.log(`Using default EVM recipient: ${evmRecipientAddress}`);
  } else {
    console.log(`Using EVM recipient from .env: ${evmRecipientAddress}`);
  }
  
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
  
  // Step 3: Create escrow on Aptos using EscrowDst
  console.log("\n=== Creating Escrow on Aptos ===");
  
  try {
    // Set environment variables for the escrow creation
    process.env.APTOS_MODULE_ADDRESS = aptosModuleAddress;
    process.env.APTOS_RECIPIENT = aptosRecipientAddress;
    process.env.AMOUNT = amount;
    process.env.TIMELOCK = timelock;
    process.env.HASHLOCK = hashlock;
    
    console.log("Creating escrow on Aptos...");
    const createAptosEscrowCommand = `node ${path.join(__dirname, "interact-escrow-dst.js")} create`;
    
    console.log(`Executing: ${createAptosEscrowCommand}`);
    execSync(createAptosEscrowCommand, { stdio: 'inherit' });
    
    console.log("\nAptos escrow created successfully!");
    
    // Try to read the escrow details from the file
    let aptosEscrowId;
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        aptosEscrowId = escrowData.escrowId;
        console.log(`Loaded Aptos escrow ID: ${aptosEscrowId || 'unknown'}`);
      }
    } catch (error) {
      console.warn("Could not load Aptos escrow ID:", error.message);
    }
  } catch (error) {
    console.error("Error creating Aptos escrow:", error.message);
    process.exit(1);
  }
  
  // Step 4: Create escrow on EVM using EscrowSrc
  console.log("\n=== Creating Escrow on EVM ===");
  
  try {
    // Get the EVM token address
    let evmTokenAddress = process.env.EVM_TOKEN_ADDRESS;
    
    if (!evmTokenAddress) {
      try {
        const tokenAddressFile = path.join(__dirname, "..", "vars", "evm-token-address.json");
        if (fs.existsSync(tokenAddressFile)) {
          const tokenData = JSON.parse(fs.readFileSync(tokenAddressFile, 'utf8'));
          evmTokenAddress = tokenData["evm-token-address"];
          console.log(`Loaded EVM token address from file: ${evmTokenAddress}`);
        }
      } catch (error) {
        console.error("Error reading EVM token address:", error.message);
      }
    }
    
    if (!evmTokenAddress) {
      console.error("EVM_TOKEN_ADDRESS not found. Please set it in .env file or deploy the token first.");
      process.exit(1);
    }
    
    // Deploy the EscrowSrc contract if it doesn't exist
    let escrowSrcAddress;
    try {
      const addressFile = path.join(__dirname, "..", "vars", "escrow-src-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        escrowSrcAddress = addressData["escrow-src-address"];
        console.log(`Loaded EscrowSrc address from file: ${escrowSrcAddress}`);
      }
    } catch (error) {
      console.warn("Could not load EscrowSrc address:", error.message);
    }
    
    if (!escrowSrcAddress) {
      console.log("EscrowSrc contract not found. Deploying it now...");
      const deployCommand = `npx hardhat run ${path.join(__dirname, "..", "escrow", "deploy-escrow-src.js")} deploy --network localhost`;
      
      console.log(`Executing: ${deployCommand}`);
      execSync(deployCommand, { stdio: 'inherit' });
      
      // Try to read the address again
      try {
        const addressFile = path.join(__dirname, "..", "vars", "escrow-src-address.json");
        if (fs.existsSync(addressFile)) {
          const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
          escrowSrcAddress = addressData["escrow-src-address"];
          console.log(`Loaded EscrowSrc address from file: ${escrowSrcAddress}`);
        }
      } catch (error) {
        console.error("Error reading EscrowSrc address after deployment:", error.message);
        process.exit(1);
      }
    }
    
    // Set environment variables for the escrow creation
    process.env.ESCROW_SRC_ADDRESS = escrowSrcAddress;
    process.env.EVM_RECIPIENT_ADDRESS = evmRecipientAddress;
    process.env.AMOUNT = amount;
    process.env.TIMELOCK = timelock;
    process.env.HASHLOCK = hashlock;
    
    console.log("Creating escrow on EVM...");
    const createEvmEscrowCommand = `npx hardhat run ${path.join(__dirname, "..", "escrow", "deploy-escrow-src.js")} create --network localhost`;
    
    console.log(`Executing: ${createEvmEscrowCommand}`);
    execSync(createEvmEscrowCommand, { stdio: 'inherit' });
    
    console.log("\nEVM escrow created successfully!");
    
    // Try to read the escrow details from the file
    let evmEscrowId;
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        evmEscrowId = escrowData.escrowId;
        console.log(`Loaded EVM escrow ID: ${evmEscrowId || 'unknown'}`);
      }
    } catch (error) {
      console.warn("Could not load EVM escrow ID:", error.message);
    }
  } catch (error) {
    console.error("Error creating EVM escrow:", error.message);
    process.exit(1);
  }
  
  // Step 5: Save the swap details to a file
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
  
  const swapFile = path.join(varsDir, "aptos-evm-swap-details.json");
  fs.writeFileSync(swapFile, JSON.stringify(swapDetails, null, 2));
  console.log(`\nSwap details saved to: ${swapFile}`);
  
  console.log("\n=== Cross-Chain Swap Setup Completed ===");
  console.log("\nTo complete the swap, run the withdraw script with the preimage:");
  console.log(`PREIMAGE=${preimage} npm run withdraw-aptos-evm-escrow`);
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
