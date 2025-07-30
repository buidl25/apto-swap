/**
 * EVM to Aptos Cross-Chain Swap using Hackathon Clone and Escrow Contracts
 * 
 * This script demonstrates swapping tokens from EVM to Aptos using the new contracts:
 * 1. Creates an escrow on EVM using EscrowSrc
 * 2. Creates an escrow on Aptos using EscrowDst from hackathon_clone
 * 3. Withdraws from both escrows to complete the swap
 */

// Use explicit path to hardhat to avoid TypeScript config issues
const hre = require("../../node_modules/hardhat");

// Set the config path to use JavaScript config
process.env.HARDHAT_CONFIG = "hardhat.config.js";
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
  console.log("\n=== EVM to Aptos Cross-Chain Swap using Escrow Contracts ===\n");
  console.log("🔄 Starting cross-chain swap process from EVM to Aptos\n");
  
  // Step 1: Generate preimage and hashlock
  console.log("📝 STEP 1: Generating preimage and hashlock...");
  const { preimage, hashlock } = generatePreimageAndHash();
  console.log(`✅ Generated preimage: ${preimage}`);
  console.log(`✅ Generated hashlock: ${hashlock}`);
  
  // Step 2: Set up parameters
  console.log("\n📝 STEP 2: Setting up swap parameters...");
  const amount = process.env.AMOUNT || "10"; // Default to 10 tokens
  const timelock = process.env.TIMELOCK || "1800"; // Default to 30 minutes
  
  // Get EVM token address
  console.log("📝 Loading EVM token address...");
  let evmTokenAddress = process.env.EVM_TOKEN_ADDRESS;
  
  if (evmTokenAddress) {
    console.log(`✅ Using EVM token address from environment: ${evmTokenAddress}`);
  } else {
    console.log("⚠️ EVM token address not found in environment, checking saved file...");
    
    // Try to read from the saved file if not in environment
    try {
      const tokenAddressFile = path.join(__dirname, "..", "vars", "evm-token-address.json");
      if (fs.existsSync(tokenAddressFile)) {
        const tokenData = JSON.parse(fs.readFileSync(tokenAddressFile, 'utf8'));
        evmTokenAddress = tokenData["evm-token-address"];
        console.log(`✅ Loaded EVM token address from file: ${evmTokenAddress}`);
      } else {
        console.error("❌ Token address file not found at: " + tokenAddressFile);
      }
    } catch (error) {
      console.error("❌ Error reading EVM token address:", error.message);
    }
  }
  
  if (!evmTokenAddress) {
    console.error("❌ EVM_TOKEN_ADDRESS not found. Please set it in .env file or deploy the token first.");
    process.exit(1);
  }
  
  console.log(`✅ Will use EVM token address: ${evmTokenAddress}`);
  
  // Get Aptos module address
  console.log("\n📝 STEP 3: Loading Aptos module address...");
  let aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS;
  
  if (aptosModuleAddress) {
    console.log(`✅ Using Aptos module address from environment: ${aptosModuleAddress}`);
  } else {
    console.log("⚠️ Aptos module address not found in environment, checking saved file...");
    
    // Try to read from the saved file if not in environment
    try {
      const addressFile = path.join(__dirname, "..", "vars", "hackathon-clone-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        aptosModuleAddress = addressData["hackathon-clone-address"];
        console.log(`✅ Loaded Aptos module address from file: ${aptosModuleAddress}`);
      } else {
        console.error("❌ Aptos module address file not found at: " + addressFile);
      }
    } catch (error) {
      console.error("❌ Error reading Aptos module address:", error.message);
    }
  }
  
  if (!aptosModuleAddress) {
    console.error("❌ Aptos module address not found. Please set APTOS_MODULE_ADDRESS or deploy the contracts first.");
    process.exit(1);
  }
  
  console.log(`✅ Will use Aptos module address: ${aptosModuleAddress}`);
  
  // Get EVM sender address (default to first signer)
  console.log("\n📝 STEP 4: Setting up addresses...");
  console.log("Getting EVM sender address...");
  const [evmSender] = await hre.ethers.getSigners();
  const evmSenderAddress = await evmSender.getAddress();
  console.log(`✅ Using EVM sender: ${evmSenderAddress}`);
  
  // Get Aptos recipient address
  console.log("Getting Aptos recipient address...");
  const aptosRecipientAddress = process.env.APTOS_RECIPIENT || aptosModuleAddress;
  console.log(`✅ Using Aptos recipient: ${aptosRecipientAddress}`);
  
  console.log("\n📝 STEP 5: Summarizing swap parameters...");
  console.log("\n📃 Swap Parameters:");
  console.log(`💰 Amount: ${amount} tokens`);
  console.log(`⏰ Timelock: ${timelock} seconds`);
  console.log(`🔒 Hashlock: ${hashlock}`);
  console.log(`💳 EVM Token Address: ${evmTokenAddress}`);
  console.log(`💻 Aptos Module Address: ${aptosModuleAddress}`);
  console.log(`📬 Aptos Recipient: ${aptosRecipientAddress}`);
  console.log("\n✅ Swap parameters validated successfully");
  
  // Step 6: Create escrow on EVM using EscrowFactory
  console.log("\n📝 STEP 6: Creating Escrow on EVM...");
  console.log("\n🌐 === Creating Escrow on EVM Chain ===\n");
  
  try {
    // Get the EscrowFactory contract address if it exists
    console.log("Looking for EscrowFactory contract address...");
    let escrowFactoryAddress;
    try {
      const addressFile = path.join(__dirname, "..", "vars", "escrow-factory-address.json");
      console.log(`Checking file: ${addressFile}`);
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        escrowFactoryAddress = addressData["escrow-factory-address"];
        console.log(`✅ Loaded EscrowFactory address from file: ${escrowFactoryAddress}`);
      } else {
        console.log("⚠️ EscrowFactory address file not found");
      }
    } catch (error) {
      console.error("❌ Error reading EscrowFactory address:", error.message);
    }
    
    if (!escrowFactoryAddress) {
      console.log("⚠️ EscrowFactory contract not found. Deploying it now...");
      const deployCommand = `npx hardhat run ${path.join(__dirname, "..", "escrow", "deploy-escrow-factory.js")} --network localhost`;
      
      console.log(`💻 Executing: ${deployCommand}`);
      console.log("\n=== EscrowFactory Deployment Output ===");
      execSync(deployCommand, { stdio: 'inherit' });
      console.log("=== End of Deployment Output ===");
      
      // Try to read the address again
      console.log("\nVerifying EscrowFactory deployment...");
      try {
        const addressFile = path.join(__dirname, "..", "vars", "escrow-factory-address.json");
        console.log(`Checking file: ${addressFile}`);
        if (fs.existsSync(addressFile)) {
          const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
          escrowFactoryAddress = addressData["escrow-factory-address"];
          console.log(`✅ Successfully deployed EscrowFactory at: ${escrowFactoryAddress}`);
        } else {
          console.error("❌ EscrowFactory address file not found after deployment");
          process.exit(1);
        }
      } catch (error) {
        console.error("❌ Error reading EscrowFactory address after deployment:", error.message);
        process.exit(1);
      }
    }
    
    // Set environment variables for the escrow creation
    console.log("\nSetting up environment variables for EVM escrow creation...");
    process.env.ESCROW_FACTORY_ADDRESS = escrowFactoryAddress;
    process.env.EVM_RECIPIENT_ADDRESS = evmSenderAddress; // In this case, sender is also recipient for refund
    process.env.EVM_TOKEN_ADDRESS = evmTokenAddress; // Make sure token address is passed
    process.env.AMOUNT = amount;
    process.env.TIMELOCK = timelock;
    process.env.HASHLOCK = hashlock;
    
    console.log("📌 Environment variables set:");
    console.log(`- ESCROW_FACTORY_ADDRESS: ${process.env.ESCROW_FACTORY_ADDRESS}`);
    console.log(`- EVM_RECIPIENT_ADDRESS: ${process.env.EVM_RECIPIENT_ADDRESS}`);
    console.log(`- EVM_TOKEN_ADDRESS: ${process.env.EVM_TOKEN_ADDRESS}`);
    console.log(`- AMOUNT: ${process.env.AMOUNT}`);
    console.log(`- TIMELOCK: ${process.env.TIMELOCK}`);
    console.log(`- HASHLOCK: ${process.env.HASHLOCK}`);
    
    console.log("\n🔗 Creating escrow on EVM using EscrowFactory...");
    // Use environment variable to control the operation instead of a positional argument
    process.env.OPERATION = "create";
    const createEvmEscrowCommand = `npx hardhat run ${path.join(__dirname, "..", "escrow", "deploy-escrow-factory.js")} --network localhost`;
    
    console.log(`💻 Executing: ${createEvmEscrowCommand}`);
    console.log("\n=== EVM Escrow Creation Output ===");
    execSync(createEvmEscrowCommand, { stdio: 'inherit' });
    console.log("=== End of EVM Escrow Creation Output ===");
    
    console.log("\n✅ EVM escrow creation process completed!");
    
    // Try to read the escrow details from the file
    console.log("\n📜 Retrieving EVM escrow details...");
    let evmEscrowId;
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
      console.log(`Checking file: ${escrowFile}`);
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        evmEscrowId = escrowData.escrowId;
        console.log(`✅ Loaded EVM escrow ID: ${evmEscrowId || 'unknown'}`);
        
        // Display other escrow details if available
        if (escrowData.escrowAddress) {
          console.log(`✅ EVM escrow address: ${escrowData.escrowAddress}`);
        }
        if (escrowData.tokenAddress) {
          console.log(`✅ EVM token address: ${escrowData.tokenAddress}`);
        }
      } else {
        console.warn("⚠️ EVM escrow details file not found. This may indicate an issue with escrow creation.");
      }
    } catch (error) {
      console.warn("⚠️ Could not load EVM escrow ID:", error.message);
    }
  } catch (error) {
    console.error("Error creating EVM escrow:", error.message);
    process.exit(1);
  }
  
  // Step 7: Create escrow on Aptos using EscrowDst
  console.log("\n📝 STEP 7: Creating Escrow on Aptos...");
  console.log("\n🚀 === Creating Escrow on Aptos Chain ===\n");
  
  try {
    // Set environment variables for the escrow creation
    console.log("Setting up environment variables for Aptos escrow creation...");
    process.env.APTOS_MODULE_ADDRESS = aptosModuleAddress;
    process.env.APTOS_RECIPIENT = aptosRecipientAddress;
    process.env.AMOUNT = amount;
    process.env.TIMELOCK = timelock;
    process.env.HASHLOCK = hashlock;
    
    console.log("📌 Environment variables set for Aptos escrow:");
    console.log(`- APTOS_MODULE_ADDRESS: ${process.env.APTOS_MODULE_ADDRESS}`);
    console.log(`- APTOS_RECIPIENT: ${process.env.APTOS_RECIPIENT}`);
    console.log(`- AMOUNT: ${process.env.AMOUNT}`);
    console.log(`- TIMELOCK: ${process.env.TIMELOCK}`);
    console.log(`- HASHLOCK: ${process.env.HASHLOCK}`);
    
    console.log("\n🔗 Creating escrow on Aptos using EscrowDst...");
    const createAptosEscrowCommand = `node ${path.join(__dirname, "interact-escrow-dst.js")} create`;
    
    console.log(`💻 Executing: ${createAptosEscrowCommand}`);
    console.log("\n=== Aptos Escrow Creation Output ===");
    execSync(createAptosEscrowCommand, { stdio: 'inherit' });
    console.log("=== End of Aptos Escrow Creation Output ===");
    
    console.log("\n✅ Aptos escrow creation process completed!");
    
    // Try to read the escrow details from the file
    console.log("\n📜 Retrieving Aptos escrow details...");
    let aptosEscrowId;
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
      console.log(`Checking file: ${escrowFile}`);
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        aptosEscrowId = escrowData.escrowId;
        console.log(`✅ Loaded Aptos escrow ID: ${aptosEscrowId || 'unknown'}`);
        
        // Display other escrow details if available
        if (escrowData.escrowAddress) {
          console.log(`✅ Aptos escrow address: ${escrowData.escrowAddress}`);
        }
      } else {
        console.warn("⚠️ Aptos escrow details file not found. This may indicate an issue with escrow creation.");
      }
    } catch (error) {
      console.warn("⚠️ Could not load Aptos escrow ID:", error.message);
    }
  } catch (error) {
    console.error("Error creating Aptos escrow:", error.message);
    process.exit(1);
  }
  
  // Step 8: Save the swap details to a file
  console.log("\n📝 STEP 8: Saving swap details...");
  
  const swapDetails = {
    preimage,
    hashlock,
    amount,
    timelock,
    aptosModuleAddress,
    aptosRecipientAddress,
    evmSenderAddress,
    evmTokenAddress,
    timestamp: new Date().toISOString()
  };
  
  console.log("\n💾 Creating vars directory if needed...");
  const varsDir = path.join(__dirname, "..", "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
    console.log(`✅ Created directory: ${varsDir}`);
  } else {
    console.log(`✅ Directory already exists: ${varsDir}`);
  }
  
  const swapFile = path.join(varsDir, "evm-aptos-swap-details.json");
  console.log(`Saving swap details to: ${swapFile}`);
  fs.writeFileSync(swapFile, JSON.stringify(swapDetails, null, 2));
  console.log(`✅ Swap details saved successfully`);
  
  console.log("\n🎉 === Cross-Chain Swap Setup Completed ===\n");
  console.log("🔔 NEXT STEPS:");
  console.log("1. To complete the swap, run the withdraw script with the preimage:");
  console.log(`   PREIMAGE=${preimage} npm run withdraw-evm-aptos-escrow`);
  console.log("\n2. Or use the simplified withdraw script:");
  console.log(`   PREIMAGE=${preimage} npm run simple-withdraw`);
  console.log("\n💬 Remember to keep the preimage secret until you're ready to complete the swap!");
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
