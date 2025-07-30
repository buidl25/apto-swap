/**
 * Withdraw from an HTLC on the Aptos side
 * 
 * This script withdraws tokens from a Hashed Timelock Contract (HTLC) on the Aptos blockchain
 * by providing the correct preimage (secret).
 */

const { execSync } = require("child_process");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Executes an Aptos CLI command and returns the output
 * @param {string} command - The command to execute
 * @returns {string} - Command output
 */
function executeAptosCommand(command) {
  try {
    const output = execSync(`aptos ${command}`, { encoding: 'utf8' });
    return output;
  } catch (error) {
    // Capture the error output for analysis
    const errorOutput = error.stdout || 'No output';
    console.error(`Command output: ${errorOutput}`);
    
    // Check for specific error codes in the error output
    if (errorOutput.includes('E_ALREADY_WITHDRAWN')) {
      throw new Error('E_ALREADY_WITHDRAWN: HTLC has already been withdrawn');
    } else if (errorOutput.includes('E_UNAUTHORIZED')) {
      throw new Error('E_UNAUTHORIZED: Only the recipient can withdraw funds');
    } else if (errorOutput.includes('E_TIMELOCK_EXPIRED')) {
      throw new Error('E_TIMELOCK_EXPIRED: The timelock has expired');
    } else if (errorOutput.includes('E_INVALID_PREIMAGE')) {
      throw new Error('E_INVALID_PREIMAGE: The provided preimage is invalid');
    }
    
    throw new Error(`Command failed: aptos ${command}`);
  }
}

/**
 * Main function to withdraw from an HTLC on Aptos
 */
