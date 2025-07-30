/**
 * Interact with EscrowFactory Contract
 * 
 * This script provides functionality to interact with the EscrowFactory contract
 * in the hackathon_clone module on Aptos blockchain
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("\n=== Interacting with EscrowFactory Contract ===\n");
  
  // Get the module address from environment or saved file
  let moduleAddress = process.env.APTOS_MODULE_ADDRESS;
  
  // Try to read from the saved file if not in environment
  if (!moduleAddress) {
    try {
      const addressFile = path.join(__dirname, "..", "vars", "hackathon-clone-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        moduleAddress = addressData["hackathon-clone-address"];
        console.log(`Loaded module address from file: ${moduleAddress}`);
      }
    } catch (error) {
      console.error("Error reading module address:", error.message);
    }
  }
  
  if (!moduleAddress) {
    console.error("Module address not found. Please set APTOS_MODULE_ADDRESS or deploy the contracts first.");
    process.exit(1);
  }
  
  // Get operation from command line arguments
  const operation = process.argv[2] || "help";
  
  switch (operation) {
    case "create":
      await createEscrow(moduleAddress);
      break;
    case "list":
      await listEscrows(moduleAddress);
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

/**
 * Create a new escrow using the EscrowFactory
 */
async function createEscrow(moduleAddress) {
  const recipient = process.env.APTOS_RECIPIENT || moduleAddress;
  const amount = process.env.AMOUNT || "10";
  const timelock = process.env.TIMELOCK || "3600"; // Default 1 hour
  const hashlock = process.env.HASHLOCK;
  
  if (!hashlock) {
    console.error("HASHLOCK is required. Please set it in .env file or as an environment variable.");
    process.exit(1);
  }
  
  console.log("Creating new escrow with parameters:");
  console.log(`- Recipient: ${recipient}`);
  console.log(`- Amount: ${amount}`);
  console.log(`- Timelock: ${timelock} seconds`);
  console.log(`- Hashlock: ${hashlock}`);
  
  try {
    // Convert amount to Aptos token units (9 decimals)
    const aptosAmount = parseInt(amount) * 1000000000; // 9 decimals
    
    const command = `aptos move run \
      --function-id ${moduleAddress}::EscrowFactory::create_escrow \
      --args address:${recipient} u64:${aptosAmount} u64:${timelock} hex:${hashlock.startsWith('0x') ? hashlock.substring(2) : hashlock} \
      --profile ${moduleAddress} \
      --assume-yes`;
    
    console.log(`\nExecuting: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    console.log(result);
    
    console.log("\nEscrow created successfully through factory!");
    
    // Try to parse the transaction output to get the escrow ID
    try {
      const outputJson = JSON.parse(result);
      const txHash = outputJson.Result?.transaction_hash;
      console.log(`Transaction hash: ${txHash || 'unknown'}`);
      
      // Save the escrow details to a file
      const escrowDetails = {
        moduleAddress,
        recipient,
        amount,
        timelock,
        hashlock,
        txHash
      };
      
      const varsDir = path.join(__dirname, "..", "vars");
      if (!fs.existsSync(varsDir)) {
        fs.mkdirSync(varsDir, { recursive: true });
      }
      
      const escrowFile = path.join(varsDir, "hackathon-factory-escrow-details.json");
      fs.writeFileSync(escrowFile, JSON.stringify(escrowDetails, null, 2));
      console.log(`Escrow details saved to: ${escrowFile}`);
    } catch (error) {
      console.warn("Could not parse transaction output or save escrow details:", error.message);
    }
  } catch (error) {
    console.error("Error creating escrow through factory:", error.message);
    process.exit(1);
  }
}

/**
 * List all escrows created by the factory
 */
async function listEscrows(moduleAddress) {
  console.log("Listing escrows created by the factory...");
  
  try {
    // Check module resources to find escrows
    const checkCommand = `aptos account list --query resources --account ${moduleAddress}`;
    console.log(`\nExecuting: aptos ${checkCommand}`);
    const checkOutput = execSync(`aptos ${checkCommand}`, { encoding: 'utf8' });
    
    // Look for escrows in the output
    console.log("\nModule resources:");
    console.log(checkOutput);
    
    // Try to extract escrow information from the output
    const escrowPattern = new RegExp(`${moduleAddress}::EscrowFactory::Escrow`, 'g');
    const matches = checkOutput.match(escrowPattern);
    
    if (matches && matches.length > 0) {
      console.log(`\nFound ${matches.length} escrow(s) created by the factory.`);
    } else {
      console.log("\nNo escrows found created by the factory.");
    }
  } catch (error) {
    console.error("Error listing escrows:", error.message);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Usage: node interact-escrow-factory.js [operation]

Operations:
  create    - Create a new escrow through the factory
  list      - List all escrows created by the factory
  help      - Show this help message

Environment Variables:
  APTOS_MODULE_ADDRESS - The address of the deployed module
  APTOS_RECIPIENT      - Recipient address for the escrow
  AMOUNT               - Amount of tokens for the escrow
  TIMELOCK             - Timelock in seconds
  HASHLOCK             - Hashlock for the escrow
  `);
}

// Execute the main function and handle errors
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
