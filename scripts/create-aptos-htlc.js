/**
 * Create an HTLC on the Aptos side
 * 
 * This script creates a Hashed Timelock Contract (HTLC) on the Aptos blockchain
 * to lock tokens for a cross-chain swap.
 */

const { execSync } = require("child_process");
const crypto = require("crypto");
const { AptosClient, AptosAccount, HexString, Types } = require("aptos");
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();

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
 * Main function to create an HTLC on Aptos
 */
async function main() {
  console.log('=== Creating Aptos HTLC ===');
  console.log('Debug: Starting main function');
  
  // Get parameters from environment variables or use defaults
  const aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const aptosSender = process.env.APTOS_SENDER || aptosModuleAddress;
  const aptosRecipient = process.env.APTOS_RECIPIENT || '0x318942fc76d84578ab2efc2c85ed031d06c4f444f3cdae9bbaf09901677b573f';
  const amount = process.env.AMOUNT || "10";
  
  // Generate or use preimage and calculate hashlock
  const preimage = process.env.PREIMAGE || "secret";
  
  // Calculate hashlock from preimage if not provided
  let hashlock;
  if (process.env.HASHLOCK) {
    hashlock = process.env.HASHLOCK;
  } else {
    // Convert preimage to buffer and hash it
    const preimageBuffer = Buffer.from(preimage, 'utf8');
    hashlock = crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
    console.log(`Generated hashlock from preimage '${preimage}': 0x${hashlock}`);
  }
    
  // Timelock is 30 minutes from now if not specified
  const currentTime = Math.floor(Date.now() / 1000);
  const timelock = process.env.TIMELOCK ? 
    parseInt(process.env.TIMELOCK) + currentTime : 
    currentTime + 1800; // 30 minutes
    
  console.log(`Module Address: ${aptosModuleAddress}`);
  console.log(`Sender: ${aptosSender}`);
  console.log(`Recipient: ${aptosRecipient}`);
  console.log(`Amount: ${amount} tokens`);
  console.log(`Hashlock: 0x${hashlock.replace(/^0x/, '')}`);
  console.log(`Timelock: ${timelock} (${new Date(timelock * 1000).toLocaleString()})`);
  console.log(`Preimage (secret): ${preimage}`);
  
  try {
    // Create the HTLC on Aptos
    console.log("\nCreating HTLC...");
    console.log("Command parameters:");
    console.log(`Module Address: ${aptosModuleAddress}`);
    console.log(`Recipient: ${aptosRecipient}`);
    console.log(`Amount: ${amount}`);
    console.log(`Hashlock: ${hashlock}`);
    console.log(`Timelock: ${timelock}`);
    
    // Convert hashlock to hex string without 0x prefix
    const hashlockHex = hashlock.startsWith('0x') ? hashlock.slice(2) : hashlock;
    
    // Execute the Aptos CLI command to create the HTLC
    const command = `move run --function-id ${aptosModuleAddress}::atomic_swap::create_htlc --type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken --args address:${aptosRecipient} u64:${amount} hex:0x${hashlockHex} u64:${timelock} --assume-yes`;
    
    console.log(`\nExecuting command: aptos ${command}`);
    
    const output = executeAptosCommand(command);
    console.log("HTLC created successfully!");
    console.log("Command output:");
    console.log(output);
    
    // Extract the transaction hash from the output
    const txHashMatch = output.match(/Transaction submitted: .*\/txn\/([a-zA-Z0-9]+)\?/i);
    const txHash = txHashMatch ? txHashMatch[1] : 'unknown';
    console.log(`Transaction hash: ${txHash}`);
    
    // Try to get the contract ID from the transaction events
    console.log('\nWaiting for transaction to be confirmed...');
    let contractId;
    
    try {
      // Wait a bit for the transaction to be confirmed
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get the transaction details
      const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
      const txDetails = await client.getTransactionByHash(txHash);
      
      // Extract the contract ID from the transaction events
      const events = txDetails.events || [];
      const htlcCreatedEvent = events.find(e => e.type.includes('::atomic_swap::HTLCCreated'));
      
      if (htlcCreatedEvent && htlcCreatedEvent.data && htlcCreatedEvent.data.contract_id) {
        contractId = htlcCreatedEvent.data.contract_id;
        console.log(`\nContract ID (from event): ${contractId}`);
      } else {
        // Fallback to calculated contract ID
        contractId = generateContractId(
          aptosSender,
          aptosRecipient,
          amount,
          hashlock,
          timelock
        );
        console.log(`\nContract ID (calculated): ${contractId}`);
      }
    } catch (error) {
      console.error(`Error fetching transaction events: ${error.message}`);
      
      // Fallback to calculated contract ID
      contractId = generateContractId(
        aptosSender,
        aptosRecipient,
        amount,
        hashlock,
        timelock
      );
      console.log(`\nContract ID (calculated): ${contractId}`);
    }
    
    console.log(`\nSave this information to use when withdrawing:`);
    console.log(`APTOS_CONTRACT_ID=${contractId}`);
    console.log(`PREIMAGE=${preimage}`);
    
    // Create vars directory if it doesn't exist
    const varsDir = path.join(__dirname, 'vars');
    if (!fs.existsSync(varsDir)) {
      console.log('Creating vars directory...');
      fs.mkdirSync(varsDir, { recursive: true });
    }
    
    const htlcDetailsPath = path.join(varsDir, 'aptos-htlc-details.json');
    console.log(`HTLC details path: ${htlcDetailsPath}`);
    
    const htlcDetails = {
      contractId,
      preimage,
      recipient: aptosRecipient,
      amount,
      hashlock,
      timelock,
      timestamp: new Date().toISOString()
    };
    
    console.log('Writing HTLC details to file...');
    fs.writeFileSync(htlcDetailsPath, JSON.stringify(htlcDetails, null, 2));
    console.log(`\nHTLC details saved to ${htlcDetailsPath}`);
    
    return {
      success: true,
      txHash,
      contractId
    };
  } catch (error) {
    console.error('Error creating Aptos HTLC:', error.message);
    return {
      success: false,
      error: error.message
    };
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
  
  // Concatenate all buffers in the correct order
  // Note: The order matters and must match the Move module's implementation
  const data = Buffer.concat([senderBuf, recipientBuf, amountBuf, hashlockBuf, timelockBuf]);
  console.log(`Raw data for hashing (hex): ${data.toString('hex')}`);
  
  // Hash with SHA3-256
  const hash = crypto.createHash('sha3-256').update(data).digest('hex');
  console.log(`Generated contract ID: 0x${hash}`);
  
  // For debugging, also log the contract ID without 0x prefix
  console.log(`Contract ID without 0x prefix: ${hash}`);
  
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

module.exports = { main };
