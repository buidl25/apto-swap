/**
 * Initialize the Aptos HTLC module
 * 
 * This script initializes the Atomic Swap module on the Aptos blockchain.
 * It must be run before creating any HTLCs on Aptos.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Executes an Aptos CLI command and returns the output
 * @param {string} command - The command to execute
 * @returns {string} - Command output
 */
function executeAptosCommand(command) {
  try {
    const output = execSync(`aptos ${command}`, { encoding: "utf-8" });
    return output;
  } catch (error) {
    console.error(`Error executing Aptos command: ${error.message}`);
    if (error.stdout) console.error(`Command output: ${error.stdout}`);
    if (error.stderr) console.error(`Command error: ${error.stderr}`);
    throw error;
  }
}

/**
 * Main function to initialize the Aptos HTLC module
 */
async function main() {
  console.log("=== Initializing Aptos HTLC Module ===");
  
  // Check if the module is already published
  try {
    console.log("Checking if atomic_swap module is already published...");
    executeAptosCommand("move compile --package-dir aptos-contracts --save-metadata");
    console.log("Atomic swap module compiled successfully");
    
    // Publish the module if not already published
    console.log("\nPublishing atomic_swap module...");
    const aptosAddress = process.env.APTOS_SENDER || "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
    const publishOutput = executeAptosCommand(`move publish --package-dir aptos-contracts --named-addresses test_aptos_token=${aptosAddress} --assume-yes`);
    console.log("Module published successfully");
    
    // Initialize the module
    console.log("\nInitializing atomic_swap module...");
    const initializeOutput = executeAptosCommand(`move run --function-id ${aptosAddress}::atomic_swap::initialize --assume-yes`);
    console.log(`\nAtomic Swap module initialized at address: ${aptosAddress}`);
    console.log("\nYou can now use this module for cross-chain atomic swaps.");
  
    // Save the module address to a JSON file
    console.log("\nSaving module address to JSON file...");
    const varsDir = path.join(__dirname, "vars");
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }
  
    const filePath = path.join(varsDir, "aptos-htlc-address.json");
    const jsonContent = JSON.stringify({
      "aptos-htlc-address": aptosAddress
    }, null, 4);
  
    fs.writeFileSync(filePath, jsonContent);
    console.log(`Aptos HTLC module address saved to ${filePath}`);
    console.log(`Module address: ${aptosAddress}`);
    
    // Update .env.example with the module address
    console.log("\nAdd this to your .env file:");
    console.log(`APTOS_MODULE_ADDRESS=${aptosAddress}`);
    
    console.log("\nAptos HTLC module is ready to use!");
    
    return {
      success: true,
      moduleAddress: aptosAddress
    };
  } catch (error) {
    console.error("Failed to initialize Aptos HTLC module:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the script if run directly
if (require.main === module) {
  main()
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
