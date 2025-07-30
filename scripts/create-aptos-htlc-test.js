/**
 * Create a test HTLC on the Aptos side with a known preimage and hashlock
 * 
 * This script creates a Hashed Timelock Contract (HTLC) on the Aptos blockchain
 * with a known preimage and hashlock for testing withdrawal.
 */

const { execSync } = require("child_process");
const crypto = require("crypto");
const { AptosClient, AptosAccount, HexString } = require("aptos");
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
 * Main function to create a test HTLC on Aptos
 */
async function main() {
  console.log("=== Creating Test Aptos HTLC ===");
  
  // Get parameters from environment variables or use defaults
  const aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const aptosSender = process.env.APTOS_SENDER || aptosModuleAddress;
  const aptosRecipient = process.env.APTOS_RECIPIENT || aptosSender;
  const amount = process.env.AMOUNT || "10";
  
  // Use a known preimage and calculate its hashlock
  const preimage = "test_secret";
  const preimageBuffer = Buffer.from(preimage);
  const hashlock = crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
  
  // Set timelock to 1 hour from now
  const currentTime = Math.floor(Date.now() / 1000);
  const timelock = currentTime + 3600; // 1 hour
  
  console.log(`Module Address: ${aptosModuleAddress}`);
  console.log(`Sender: ${aptosSender}`);
  console.log(`Recipient: ${aptosRecipient}`);
  console.log(`Amount: ${amount} tokens`);
  console.log(`Preimage (secret): ${preimage}`);
  console.log(`Hashlock: 0x${hashlock}`);
  console.log(`Timelock: ${timelock} (${new Date(timelock * 1000).toLocaleString()})`);
  
  try {
    // Create the HTLC
    console.log("\nCreating HTLC...");
    const createHtlcCommand = `move run --function-id ${aptosModuleAddress}::atomic_swap::create_htlc ` +
      `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
      `--args address:${aptosRecipient} u64:${amount} hex:0x${hashlock} u64:${timelock} ` +
      `--assume-yes`;
    
    console.log(`Executing command: aptos ${createHtlcCommand}`);
    const createOutput = executeAptosCommand(createHtlcCommand);
    
    // Parse the transaction hash from the output
    const txHashMatch = createOutput.match(/Transaction submitted: https:\/\/explorer\.aptoslabs\.com\/txn\/([0-9a-fA-F]+)\?network=devnet/);
    const txHash = txHashMatch ? txHashMatch[1] : "unknown";
    
    console.log(`\nHTLC created successfully!`);
    console.log(`Transaction hash: ${txHash}`);
    
    // Wait for the transaction to be confirmed and fetch events
    console.log(`\nWaiting for transaction to be confirmed...`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    // Get transaction events to extract the contract ID
    try {
      const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
      const txInfo = await client.getTransactionByHash(txHash);
      
      // Look for HTLCCreatedEvent in the events
      let contractId = null;
      if (txInfo && txInfo.events) {
        for (const event of txInfo.events) {
          if (event.type.includes('HTLCCreatedEvent')) {
            contractId = event.data.contract_id;
            break;
          }
        }
      }
      
      if (contractId) {
        console.log(`\nContract ID (from events): ${contractId}`);
        console.log(`\nSave this information to use when withdrawing:`);
        console.log(`APTOS_CONTRACT_ID=${contractId}`);
        console.log(`PREIMAGE=${preimage}`);
        
        return {
          success: true,
          txHash,
          contractId,
          preimage,
          hashlock
        };
      } else {
        console.error("Could not find contract ID in transaction events");
        return {
          success: false,
          error: "Contract ID not found in events"
        };
      }
    } catch (error) {
      console.error(`Error fetching transaction events: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  } catch (error) {
    console.error("Failed to create Aptos HTLC:", error.message);
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