async function main() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Import required modules
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const { execSync } = require('child_process');
    
    // Default return value
    let result = { success: false };
    
    // Get module address from environment variables
    const aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS;
    if (!aptosModuleAddress) {
      throw new Error('APTOS_MODULE_ADDRESS is not set in environment variables');
    }
    
    // Path to the saved HTLC details
    const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
    console.log(`Loading HTLC details from: ${htlcDetailsPath}`);
    
    // Initialize variables
    let contractId;
    let preimage;
    let aptosRecipient;
    
    // First priority: Load from JSON file
    let htlcDetails = null;
    if (fs.existsSync(htlcDetailsPath)) {
      try {
        // Read file with no caching
        const fileContent = fs.readFileSync(htlcDetailsPath, { encoding: 'utf8', flag: 'r' });
        console.log(`Raw file content: ${fileContent}`);
        
        htlcDetails = JSON.parse(fileContent);
        console.log(`Parsed HTLC details: ${JSON.stringify(htlcDetails, null, 2)}`);
        
        // Get values from the JSON file
        contractId = htlcDetails.contractId;
        preimage = htlcDetails.preimage;
        aptosRecipient = htlcDetails.recipient;
        
        console.log('Successfully loaded HTLC details from JSON file');
      } catch (error) {
        console.error(`Error loading HTLC details from file: ${error.message}`);
        if (error.stack) console.error(error.stack);
      }
    } else {
      console.log('HTLC details file not found');
    }
    
    // Second priority: Use environment variables if JSON values are missing
    if (!contractId) contractId = process.env.APTOS_CONTRACT_ID;
    if (!preimage) preimage = process.env.PREIMAGE;
    if (!aptosRecipient) aptosRecipient = process.env.APTOS_RECIPIENT;
    
    // Check if we have the required parameters
    if (!contractId) {
      throw new Error('Contract ID not found in JSON file or environment variables');
    }
    
    if (!preimage) {
      throw new Error('Preimage not found in JSON file or environment variables');
    }
    
    // Calculate the correct hashlock from preimage
    const preimageBuffer = Buffer.from(preimage, 'utf8');
    const calculatedHashlock = '0x' + crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
    console.log(`Calculated hashlock from preimage '${preimage}': ${calculatedHashlock}`);
    
    // Check if the hashlock in the JSON file is correct
    if (htlcDetails && htlcDetails.hashlock && htlcDetails.hashlock !== calculatedHashlock) {
      console.warn(`Warning: The hashlock in the JSON file (${htlcDetails.hashlock}) does not match the calculated hashlock (${calculatedHashlock})`);
      console.warn('Using the calculated hashlock for withdrawal to prevent E_INVALID_PREIMAGE error');
      
      // Update the JSON file with the correct hashlock
      htlcDetails.hashlock = calculatedHashlock;
      fs.writeFileSync(htlcDetailsPath, JSON.stringify(htlcDetails, null, 2));
      console.log('Updated JSON file with the correct hashlock');
    }
    
    // Also update the JSON file with the correct hashlock if it doesn't exist yet
    if (htlcDetails && !htlcDetails.hashlock) {
      htlcDetails.hashlock = calculatedHashlock;
      fs.writeFileSync(htlcDetailsPath, JSON.stringify(htlcDetails, null, 2));
      console.log('Added correct hashlock to JSON file');
    }
    
    if (!aptosRecipient) {
      throw new Error('Aptos recipient address not found in JSON file or environment variables');
    }
    
    console.log('=== Withdrawing from Aptos HTLC ===');
    console.log(`Module Address: ${aptosModuleAddress}`);
    console.log(`Contract ID: ${contractId}`);
    console.log(`Preimage: ${preimage}`);
    console.log(`Recipient: ${aptosRecipient}`);
    
    // First, let's try to check if the contract exists by listing resources
    console.log("Checking if contract exists in module resources...");
    try {
      const checkCommand = `account list --query resources --account ${aptosModuleAddress}`;
      console.log(`Executing command: aptos ${checkCommand}`);
      const checkOutput = executeAptosCommand(checkCommand);
      console.log("Module resources:");
      console.log(checkOutput);
    } catch (error) {
      console.error(`Error checking module resources: ${error.message}`);
    }
    
    // Format the contract ID correctly for the Aptos CLI command
    // The hex: prefix in Aptos CLI expects the value WITHOUT 0x prefix
    const formattedContractId = contractId.startsWith('0x') ? contractId.substring(2) : contractId;
    console.log(`Using contract ID: ${contractId}`);
    console.log(`Formatted contract ID for CLI: ${formattedContractId}`);
    console.log(`Using preimage: ${preimage}`);
    
    // Determine which profile to use for withdrawal
    // We need to use the recipient's profile for withdrawal to work
    const useRecipientProfile = process.env.USE_RECIPIENT_PROFILE === 'true';
    const profileOption = useRecipientProfile ? `--profile recipient` : '';
    
    const withdrawCommand = `move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
      `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
      `--args hex:${formattedContractId} string:${preimage} ` +
      `${profileOption} --assume-yes`;
    
    console.log(`Executing command: aptos ${withdrawCommand}`);
    
    try {
      const output = executeAptosCommand(withdrawCommand);
      console.log("Command output:");
      console.log(output);
      
      // Parse the output to get the transaction hash
      const outputJson = JSON.parse(output);
      const txHash = outputJson.Result?.transaction_hash;
      
      console.log(`Transaction hash: ${txHash || 'unknown'}`);
      console.log('Withdrawal successful!');
      
      // Check the balance after withdrawal
      try {
        const balanceCommand = `account list --query resources --account ${aptosRecipient}`;
        console.log("\nChecking balance after withdrawal...");
        const balanceOutput = executeAptosCommand(balanceCommand);
        // Try to find the token balance in the output
        if (balanceOutput.includes('TestAptosToken')) {
          console.log("Token balance found in account resources");
        } else {
          console.log("Could not find token balance in account resources");
        }
      } catch (error) {
        console.error(`Error checking balance: ${error.message}`);
      }
      
      // Set success result
      result = { success: true };
    } catch (error) {
      // Handle specific error codes
      if (error.message.includes('E_ALREADY_WITHDRAWN')) {
        console.log('\n===== HTLC ALREADY WITHDRAWN =====');
        console.log('This HTLC has already been withdrawn. The funds have been transferred to the recipient.');
        console.log('No further action is needed.');
        
        // Exit gracefully without throwing an error
        return { success: true, alreadyWithdrawn: true };
      } else if (error.message.includes('E_UNAUTHORIZED')) {
        console.log('\n===== UNAUTHORIZED WITHDRAWAL ATTEMPT =====');
        console.log('Only the recipient can withdraw funds from this HTLC.');
        console.log('Try running the command with USE_RECIPIENT_PROFILE=true to use the recipient profile.');
        console.log('Example: USE_RECIPIENT_PROFILE=true npm run withdraw-aptos-htlc');
        
        // Exit with error for unauthorized access
        throw new Error(`Failed to withdraw from Aptos HTLC: ${error.message}`);
      } else {
        // Handle other errors
        console.error(`Error executing Aptos command: ${error.message}`);
        throw new Error(`Failed to withdraw from Aptos HTLC: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("Failed to withdraw from Aptos HTLC:", error.message);
    throw error;
  }
  
  // Return success by default
  return { success: true };
}

// Execute the script if run directly
if (require.main === module) {
  main()
    .then((result) => {
      if (result && !result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
