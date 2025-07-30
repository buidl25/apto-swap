/**
 * Check Aptos HTLC contracts in the HTLCStore
 * 
 * This script checks the contracts stored in the HTLCStore on the Aptos blockchain
 * to help debug issues with contract IDs.
 */

const { execSync } = require("child_process");
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { AptosClient, HexString, Types } = require('aptos');
const crypto = require('crypto');
dotenv.config();

// Initialize Aptos client
const NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com';
const aptosClient = new AptosClient(NODE_URL);

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
 * Main function to check HTLC contracts
 */
async function main() {
  console.log("=== Checking Aptos HTLC Contracts ===\n");
  
  // Get parameters from environment variables
  const aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  
  console.log(`Module Address: ${aptosModuleAddress}\n`);
  
  try {
    // 1. First check the HTLCStore resource
    console.log("Checking HTLCStore resource...");
    const resourcesCommand = `account list --query resources --account ${aptosModuleAddress}`;
    console.log(`Executing: aptos ${resourcesCommand}`);
    const resourcesOutput = executeAptosCommand(resourcesCommand);
    
    // Look for HTLCStore in the output
    if (resourcesOutput.includes('HTLCStore')) {
      console.log("\nHTLCStore resource found!\n");
    } else {
      console.log("\nHTLCStore resource not found!\n");
    }
    
    // 2. Try to get the module resources and check for HTLCs
    console.log("\nChecking module resources for HTLCs...");
    try {
      // Get account resources
      const resources = await aptosClient.getAccountResources(aptosModuleAddress);
      
      // Look for HTLCStore resource
      const htlcStoreResource = resources.find(res => 
        res.type.includes('HTLCStore') || res.type.includes('atomic_swap::HTLCStore'));
      
      if (htlcStoreResource) {
        console.log("Found HTLCStore resource:");
        console.log(JSON.stringify(htlcStoreResource, null, 2));
        
        // Check if there's a table handle we can use to query HTLCs
        if (htlcStoreResource.data && htlcStoreResource.data.contracts) {
          console.log("\nFound contracts table handle:", htlcStoreResource.data.contracts.handle);
          
          // We could query the table here if we had the contract ID as a key
          // For now, let's just show what we have
        }
      } else {
        console.log("No HTLCStore resource found in module resources.");
      }
      
      // Try to get transactions for the module address to find HTLC creation events
      console.log("\nChecking recent transactions for HTLC creation...");
      const transactions = await aptosClient.getAccountTransactions(aptosModuleAddress, { limit: 10 });
      
      console.log(`Found ${transactions.length} recent transactions.`);
      
      // Look for create_htlc function calls
      const htlcTxs = transactions.filter(tx => 
        tx.payload && 
        tx.payload.function && 
        tx.payload.function.includes('create_htlc'));
      
      if (htlcTxs.length > 0) {
        console.log(`\nFound ${htlcTxs.length} HTLC creation transactions:`);
        
        for (const tx of htlcTxs) {
          console.log(`\nTransaction hash: ${tx.hash}`);
          console.log(`Function: ${tx.payload.function}`);
          console.log(`Arguments: ${JSON.stringify(tx.payload.arguments)}`);
          
          // Check if we can extract the parameters from the transaction
          if (tx.payload.arguments && tx.payload.arguments.length >= 4) {
            const recipient = tx.payload.arguments[0];
            const amount = tx.payload.arguments[1];
            const hashlock = tx.payload.arguments[2];
            const timelock = tx.payload.arguments[3];
            
            console.log("\nExtracted parameters:");
            console.log(`Recipient: ${recipient}`);
            console.log(`Amount: ${amount}`);
            console.log(`Hashlock: ${hashlock}`);
            console.log(`Timelock: ${timelock}`);
            
            // Try to calculate the contract ID using these parameters
            try {
              const sender = aptosModuleAddress;
              const contractId = generateContractId(sender, recipient, amount, hashlock, timelock);
              console.log(`\nCalculated contract ID from transaction parameters: ${contractId}`);
            } catch (error) {
              console.error(`Error calculating contract ID: ${error.message}`);
            }
          }
        }
      } else {
        console.log("No HTLC creation transactions found.");
      }
    } catch (error) {
      console.error(`Error checking module resources: ${error.message}`);
    }
    
    // 3. Add a function to generate contract ID and verify our saved one
    console.log("\nVerifying our saved contract ID calculation...")
    
    // Load our calculated contract ID from the saved file
    const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
    if (fs.existsSync(htlcDetailsPath)) {
      try {
        const htlcDetails = JSON.parse(fs.readFileSync(htlcDetailsPath, 'utf8'));
        console.log(`\nOur calculated contract ID: ${htlcDetails.contractId}`);
        console.log(`Preimage: ${htlcDetails.preimage}`);
        console.log(`Recipient: ${htlcDetails.recipient}`);
        console.log(`Amount: ${htlcDetails.amount}`);
        console.log(`Hashlock: ${htlcDetails.hashlock}`);
        console.log(`Timelock: ${htlcDetails.timelock}`);
      } catch (error) {
        console.error(`Error reading HTLC details: ${error.message}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to check Aptos HTLC contracts: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a contract ID from HTLC parameters
 * @param {string} sender - The sender address
 * @param {string} recipient - The recipient address
 * @param {string|number} amount - The token amount
 * @param {string} hashlock - The hashlock (hash of preimage)
 * @param {string|number} timelock - The timelock timestamp
 * @returns {string} - The contract ID
 */
function generateContractId(sender, recipient, amount, hashlock, timelock) {
  console.log('\nGenerating contract ID with the following parameters:');
  console.log(`Sender: ${sender}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Amount: ${amount}`);
  console.log(`Hashlock: ${hashlock}`);
  console.log(`Timelock: ${timelock}`);
  
  // Convert all parameters to Buffer
  const senderBuf = Buffer.from(sender.replace('0x', ''), 'hex');
  const recipientBuf = Buffer.from(recipient.replace('0x', ''), 'hex');
  
  // Convert amount to 8-byte little-endian buffer
  const amountNum = BigInt(amount);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amountNum);
  
  // Convert hashlock to buffer
  const hashlockBuf = Buffer.from(hashlock.replace('0x', ''), 'hex');
  
  // Convert timelock to 8-byte little-endian buffer
  const timelockNum = BigInt(timelock);
  const timelockBuf = Buffer.alloc(8);
  timelockBuf.writeBigUInt64LE(timelockNum);
  
  // Concatenate all buffers
  const data = Buffer.concat([senderBuf, recipientBuf, amountBuf, hashlockBuf, timelockBuf]);
  console.log(`Raw data for hashing (hex): ${data.toString('hex')}`);
  
  // Hash with SHA3-256
  const hash = crypto.createHash('sha3-256').update(data).digest('hex');
  console.log(`Generated contract ID: 0x${hash}`);
  
  return `0x${hash}`;
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

module.exports = { main, generateContractId };
