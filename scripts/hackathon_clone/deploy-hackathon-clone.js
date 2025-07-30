/**
 * Deploy Hackathon Clone Contracts
 * 
 * This script deploys the hackathon_clone contracts to the Aptos blockchain
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("\n=== Deploying Hackathon Clone Contracts ===\n");
  
  // Get the module address from environment or use default
  const moduleAddress = process.env.APTOS_MODULE_ADDRESS || "default";
  console.log(`Using profile: ${moduleAddress}`);
  
  try {
    // Compile the module first
    console.log("Compiling hackathon_clone module...");
    const compileCommand = `aptos move compile --package-dir aptos-contracts --named-addresses module_addr=${moduleAddress}`;
    
    console.log(`Executing: ${compileCommand}`);
    execSync(compileCommand, { stdio: 'inherit' });
    
    // Deploy the module
    console.log("\nDeploying hackathon_clone module...");
    const deployCommand = `aptos move publish --package-dir aptos-contracts --named-addresses module_addr=${moduleAddress} --max-gas 100000`;
    
    console.log(`Executing: ${deployCommand}`);
    execSync(deployCommand, { stdio: 'inherit' });
    
    console.log("\n=== Hackathon Clone Contracts Deployed Successfully ===\n");
    
    // Save the module address to a file for later use
    const varsDir = path.join(__dirname, "..", "vars");
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }
    
    // Create addresses object with the deployed modules
    const deployedAddresses = {
      "escrow-dst-address": `${moduleAddress}::escrow_dst`,
      "escrow-factory-address": `${moduleAddress}::escrow_factory`
    };
    
    // Path for both files
    const addressFile = path.join(varsDir, "hackathon-clone-address.json");
    const aptosTokenAddressFile = path.join(varsDir, "aptos-token-address.json");
    
    // Save to hackathon-clone-address.json
    fs.writeFileSync(addressFile, JSON.stringify({
      "hackathon-clone-address": moduleAddress
    }, null, 2));
    
    // Read existing aptos-token-address.json if it exists
    let existingData = {};
    try {
      if (fs.existsSync(aptosTokenAddressFile)) {
        const fileContent = fs.readFileSync(aptosTokenAddressFile, 'utf8');
        existingData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.log(`No existing address file found or error reading it: ${error.message}`);
    }
    
    // Merge existing data with new addresses
    const updatedAddresses = { ...existingData, ...deployedAddresses };
    
    // Write to aptos-token-address.json
    fs.writeFileSync(
      aptosTokenAddressFile,
      JSON.stringify(updatedAddresses, null, 4),
      'utf8'
    );
    
    console.log(`Module address saved to: ${addressFile}`);
    console.log(`Deployed addresses saved to: ${aptosTokenAddressFile}`);
    
  } catch (error) {
    console.error("Error deploying hackathon_clone contracts:", error.message);
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
