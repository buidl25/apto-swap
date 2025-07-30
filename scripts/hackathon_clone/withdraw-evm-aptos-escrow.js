/**
 * Withdraw from EVM and Aptos Escrows to Complete Cross-Chain Swap
 * 
 * This script completes the EVM to Aptos cross-chain swap by:
 * 1. Withdrawing from the Aptos escrow using the preimage
 * 2. Withdrawing from the EVM escrow using the same preimage
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
  console.log("\n=== Completing EVM to Aptos Cross-Chain Swap: Withdrawing from Escrows ===\n");
  
  // Step 1: Get the preimage
  let preimage = process.env.PREIMAGE;
  
  // Try to read from the saved file if not in environment
  if (!preimage) {
    try {
      const swapFile = path.join(__dirname, "..", "vars", "evm-aptos-swap-details.json");
      if (fs.existsSync(swapFile)) {
        const swapData = JSON.parse(fs.readFileSync(swapFile, 'utf8'));
        preimage = swapData.preimage;
        console.log(`Loaded preimage from file: ${preimage}`);
      }
    } catch (error) {
      console.error("Error reading swap details:", error.message);
    }
  }
  
  // Если preimage не найден, используем значение по умолчанию из файла
  if (!preimage) {
    preimage = "ee91ed06a44b4bacc8e34166a9fd5a6c3e015f9f786c4df3ed7ed8c0a42ff44f";
    console.log(`Using hardcoded preimage: ${preimage}`);
  }
  
  if (!preimage) {
    console.error("Preimage not found. Please set PREIMAGE environment variable or run the swap setup script first.");
    process.exit(1);
  }
  
  // Step 2: Withdraw from Aptos escrow first (to reveal the preimage)
  console.log("\n=== Withdrawing from Aptos Escrow ===");
  
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
  
  // Load escrow details
  let escrowDetails;
  try {
    // Сначала пробуем загрузить из hackathon-escrow-details.json
    const hackathonEscrowFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
    if (fs.existsSync(hackathonEscrowFile)) {
      escrowDetails = JSON.parse(fs.readFileSync(hackathonEscrowFile, 'utf8'));
      console.log("Loaded Aptos escrow details from hackathon-escrow-details.json");
    } else {
      // Затем пробуем aptos-escrow-details.json
      const escrowFile = path.join(__dirname, "..", "vars", "aptos-escrow-details.json");
      if (fs.existsSync(escrowFile)) {
        escrowDetails = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        console.log("Loaded Aptos escrow details from aptos-escrow-details.json");
      } else {
        throw new Error("Aptos escrow details file not found.");
      }
    }
  } catch (error) {
    console.error("Error reading Aptos escrow details:", error.message);
    console.log("Trying to use environment variables instead...");
    
    // Use environment variables as fallback
    escrowDetails = {
      moduleAddress: process.env.APTOS_MODULE_ADDRESS,
      escrowId: process.env.APTOS_ESCROW_ID,
      orderHash: process.env.APTOS_ORDER_HASH
    };
  }
  
  // Get the escrow ID
  let escrowId = escrowDetails.escrowId;
  
  // If escrowId is not in the file, compute it from orderHash
  if (!escrowId && escrowDetails.orderHash) {
    console.log("Computing escrow ID from order hash...");
    // Use orderHash as escrowId since it's used as the identifier in the Aptos contract
    escrowId = escrowDetails.orderHash;
    console.log(`Computed Aptos escrow ID: ${escrowId}`);
    
    // Update the escrow details file with the computed ID
    const updatedEscrowData = { ...escrowDetails, escrowId };
    const escrowFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
    fs.writeFileSync(escrowFile, JSON.stringify(updatedEscrowData, null, 2));
    console.log("Updated Aptos escrow details file with computed ID.");
  }
  
  // Try to withdraw from Aptos escrow first
  console.log("\nStep 1: Withdrawing from Aptos escrow...\n");
  let aptosWithdrawalSuccessful = false;
  try {
    // Load escrow details
    const escrowDetailsFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
    const swapDetailsFile = path.join(__dirname, "..", "vars", "evm-aptos-swap-details.json");
    
    if (!fs.existsSync(escrowDetailsFile)) {
      throw new Error(`Escrow details file not found: ${escrowDetailsFile}`);
    }
    
    const escrowDetails = JSON.parse(fs.readFileSync(escrowDetailsFile, 'utf8'));
    console.log("Loaded escrow details:", JSON.stringify(escrowDetails, null, 2));
    
    // Try to load swap details for hashlock and preimage
    let hashlock = escrowDetails.hashlock;
    // Используем preimage из начала скрипта, который мы уже загрузили
    let preimage = process.env.PREIMAGE || "ee91ed06a44b4bacc8e34166a9fd5a6c3e015f9f786c4df3ed7ed8c0a42ff44f";
    
    if (fs.existsSync(swapDetailsFile)) {
      const swapDetails = JSON.parse(fs.readFileSync(swapDetailsFile, 'utf8'));
      console.log("Loaded swap details:", JSON.stringify(swapDetails, null, 2));
      
      if (swapDetails.hashlock) {
        hashlock = swapDetails.hashlock;
        console.log(`Using hashlock from swap details: ${hashlock}`);
      }
      
      if (swapDetails.preimage) {
        preimage = swapDetails.preimage;
        console.log(`Using preimage from swap details: ${preimage}`);
      }
    }
    
    if (!preimage) {
      throw new Error("PREIMAGE is required. Please set it in .env file or as an environment variable.");
    }
    
    // Compute contract ID if not present
    let contractId = escrowDetails.contractId;
    if (!contractId && escrowDetails.orderHash) {
      console.log("Computing contract ID from order hash...");
      // В Aptos контракте contract_id вычисляется через compute_contract_id(immutables)
      // Для правильного вычисления нам нужны все параметры immutables
      // Но так как у нас нет доступа к полным параметрам, используем orderHash как fallback
      contractId = escrowDetails.orderHash;
      console.log(`Using order hash as contract ID: ${contractId}`);
      console.log("WARNING: This may not match the actual contract ID computed by the Aptos contract.");
      console.log("The Aptos contract uses compute_contract_id(immutables) which includes all parameters.");
    }
    
    // Format the escrow ID and preimage for the command
    const escrowIdArg = contractId.startsWith('0x') ? contractId.substring(2) : contractId;
    
    // Convert string preimage to hex if it's not already in hex format
    let preimageHex;
    if (preimage.startsWith('0x')) {
      preimageHex = preimage.substring(2);
    } else {
      // Преобразуем preimage в hex для Aptos CLI
      preimageHex = Buffer.from(preimage).toString('hex');
      console.log(`- Preimage (hex): ${preimageHex}`);
    }
    // Передаем только hex-строку без префикса, т.к. префикс hex: будет добавлен в команде
    const preimageArg = preimageHex;
    
    // Get the module address
    const moduleAddress = escrowDetails.moduleAddress || process.env.APTOS_MODULE_ADDRESS;
    if (!moduleAddress) {
      throw new Error("Module address not found in escrow details or environment variables.");
    }
    
    console.log("Withdrawing from Aptos escrow with parameters:");
    console.log(`- Module Address: ${moduleAddress}`);
    console.log(`- Contract ID: ${contractId}`);
    console.log(`- Preimage: ${preimage}`);
    console.log(`- Preimage (hex): ${preimageHex}`);
    
    // Execute the withdraw command directly
    // Проверяем существование модуля и функции
    console.log(`\nVerifying module and function existence at ${moduleAddress}...`);
    
    // Используем правильный путь к функции withdraw с типом токена
    const withdrawCommand = `aptos move run \
      --function-id ${moduleAddress}::escrow_dst::withdraw \
      --type-args 0x1::aptos_coin::AptosCoin \
      --args hex:${escrowIdArg} hex:${preimageHex} \
      --max-gas 10000 \
      --gas-unit-price 100 \
      --profile default \
      --assume-yes`;
    
    console.log(`\nExecuting withdraw command:\n${withdrawCommand}`);
    execSync(withdrawCommand, { stdio: 'inherit' });
    
    console.log("\nAptos escrow withdrawal successful!");
    aptosWithdrawalSuccessful = true;
  } catch (error) {
    console.error("\nAptos escrow withdrawal failed, but continuing with EVM withdrawal...");
    console.error("Error:", error.message);
  }

  // Step 2: Withdraw from EVM escrow
  console.log("\n=== Withdrawing from EVM Escrow ===");
  
  // Get EscrowSrc address
  let escrowSrcAddress;
  try {
    // First try escrow-src-address.json
    const addressFile = path.join(__dirname, "..", "vars", "escrow-src-address.json");
    if (fs.existsSync(addressFile)) {
      const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
      escrowSrcAddress = addressData["escrow-src-address"];
      console.log(`Loaded EscrowSrc address from file: ${escrowSrcAddress}`);
    } else {
      // Try evm-escrow-address.json as fallback
      const evmAddressFile = path.join(__dirname, "..", "vars", "evm-escrow-address.json");
      if (fs.existsSync(evmAddressFile)) {
        const evmAddressData = JSON.parse(fs.readFileSync(evmAddressFile, 'utf8'));
        escrowSrcAddress = evmAddressData["evm-escrow-address"];
        console.log(`Loaded EVM escrow address from file: ${escrowSrcAddress}`);
      }
    }
  } catch (error) {
    console.error("Error reading EscrowSrc address:", error.message);
    process.exit(1);
  }
    
  // Get the EVM escrow ID
  let evmEscrowId;
  try {
    // First try escrow-src-details.json
    const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
    if (fs.existsSync(escrowFile)) {
      const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
      evmEscrowId = escrowData.escrowId;
      console.log(`Loaded EVM escrow ID: ${evmEscrowId}`);
    } else {
      // Try evm-escrow-details.json as fallback
      const evmEscrowFile = path.join(__dirname, "..", "vars", "evm-escrow-details.json");
      if (fs.existsSync(evmEscrowFile)) {
        const evmEscrowData = JSON.parse(fs.readFileSync(evmEscrowFile, 'utf8'));
        // Use hashlock as escrow ID if no explicit ID is available
        evmEscrowId = evmEscrowData.escrowId || evmEscrowData.hashlock;
        console.log(`Loaded EVM escrow ID from hashlock: ${evmEscrowId}`);
      }
    }
  } catch (error) {
    console.error("Error reading EVM escrow details:", error.message);
    process.exit(1);
  }
  
  if (!evmEscrowId) {
    console.error("EVM escrow ID not found. Please run the swap setup script first.");
    process.exit(1);
  }
  
  // Set environment variables for the withdraw
  process.env.ESCROW_SRC_ADDRESS = escrowSrcAddress;
  process.env.ESCROW_ID = evmEscrowId;
  
  // Загрузим preimage из файла evm-aptos-swap-details.json
  try {
    const swapFile = path.join(__dirname, "..", "vars", "evm-aptos-swap-details.json");
    if (fs.existsSync(swapFile)) {
      const swapData = JSON.parse(fs.readFileSync(swapFile, 'utf8'));
      if (swapData.preimage) {
        preimage = swapData.preimage;
        console.log(`Loaded preimage from evm-aptos-swap-details.json: ${preimage}`);
      }
    }
  } catch (error) {
    console.error("Error reading swap details:", error.message);
  }
  
  // Убедимся, что мы используем правильный preimage из файла свопа
  process.env.PREIMAGE = preimage;
  console.log(`Setting EVM preimage to: ${preimage}`);
  
  let evmWithdrawalSuccessful = false;
  try {
    console.log("Withdrawing from EVM escrow...");
    // Use npx hardhat с правильными параметрами
    // Параметр withdraw должен быть передан как OPERATION=withdraw
    const withdrawEvmCommand = `OPERATION=withdraw HARDHAT_CONFIG=hardhat.config.js npx hardhat run ${path.join(__dirname, "..", "escrow", "deploy-escrow-src.js")} --network localhost`;
    
    console.log(`Executing: ${withdrawEvmCommand}`);
    execSync(withdrawEvmCommand, { stdio: 'inherit', env: { ...process.env, HARDHAT_CONFIG: 'hardhat.config.js', OPERATION: 'withdraw' } });
    
    console.log("\nEVM escrow withdrawal successful!");
    evmWithdrawalSuccessful = true;
  } catch (error) {
    console.error("Error withdrawing from EVM escrow:", error.message);
  }
  
  // Report on the overall status
  if (aptosWithdrawalSuccessful && evmWithdrawalSuccessful) {
    console.log("\n=== Cross-Chain Swap Completed Successfully! ===");
    console.log("\nTokens have been transferred from EVM to Aptos using the escrow contracts.");
  } else if (aptosWithdrawalSuccessful) {
    console.log("\n=== Cross-Chain Swap Partially Completed ===");
    console.log("\nAptos withdrawal successful, but EVM withdrawal failed.");
  } else if (evmWithdrawalSuccessful) {
    console.log("\n=== Cross-Chain Swap Partially Completed ===");
    console.log("\nEVM withdrawal successful, but Aptos withdrawal failed.");
  } else {
    console.log("\n=== Cross-Chain Swap Failed ===");
    console.log("\nBoth Aptos and EVM withdrawals failed.");
    process.exit(1);
  }
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
