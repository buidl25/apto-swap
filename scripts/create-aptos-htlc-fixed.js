/**
 * Create an HTLC on the Aptos side with proper preimage/hashlock handling
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
 * Compute hashlock from preimage
 * @param {string} preimage - The preimage to hash
 * @returns {string} - The hashlock (SHA3-256 hash of preimage)
 */
function computeHashlock(preimage) {
  const preimageBuffer = Buffer.from(preimage, 'utf8');
  const hashlock = crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
  return hashlock;
}

/**
 * Main function to create an HTLC on Aptos
 */
async function main() {
  console.log('=== Creating Aptos HTLC with Proper Hashlock ===');
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
  if (process.env.HASHLOCK && process.env.HASHLOCK !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    hashlock = process.env.HASHLOCK;
    // Убираем префикс 0x, если он есть
    if (hashlock.startsWith('0x')) {
      hashlock = hashlock.substring(2);
    }
    console.log(`Using provided hashlock: 0x${hashlock}`);
  } else {
    // Convert preimage to buffer and hash it
    const preimageBuffer = Buffer.from(preimage, 'utf8');
    hashlock = crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
    console.log(`Generated hashlock from preimage '${preimage}': 0x${hashlock}`);
  }
    
  // Timelock is 30 minutes from now if not specified
  // В Aptos таймлок должен быть абсолютным временем в секундах
  const currentTime = Math.floor(Date.now() / 1000);
  // Если TIMELOCK задан, проверяем, является ли он относительным или абсолютным временем
  // Если значение меньше года (в секундах), считаем его относительным и добавляем к текущему времени
  // Иначе используем как абсолютное время
  let timelock;
  if (process.env.TIMELOCK) {
    const parsedTimelock = parseInt(process.env.TIMELOCK);
    // Если значение меньше года (31536000 секунд), считаем его относительным
    if (parsedTimelock < 31536000) {
      timelock = currentTime + parsedTimelock;
    } else {
      timelock = parsedTimelock;
    }
  } else {
    // По умолчанию устанавливаем таймлок на 30 минут вперед
    timelock = currentTime + 1800; // 30 minutes
  }
    
  console.log(`Module Address: ${aptosModuleAddress}`);
  console.log(`Sender: ${aptosSender}`);
  console.log(`Recipient: ${aptosRecipient}`);
  console.log(`Amount: ${amount} tokens`);
  console.log(`Preimage: ${preimage}`);
  
  // Убедимся, что hashlock не содержит лишний префикс 0x
  const formattedHashlock = hashlock.startsWith('0x') ? hashlock.substring(2) : hashlock;
  console.log(`Hashlock: 0x${formattedHashlock}`);
  console.log(`Timelock: ${timelock} (${new Date(timelock * 1000).toLocaleString()})`);
  console.log(`Preimage: ${preimage}`);
  
  try {
    // Create the HTLC on Aptos
    console.log("\nCreating HTLC...");
    console.log("Command parameters:");
    console.log(`Module Address: ${aptosModuleAddress}`);
    console.log(`Recipient: ${aptosRecipient}`);
    console.log(`Amount: ${amount}`);
    console.log(`Hashlock: 0x${formattedHashlock}`);
    console.log(`Timelock: ${timelock}`);
    
    // Execute the Aptos CLI command to create the HTLC
    // Для hex: параметра в Aptos CLI нужен префикс 0x
    const command = `move run --function-id ${aptosModuleAddress}::atomic_swap::create_htlc --type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken --args address:${aptosRecipient} u64:${amount} hex:0x${formattedHashlock} u64:${timelock} --assume-yes`;
    
    console.log(`\nExecuting command: aptos ${command}`);
    
    const output = executeAptosCommand(command);
    console.log("HTLC created successfully!");
    console.log("Command output:");
    console.log(output);
    
    // Extract the transaction hash from the output
    const outputJson = JSON.parse(output);
    const txHash = outputJson.Result?.transaction_hash || 'unknown';
    console.log(`Transaction hash: ${txHash}`);
    
    // Generate contract ID
    const contractId = generateContractId(
      aptosSender, 
      aptosRecipient, 
      amount, 
      formattedHashlock, 
      timelock
    );
    
    console.log(`Contract ID (calculated): ${contractId}`);
    
    // Save the HTLC details to a file for later use
    const htlcDetails = {
      contractId,
      preimage,
      recipient: aptosRecipient,
      amount,
      hashlock: `0x${formattedHashlock}`,
      timelock,
      timestamp: Date.now()
    };
    
    console.log(`\nSave this information to use when withdrawing:`);
    console.log(`APTOS_CONTRACT_ID=${contractId}`);
    console.log(`PREIMAGE=${preimage}`);
    
    // Save to a file
    const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
    console.log(`HTLC details path: ${htlcDetailsPath}`);
    
    // Create the directory if it doesn't exist
    const varsDir = path.join(__dirname, 'vars');
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }
    
    console.log(`Writing HTLC details to file...`);
    fs.writeFileSync(htlcDetailsPath, JSON.stringify(htlcDetails, null, 2));
    console.log(`HTLC details saved to ${htlcDetailsPath}`);
    
    return {
      success: true,
      contractId,
      preimage,
      hashlock: `0x${hashlock}`,
      txHash
    };
  } catch (error) {
    console.error(`Error creating HTLC: ${error.message}`);
    if (error.stack) console.error(error.stack);
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
      if (result.success) {
        console.log(`\nHTLC created successfully with contract ID: ${result.contractId}`);
        process.exit(0);
      } else {
        console.error(`\nFailed to create HTLC: ${result.error}`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(`\nUnhandled error: ${error.message}`);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    });
}

module.exports = {
  main,
  generateContractId,
  computeHashlock
};
