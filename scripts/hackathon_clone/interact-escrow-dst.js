/**
 * Interact with EscrowDst Contract
 * 
 * This script provides functionality to interact with the EscrowDst contract
 * in the hackathon_clone module on Aptos blockchain
 */

const { execSync } = require("child_process");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

/**
 * Fetch transaction details from Aptos REST API
 */
async function fetchTransactionDetails(txHash) {
  console.log(`Fetching transaction details for hash: ${txHash}`);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fullnode.devnet.aptoslabs.com',
      port: 443,
      path: `/v1/transactions/by_hash/${txHash}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const txDetails = JSON.parse(data);
            console.log(`Transaction details fetched successfully`);
            resolve(txDetails);
          } catch (error) {
            console.error('Error parsing transaction details:', error.message);
            reject(error);
          }
        } else {
          console.error(`API request failed with status code: ${res.statusCode}`);
          console.error(`Response: ${data}`);
          reject(new Error(`API request failed with status code: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error fetching transaction details:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

async function main() {
  console.log("\n=== Interacting with EscrowDst Contract ===\n");
  
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
    case "withdraw":
      await withdrawFromEscrow(moduleAddress);
      break;
    case "refund":
      await refundEscrow(moduleAddress);
      break;
    case "check":
      await checkEscrow(moduleAddress);
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

/**
 * Create a new escrow in EscrowDst contract
 */
async function createEscrow(moduleAddress) {
  const recipient = process.env.APTOS_RECIPIENT || moduleAddress;
  const amount = process.env.AMOUNT || "0.05"; // Default to a smaller amount (0.05 APT)
  const timelock = process.env.TIMELOCK || "3600"; // Default 1 hour
  const hashlock = process.env.HASHLOCK;
  
  if (!hashlock) {
    console.error("HASHLOCK is required. Please set it in .env file or as an environment variable.");
    process.exit(1);
  }
  
  // Generate a random order hash if not provided
  const orderHash = process.env.ORDER_HASH || `0x${crypto.randomBytes(32).toString('hex')}`;
  // Use default address as maker
  const maker = process.env.MAKER_ADDRESS || '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
  // Set safety deposit (default to 0)
  const safetyDeposit = process.env.SAFETY_DEPOSIT || '0';
  // Set delays for different operations
  const dstWithdrawalDelay = process.env.DST_WITHDRAWAL_DELAY || timelock;
  const dstPublicWithdrawalDelay = process.env.DST_PUBLIC_WITHDRAWAL_DELAY || (parseInt(timelock) + 600).toString(); // Default: timelock + 10 minutes
  const dstCancellationDelay = process.env.DST_CANCELLATION_DELAY || timelock;

  console.log("Creating new escrow with parameters:");
  console.log(`- Order Hash: ${orderHash}`);
  console.log(`- Hashlock: ${hashlock}`);
  console.log(`- Maker: ${maker}`);
  console.log(`- Recipient: ${recipient}`);
  console.log(`- Amount: ${amount}`);
  console.log(`- Safety Deposit: ${safetyDeposit}`);
  console.log(`- Withdrawal Delay: ${dstWithdrawalDelay} seconds`);
  console.log(`- Public Withdrawal Delay: ${dstPublicWithdrawalDelay} seconds`);
  console.log(`- Cancellation Delay: ${dstCancellationDelay} seconds`);
  
  try {
    // Convert amount to Aptos token units (9 decimals)
    const aptosAmount = parseInt(amount) * 1000000000; // 9 decimals
    
    try {
      const command = `aptos move run \
        --function-id ${moduleAddress}::escrow_factory::create_dst_escrow \
        --type-args 0x1::aptos_coin::AptosCoin \
        --args hex:${orderHash.startsWith('0x') ? orderHash.substring(2) : orderHash} \
               hex:${hashlock.startsWith('0x') ? hashlock.substring(2) : hashlock} \
               address:${maker} \
               address:${recipient} \
               u64:${aptosAmount} \
               u64:${safetyDeposit} \
               u64:${dstWithdrawalDelay} \
               u64:${dstPublicWithdrawalDelay} \
               u64:${dstCancellationDelay} \
        --profile default \
        --assume-yes`;
      
      console.log(`\nExecuting: ${command}`);
      const output = execSync(command, { encoding: 'utf8' });
      console.log(output);
      
      // Extract transaction hash from output
      const txHashMatch = output.match(/transaction_hash":\s*"([^"]+)/);
      const txHash = txHashMatch ? txHashMatch[1] : null;
      
      if (txHash) {
        console.log("\nEscrow created successfully!");
        console.log(`Transaction hash: ${txHash}`);
        
        // Save escrow details to file
        const escrowDetails = {
          moduleAddress,
          recipient,
          amount,
          timelock,
          hashlock,
          txHash,
          orderHash // Сохраняем orderHash для использования в withdraw/refund
        };
        
        // Create directory if it doesn't exist
        const varsDir = path.join(__dirname, '..', 'vars');
        if (!fs.existsSync(varsDir)) {
          fs.mkdirSync(varsDir, { recursive: true });
        }
        
        const filePath = path.join(varsDir, 'hackathon-escrow-details.json');
        fs.writeFileSync(filePath, JSON.stringify(escrowDetails, null, 2));
        console.log(`Escrow details saved to: ${filePath}`);
        
        // Также сохраняем orderHash в отдельный файл для использования в withdraw/refund
        const orderHashFilePath = path.join(varsDir, 'hackathon-escrow-order-hash.txt');
        fs.writeFileSync(orderHashFilePath, orderHash);
        console.log(`Order hash saved to: ${orderHashFilePath}`);
      } else {
        console.error("Failed to extract transaction hash from output.");
      }
    } catch (error) {
      console.error("Error creating escrow:", error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error creating escrow:", error.message);
    process.exit(1);
  }
}

/**
 * Withdraw from an escrow in EscrowDst contract
 */
/**
 * Вычисляет ID контракта, аналогично функции compute_contract_id в Move
 * 
 * @param {string} orderHash - хеш ордера (vector<u8>)
 * @param {string} hashlock - хеш для блокировки (vector<u8>)
 * @param {string} maker - адрес создателя (address)
 * @param {string} recipient - адрес получателя (address)
 * @param {string} amount - сумма (u64)
 * @param {string} safetyDeposit - страховой депозит (u64)
 * @param {string} withdrawalDelay - задержка для вывода (u64)
 * @param {string} publicWithdrawalDelay - задержка для публичного вывода (u64)
 * @param {string} cancellationDelay - задержка для отмены (u64)
 * @returns {string} - хеш контракта
 */
/**
 * Вычисляет ID контракта, аналогично функции compute_contract_id в Move
 * 
 * @param {string} orderHash - хеш ордера (vector<u8>)
 * @param {string} hashlock - хеш для блокировки (vector<u8>)
 * @param {string} maker - адрес создателя (address)
 * @param {string} recipient - адрес получателя (address)
 * @param {string} amount - сумма (u64)
 * @param {string} safetyDeposit - страховой депозит (u64)
 * @param {number} deployedAt - время создания эскроу (u64)
 * @param {string} withdrawalDelay - задержка для вывода (u64)
 * @param {string} publicWithdrawalDelay - задержка для публичного вывода (u64)
 * @param {string} cancellationDelay - задержка для отмены (u64)
 * @returns {string} - хеш контракта
 */
function computeContractId(orderHash, hashlock, maker, recipient, amount, safetyDeposit, deployedAt, withdrawalDelay, publicWithdrawalDelay, cancellationDelay) {
  // Используем crypto для вычисления SHA3-256 хеша
  const crypto = require('crypto');
  
  // Функция для BCS сериализации адреса (32 байта)
  function serializeAddress(address) {
    // Удаляем префикс 0x, если он есть
    const addrHex = address.startsWith('0x') ? address.substring(2) : address;
    return Buffer.from(addrHex, 'hex');
  }
  
  // Функция для BCS сериализации строки
  function serializeString(str) {
    // Для строки в BCS сначала идет длина (ULEB128), затем сами байты
    // Для простоты используем фиксированный формат для token_type = "0x1::aptos_coin::AptosCoin"
    return Buffer.from([23, 48, 120, 49, 58, 58, 97, 112, 116, 111, 115, 95, 99, 111, 105, 110, 58, 58, 65, 112, 116, 111, 115, 67, 111, 105, 110]);
  }
  
  // Функция для BCS сериализации u64
  function serializeU64(value) {
    // Если это строка с десятичной точкой (APT), конвертируем в атомарные единицы (octas)
    let numValue;
    if (typeof value === 'string' && value.includes('.')) {
      // Конвертируем APT в octas (1 APT = 10^8 octas)
      numValue = BigInt(Math.floor(parseFloat(value) * 100000000));
    } else {
      numValue = BigInt(value);
    }
    
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(numValue, 0);
    return buffer;
  }
  
  // Создаем пустой буфер для данных
  let data = Buffer.alloc(0);
  
  // Добавляем все поля в соответствии с Move реализацией
  // Удаляем префикс 0x, если он есть
  const orderHashHex = orderHash.startsWith('0x') ? orderHash.substring(2) : orderHash;
  const hashlockHex = hashlock.startsWith('0x') ? hashlock.substring(2) : hashlock;
  
  // Добавляем order_hash и hashlock как есть (без BCS сериализации)
  data = Buffer.concat([data, Buffer.from(orderHashHex, 'hex')]);
  data = Buffer.concat([data, Buffer.from(hashlockHex, 'hex')]);
  
  // Добавляем остальные поля с BCS сериализацией
  data = Buffer.concat([data, serializeAddress(maker)]);
  data = Buffer.concat([data, serializeAddress(recipient)]);
  data = Buffer.concat([data, serializeString('0x1::aptos_coin::AptosCoin')]);
  data = Buffer.concat([data, serializeU64(amount)]);
  data = Buffer.concat([data, serializeU64(safetyDeposit)]);
  
  // Добавляем timelocks с использованием переданного значения deployedAt
  // Это значение должно быть точно таким же, как было установлено при создании эскроу
  data = Buffer.concat([data, serializeU64(deployedAt)]);
  data = Buffer.concat([data, serializeU64(withdrawalDelay)]);
  data = Buffer.concat([data, serializeU64(publicWithdrawalDelay)]);
  data = Buffer.concat([data, serializeU64(cancellationDelay)]);
  
  // Вычисляем SHA3-256 хеш
  const hash = crypto.createHash('sha3-256').update(data).digest('hex');
  
  // Возвращаем хеш с префиксом 0x
  return `0x${hash}`;
}

async function withdrawFromEscrow(moduleAddress) {
  const preimage = process.env.PREIMAGE;
  
  if (!preimage) {
    console.error("PREIMAGE is required. Please set it in .env file or as an environment variable.");
    process.exit(1);
  }

  console.log("Loading escrow details...");

  // Try to load escrow details from the saved file
  let escrowDetails;
  try {
    const escrowDetailsFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
    if (fs.existsSync(escrowDetailsFile)) {
      escrowDetails = JSON.parse(fs.readFileSync(escrowDetailsFile, 'utf8'));
      console.log("Loaded escrow details from file:", JSON.stringify(escrowDetails, null, 2));
    } else {
      console.error("Escrow details file not found:", escrowDetailsFile);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error loading escrow details:", error.message);
    process.exit(1);
  }
  
  // Also try to load swap details which might have the correct hashlock and preimage
  let swapDetails;
  try {
    const swapDetailsFile = path.join(__dirname, "..", "vars", "evm-aptos-swap-details.json");
    if (fs.existsSync(swapDetailsFile)) {
      swapDetails = JSON.parse(fs.readFileSync(swapDetailsFile, 'utf8'));
      console.log("Loaded swap details from file:", JSON.stringify(swapDetails, null, 2));
      
      // If the hashlock in swap details exists, use it
      if (swapDetails.hashlock) {
        console.log(`Using hashlock from swap details: ${swapDetails.hashlock}`);
        escrowDetails.hashlock = swapDetails.hashlock;
      }
      
      // If there's a preimage in the swap details, use it instead of the provided one
      // But only if no preimage was provided via environment variable
      if (swapDetails.preimage && !process.env.PREIMAGE) {
        console.log(`Using preimage from swap details: ${swapDetails.preimage}`);
        process.env.PREIMAGE = swapDetails.preimage;
      } else if (process.env.PREIMAGE) {
        console.log(`Using preimage from environment: ${process.env.PREIMAGE}`);
      }
    }
  } catch (error) {
    console.log("No swap details found or error reading them:", error.message);
  }

  // Extract parameters from escrow details or use environment variables as fallback
  const orderHash = process.env.ORDER_HASH || escrowDetails.orderHash || "0x088333ec4382ebf183baf46de0b26bc5ed5751016b7866f7949c5c5f888561da";
  const hashlock = process.env.HASHLOCK || escrowDetails.hashlock || "0x6903886e004fabf3729e5ac70b13df6c35fb75a67c845f6667176445cf858a86";
  const maker = process.env.MAKER_ADDRESS || escrowDetails.moduleAddress || '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
  const recipient = process.env.APTOS_RECIPIENT || escrowDetails.recipient || '0x318942fc76d84578ab2efc2c85ed031d06c4f444f3cdae9bbaf09901677b573f';
  const amount = process.env.AMOUNT || escrowDetails.amount || '0.05';
  const safetyDeposit = process.env.SAFETY_DEPOSIT || '0';
  const withdrawalDelay = process.env.WITHDRAWAL_DELAY || escrowDetails.timelock || '1800';
  const publicWithdrawalDelay = process.env.PUBLIC_WITHDRAWAL_DELAY || '2400';
  const cancellationDelay = process.env.CANCELLATION_DELAY || '1800';

  // Get deployed_at timestamp and contract ID from transaction
  let deployedAt;
  let contractId;
  
  if (escrowDetails.txHash) {
    console.log(`Found transaction hash: ${escrowDetails.txHash}`);
    try {
      const txDetails = await fetchTransactionDetails(escrowDetails.txHash);
      
      // Extract timestamp from transaction details (in microseconds, convert to seconds)
      if (txDetails && txDetails.timestamp) {
        deployedAt = Math.floor(parseInt(txDetails.timestamp) / 1000000);
        console.log(`Extracted deployed_at timestamp from transaction: ${deployedAt}`);
        
        // Save the deployed_at timestamp for future use
        const escrowDataFile = path.join(__dirname, "..", "vars", "escrow-data.json");
        fs.writeFileSync(escrowDataFile, JSON.stringify({ deployedAt }, null, 2));
        console.log(`Saved deployed_at timestamp to file: ${escrowDataFile}`);
        
        // Extract contract ID from events
        if (txDetails.events && txDetails.events.length > 0) {
          for (const event of txDetails.events) {
            if (event.type && event.type.includes('EscrowCreatedEvent') && event.data && event.data.contract_id) {
              contractId = event.data.contract_id;
              console.log(`Found contract ID in event: ${contractId}`);
              
              // Extract the correct hashlock from the event
              if (event.data.hashlock) {
                hashlock = event.data.hashlock;
                console.log(`Using hashlock from event: ${hashlock}`);
              }
              
              break;
            }
          }
        }
      } else {
        console.error("Transaction details do not contain a timestamp");
        deployedAt = Math.floor(Date.now() / 1000) - 3600; // Fallback to 1 hour ago
        console.log(`Using fallback deployed_at: ${deployedAt}`);
      }
    } catch (error) {
      console.error("Error fetching transaction details:", error.message);
      deployedAt = Math.floor(Date.now() / 1000) - 3600; // Fallback to 1 hour ago
      console.log(`Using fallback deployed_at due to API error: ${deployedAt}`);
    }
  } else {
    console.error("No transaction hash found in escrow details");
    deployedAt = Math.floor(Date.now() / 1000) - 3600; // Fallback to 1 hour ago
    console.log(`Using fallback deployed_at (no tx hash): ${deployedAt}`);
  }
  
  // Compute contract ID using the deployed_at timestamp if we didn't find it in the event
  if (!contractId) {
    contractId = computeContractId(
      orderHash,
      hashlock,
      maker,
      recipient,
      amount,
      safetyDeposit,
      deployedAt,
      withdrawalDelay,
      publicWithdrawalDelay,
      cancellationDelay
    );
    console.log(`Computed escrow contract ID: ${contractId}`);
  }

  console.log("Withdrawing from escrow with parameters:");
  console.log(`- Order Hash: ${orderHash}`);
  // Make sure we have the hashlock from swap details
  const hashlockToUse = swapDetails?.hashlock || escrowDetails.hashlock || '0x0000000000000000000000000000000000000000000000000000000000000000';
  console.log(`- Hashlock: ${hashlockToUse}`);
  console.log(`- Maker: ${moduleAddress}`);
  console.log(`- Recipient: ${escrowDetails.recipient}`);
  console.log(`- Amount: ${escrowDetails.amount}`);
  console.log(`- Safety Deposit: ${escrowDetails.safetyDeposit || 0}`);
  console.log(`- Withdrawal Delay: ${escrowDetails.timelock}`);
  console.log(`- Public Withdrawal Delay: ${escrowDetails.publicWithdrawalDelay || 2400}`);
  console.log(`- Cancellation Delay: ${escrowDetails.cancellationDelay || 1800}`);
  console.log(`- Deployed At: ${deployedAt}`);
  console.log(`- Contract ID: ${contractId}`);
  console.log(`- Preimage: ${preimage}`);
  
  try {
    // Use the contract ID from the event if available, otherwise use the order hash
    // Make sure to strip the 0x prefix if present
    const escrowIdToUse = contractId || orderHash;
    const escrowIdArg = escrowIdToUse.startsWith('0x') ? escrowIdToUse.substring(2) : escrowIdToUse;
    
    console.log(`Using escrow ID argument: hex:${escrowIdArg}`);
    
    // Try different preimage formats
    const preimageFormats = [];
    
    // Format 1: Direct hex string with hex: prefix
    if (preimage.startsWith('0x')) {
      preimageFormats.push(`hex:${preimage.substring(2)}`);
    } else {
      preimageFormats.push(`hex:${preimage}`);
    }
    
    // Format 2: Vector<u8> format
    const preimageBytes = Buffer.from(preimage.startsWith('0x') ? preimage.substring(2) : preimage, 'hex');
    let vectorFormat = 'vector[';
    for (let i = 0; i < preimageBytes.length; i++) {
      vectorFormat += preimageBytes[i];
      if (i < preimageBytes.length - 1) vectorFormat += ',';
    }
    vectorFormat += ']';
    preimageFormats.push(vectorFormat);
    
    // Format 3: String format
    preimageFormats.push(`string:${preimage}`);
    
    // Try each format until one succeeds
    let lastError = null;
    for (const preimageArg of preimageFormats) {
      console.log(`\nTrying preimage format: ${preimageArg}`);
      
      const command = `aptos move run \
        --function-id ${moduleAddress}::escrow_dst::withdraw \
        --type-args 0x1::aptos_coin::AptosCoin \
        --args hex:${escrowIdArg} ${preimageArg} \
        --max-gas 10000 \
        --gas-unit-price 100 \
        --profile default \
        --assume-yes`;
      
      console.log(`Executing withdraw: ${command}`);
      
      try {
        execSync(command, { stdio: 'inherit' });
        console.log('Withdrawal successful!');
        return; // Exit the function if successful
      } catch (error) {
        console.log(`Error with format ${preimageArg}:`, error.message);
        lastError = error;
      }
    }
    
    // If we get here, all formats failed
    throw lastError || new Error('All preimage formats failed');
  } catch (error) {
    console.error("Error executing withdraw command:\nExit code: " + error.status);
    console.error("stdout: " + error.stdout);
    console.error("stderr: " + error.stderr);
    throw new Error("Withdraw command failed with exit code " + error.status);
  }  
}

/**
 * Refund an escrow in EscrowDst contract
 */
async function refundEscrow(moduleAddress, escrowId) {
  if (!escrowId) {
    console.error("Escrow ID is required for refund operation");
    process.exit(1);
  }
  
  console.log("\nRefunding escrow with ID:", escrowId);
  
  try {
    const refundCommand = `aptos move run \
      --function-id ${moduleAddress}::escrow_dst::refund \
      --type-args 0x1::aptos_coin::AptosCoin \
      --args hex:${escrowId.startsWith('0x') ? escrowId.substring(2) : escrowId} \
      --profile ${makerProfile} \
      --assume-yes`;
    
    console.log(`\nExecuting: ${refundCommand}`);
    const result = execSync(refundCommand, { encoding: 'utf8' });
    console.log(result);
    
    console.log("\nEscrow refunded successfully!");
  } catch (error) {
    console.error("Error refunding escrow:", error.message);
    process.exit(1);
  }
}

/**
 * Check the status of an escrow in EscrowDst contract
 */
async function checkEscrow(moduleAddress) {
  const escrowId = process.env.ESCROW_ID;
  
  if (!escrowId) {
    console.error("ESCROW_ID is required. Please set it in .env file or as an environment variable.");
    process.exit(1);
  }
  
  console.log("Checking escrow with ID:", escrowId);
  
  try {
    // First, let's try to check if the contract exists by listing resources
    console.log("Checking module resources...");
    const checkCommand = `aptos account list --query resources --account ${moduleAddress}`;
    console.log(`\nExecuting: aptos ${checkCommand}`);
    const checkOutput = execSync(`aptos ${checkCommand}`, { encoding: 'utf8' });
    
    // Look for the escrow in the output
    if (checkOutput.includes(escrowId)) {
      console.log(`\nEscrow ${escrowId} found in module resources!`);
    } else {
      console.log(`\nEscrow ${escrowId} not found in module resources.`);
    }
    
    console.log("\nModule resources:");
    console.log(checkOutput);
  } catch (error) {
    console.error("Error checking escrow:", error.message);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Usage: node interact-escrow-dst.js [operation]

Operations:
  create    - Create a new escrow
  withdraw  - Withdraw from an existing escrow
  refund    - Refund an existing escrow
  check     - Check the status of an escrow
  help      - Show this help message

Environment Variables:
  APTOS_MODULE_ADDRESS - The address of the deployed module
  APTOS_RECIPIENT      - Recipient address for the escrow
  AMOUNT               - Amount of tokens for the escrow
  TIMELOCK             - Timelock in seconds
  HASHLOCK             - Hashlock for the escrow
  ESCROW_ID            - ID of an existing escrow
  PREIMAGE             - Preimage for withdrawing from an escrow
  USE_RECIPIENT_PROFILE - Set to 'true' to use recipient profile for withdrawal
  `);
}

/**
 * Функция для получения данных о созданных эскроу из событий блокчейна
 * 
 * @param {string} moduleAddress - адрес модуля
 * @param {string} orderHash - хеш ордера для фильтрации
 * @returns {Promise<Object>} - данные о созданном эскроу, включая deployed_at
 */
async function getEscrowCreationData(moduleAddress, orderHash) {
  console.log(`\nПолучение данных о созданном эскроу с orderHash: ${orderHash}...`);
  
  try {
    // Используем Aptos CLI для получения событий создания эскроу
    const eventType = `${moduleAddress}::escrow_dst::EscrowStore::created_events`;
    const command = `aptos event list --event-key ${eventType} --profile default`;
    
    console.log(`Выполнение команды: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    
    // Парсим JSON результат
    const events = JSON.parse(result);
    console.log(`Найдено ${events.length} событий создания эскроу`);
    
    // Ищем событие с нужным orderHash
    const targetEvent = events.find(event => {
      // Сравниваем order_hash в событии с искомым
      const eventOrderHash = Buffer.from(event.data.immutables.order_hash).toString('hex');
      const targetOrderHash = orderHash.startsWith('0x') ? orderHash.substring(2) : orderHash;
      return eventOrderHash === targetOrderHash;
    });
    
    if (!targetEvent) {
      console.error(`Не найдено событий создания эскроу с orderHash: ${orderHash}`);
      return null;
    }
    
    console.log(`Найдено событие создания эскроу с orderHash: ${orderHash}`);
    
    // Извлекаем данные о времени создания (deployed_at)
    const deployedAt = targetEvent.data.timelocks.deployed_at;
    console.log(`Извлечено значение deployed_at: ${deployedAt}`);
    
    return {
      deployedAt,
      contractId: targetEvent.data.contract_id,
      maker: targetEvent.data.maker,
      taker: targetEvent.data.taker,
      amount: targetEvent.data.amount,
      hashlock: targetEvent.data.hashlock,
      timelocks: targetEvent.data.timelocks
    };
  } catch (error) {
    console.error(`Ошибка при получении данных эскроу:`, error.message);
    return null;
  }
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
