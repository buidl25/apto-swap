/**
 * Deploy and interact with EscrowSrc Contract
 * 
 * This script deploys and provides functionality to interact with the EscrowSrc contract
 */

// Use explicit path to hardhat to avoid TypeScript config issues
const hre = require("../../node_modules/hardhat");

// Set the config path to use JavaScript config
process.env.HARDHAT_CONFIG = "hardhat.config.js";
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("\n=== Deploying and Interacting with EscrowSrc Contract ===\n");
  console.log('process.argv :>>', process.argv)
  // Get the operation from environment variable or command line arguments
  const operation = process.env.OPERATION || process.argv[2] || "deploy";
  console.log(`Operation: ${operation}`);

  switch (operation) {
    case "deploy":
      await deployEscrowSrc();
      break;
    case "create":
      await createEscrow();
      break;
    case "withdraw":
      await withdrawEscrow();
      break;
    case "refund":
      await refundEscrow();
      break;
    case "check":
      await checkEscrow();
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

/**
 * Deploy the EscrowSrc contract
 */
async function deployEscrowSrc() {
  console.log("Deploying EscrowFactory contract...");

  try {
    // Get the token address
    let tokenAddress = process.env.EVM_TOKEN_ADDRESS;

    if (!tokenAddress) {
      try {
        const tokenAddressFile = path.join(__dirname, "..", "vars", "evm-token-address.json");
        if (fs.existsSync(tokenAddressFile)) {
          const tokenData = JSON.parse(fs.readFileSync(tokenAddressFile, 'utf8'));
          tokenAddress = tokenData["evm-token-address"];
          console.log(`Loaded EVM token address from file: ${tokenAddress}`);
        }
      } catch (error) {
        console.error("Error reading EVM token address:", error.message);
      }
    }

    if (!tokenAddress) {
      console.error("EVM_TOKEN_ADDRESS not found. Please set it in .env file or deploy the token first.");
      process.exit(1);
    }

    // Deploy the EscrowFactory contract
    // EscrowFactory constructor expects a uint32 rescueDelay parameter
    const rescueDelay = 86400; // 24 hours in seconds
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = await EscrowFactory.deploy(rescueDelay);

    await escrowFactory.waitForDeployment();
    const escrowFactoryAddress = await escrowFactory.getAddress();

    console.log(`EscrowFactory deployed to: ${escrowFactoryAddress}`);

    // Create the vars directory if it doesn't exist
    const varsDir = path.join(__dirname, "..", "vars");
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }

    const addressFile = path.join(varsDir, "escrow-factory-address.json");
    fs.writeFileSync(addressFile, JSON.stringify({
      "escrow-factory-address": escrowFactoryAddress
    }, null, 2));

    console.log(`Contract address saved to: ${addressFile}`);
  } catch (error) {
    console.error("Error deploying EscrowFactory contract:", error.message);
    process.exit(1);
  }
}

/**
 * Create a new escrow in EscrowSrc contract
 */
async function createEscrow() {
  console.log("Creating new escrow...");

  try {
    // Get the factory contract address
    let factoryAddress;
    try {
      const addressFile = path.join(__dirname, "..", "vars", "escrow-factory-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        factoryAddress = addressData["escrow-factory-address"];
        console.log(`Loaded EscrowFactory address from file: ${factoryAddress}`);
      }
    } catch (error) {
      console.error("Error reading EscrowFactory address:", error.message);
    }

    if (!factoryAddress) {
      console.error("EscrowFactory contract address not found. Please deploy the contract first.");
      process.exit(1);
    }

    // Get parameters
    const recipient = process.env.EVM_RECIPIENT_ADDRESS;
    const amount = process.env.AMOUNT || "10";
    const timelock = process.env.TIMELOCK || "3600"; // Default 1 hour
    const hashlock = process.env.HASHLOCK;

    if (!recipient) {
      console.error("EVM_RECIPIENT_ADDRESS is required. Please set it in .env file.");
      process.exit(1);
    }

    if (!hashlock) {
      console.error("HASHLOCK is required. Please set it in .env file.");
      process.exit(1);
    }

    console.log("Creating escrow with parameters:");
    console.log(`- Recipient: ${recipient}`);
    console.log(`- Amount: ${amount}`);
    console.log(`- Timelock: ${timelock} seconds`);
    console.log(`- Hashlock: ${hashlock}`);

    // Connect to the factory contract
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = EscrowFactory.attach(factoryAddress);
    
    // Get the token address
    let tokenAddress = process.env.EVM_TOKEN_ADDRESS;
    if (!tokenAddress) {
      try {
        const tokenAddressFile = path.join(__dirname, "..", "vars", "evm-token-address.json");
        if (fs.existsSync(tokenAddressFile)) {
          const tokenData = JSON.parse(fs.readFileSync(tokenAddressFile, 'utf8'));
          tokenAddress = tokenData["evm-token-address"];
          console.log(`Loaded EVM token address from file: ${tokenAddress}`);
        }
      } catch (error) {
        console.error("Error reading EVM token address:", error.message);
      }
    }

    if (!tokenAddress) {
      console.error("EVM_TOKEN_ADDRESS not found. Please set it in .env file or deploy the token first.");
      process.exit(1);
    }

    // Convert amount to wei
    const amountWei = hre.ethers.parseUnits(amount);
    
    // Create a unique order hash
    const orderHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`${Date.now()}`));
    
    // Create the immutables object for the escrow
    const immutables = {
      maker: await (await hre.ethers.getSigner()).getAddress(),
      taker: recipient,
      token: tokenAddress,
      amount: amountWei,
      hashlock: hashlock,
      timelocks: {
        srcWithdrawal: Math.floor(Date.now() / 1000),
        srcCancellation: Math.floor(Date.now() / 1000) + parseInt(timelock),
        dstWithdrawal: Math.floor(Date.now() / 1000),
        dstCancellation: Math.floor(Date.now() / 1000) + parseInt(timelock)
      },
      safetyDeposit: 0,
      orderHash: orderHash
    };

    // Deploy the escrow using the factory
    console.log("Deploying escrow via factory...");
    const tx = await escrowFactory.deploy(immutables);

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Get the escrow address from the event logs
    let escrowAddress;
    for (const log of receipt.logs) {
      try {
        const parsedLog = escrowFactory.interface.parseLog({
          topics: log.topics,
          data: log.data
        });

        if (parsedLog && parsedLog.name === "EscrowDeployed") {
          escrowAddress = parsedLog.args.escrow;
          console.log(`Escrow deployed to: ${escrowAddress}`);
          break;
        }
      } catch (error) {
        // Skip logs that can't be parsed
      }
    }

    if (!escrowAddress) {
      console.log("Could not find escrow address in transaction logs.");
    }

    // Save escrow details to file
    const escrowDetailsFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
    const escrowDetails = {
      "escrow-factory-address": factoryAddress,
      "escrow-address": escrowAddress,
      "order-hash": orderHash,
      "recipient": recipient,
      "amount": amount,
      "timelock": timelock,
      "hashlock": hashlock,
      "tx-hash": tx.hash
    };

    fs.writeFileSync(escrowDetailsFile, JSON.stringify(escrowDetails, null, 2));
    console.log(`Escrow details saved to: ${escrowDetailsFile}`);
  } catch (error) {
    console.error("Error creating escrow:", error.message);
    process.exit(1);
  }
}

/**
 * Withdraw from an escrow in EscrowSrc contract
 */
async function withdrawEscrow() {
  console.log("Withdrawing from escrow...");

  try {
    // Get the contract address
    let contractAddress;
    let escrowId;
    let preimage;

    // Try to load from saved file first
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        contractAddress = escrowData.contractAddress;
        escrowId = escrowData.escrowId;
        console.log(`Loaded escrow details from file.`);
      }
    } catch (error) {
      console.error("Error reading escrow details:", error.message);
    }

    // Override with environment variables if provided
    if (process.env.ESCROW_SRC_ADDRESS) {
      contractAddress = process.env.ESCROW_SRC_ADDRESS;
    }

    if (process.env.ESCROW_ID) {
      escrowId = process.env.ESCROW_ID;
    }

    preimage = process.env.PREIMAGE;

    if (!contractAddress) {
      console.error("EscrowSrc contract address not found. Please deploy the contract first.");
      process.exit(1);
    }

    if (!escrowId) {
      console.error("ESCROW_ID is required. Please set it in .env file or create an escrow first.");
      process.exit(1);
    }

    if (!preimage) {
      console.error("PREIMAGE is required. Please set it in .env file.");
      process.exit(1);
    }

    console.log("Withdrawing from escrow with parameters:");
    console.log(`- Contract: ${contractAddress}`);
    console.log(`- Escrow ID: ${escrowId}`);
    console.log(`- Preimage (original): ${preimage}`);
    
    // Преобразуем preimage в правильный формат
    // Для EVM контракта нам нужно использовать оригинальный preimage без 0x префикса
    if (preimage.startsWith('0x')) {
      preimage = preimage.substring(2);
    }
    console.log(`- Preimage (formatted for contract): ${preimage}`);

    // Connect to the contract
    const EscrowSrc = await hre.ethers.getContractFactory("EscrowSrc");
    const escrowSrc = EscrowSrc.attach(contractAddress);

    // Withdraw from the escrow
    // Преобразуем preimage в правильный формат, если это не hex строка
    // Для EVM контракта preimage должен быть передан как bytes32
    // Функция withdraw ожидает первым аргументом bytes32, а не строку
    let preimageBytes;
    
    // Преобразуем preimage в bytes32
    // Для bytes32 нужно ровно 32 байта (64 hex символа + 0x префикс)
    try {
      // Если preimage начинается с 0x, убираем префикс
      const hexString = preimage.startsWith('0x') ? preimage.substring(2) : preimage;
      
      // Преобразуем в bytes32
      if (/^[0-9a-fA-F]{64}$/.test(hexString)) {
        // Если это уже 64 hex символа (ровно 32 байта)
        preimageBytes = '0x' + hexString;
      } else {
        // Если это обычная строка, преобразуем ее в bytes32
        // Сначала хешируем строку с помощью ethers.js
        const ethers = hre.ethers;
        preimageBytes = ethers.utils.id(preimage); // используем keccak256 для получения bytes32
      }
    } catch (error) {
      console.error("Error converting preimage to bytes32:", error.message);
      // Фоллбэк: используем ethers.js для получения bytes32
      const ethers = hre.ethers;
      preimageBytes = ethers.utils.id(preimage);
    }
    
    console.log(`Using preimage for EVM withdraw (bytes32): ${preimageBytes}`);
    
    // Загружаем детали эскроу для создания структуры Immutables
    let escrowDetails;
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
      if (fs.existsSync(escrowFile)) {
        escrowDetails = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        console.log("Loaded escrow details for Immutables structure");
      } else {
        throw new Error("Escrow details file not found");
      }
    } catch (error) {
      console.error("Error loading escrow details for Immutables:", error.message);
      console.log("Using default values for Immutables structure");
      
      // Используем минимальные значения для структуры Immutables
      escrowDetails = {
        orderHash: escrowId, // Используем escrowId как orderHash
        maker: "0x0000000000000000000000000000000000000000",
        taker: "0x0000000000000000000000000000000000000000",
        token: "0x0000000000000000000000000000000000000000",
        amount: "0",
        secretHash: escrowId, // Используем escrowId как secretHash
        safetyDeposit: "0",
        timelocks: {
          srcWithdrawal: Math.floor(Date.now() / 1000) - 3600, // 1 час назад
          srcPublicWithdrawal: Math.floor(Date.now() / 1000) - 1800, // 30 минут назад
          srcCancellation: Math.floor(Date.now() / 1000) + 3600, // 1 час вперед
          srcPublicCancellation: Math.floor(Date.now() / 1000) + 7200 // 2 часа вперед
        }
      };
    }
    
    // Создаем структуру Immutables для передачи в контракт
    // Структура Immutables должна соответствовать контракту:
    // struct Immutables {
    //     bytes32 orderHash;
    //     Address maker;
    //     Address taker;
    //     Address token;
    //     uint256 amount;
    //     bytes32 secretHash;
    //     uint256 safetyDeposit;
    //     Timelocks timelocks;
    // }
    // 
    // struct Timelocks {
    //     uint256[8] values;
    // }
    
    // Для Address типа нужно передавать { value: "0x..." }
    // Для Timelocks нужно передавать массив из 8 значений
    const now = Math.floor(Date.now() / 1000);
    
    const immutables = {
      orderHash: escrowDetails.orderHash || escrowId,
      maker: { value: escrowDetails.maker || "0x0000000000000000000000000000000000000000" },
      taker: { value: escrowDetails.taker || "0x0000000000000000000000000000000000000000" },
      token: { value: escrowDetails.token || "0x0000000000000000000000000000000000000000" },
      amount: escrowDetails.amount || "0",
      secretHash: escrowDetails.secretHash || escrowId,
      safetyDeposit: escrowDetails.safetyDeposit || "0",
      timelocks: {
        values: [
          now - 7200,  // SrcFinality (2 часа назад)
          now - 3600,  // SrcWithdrawal (1 час назад)
          now - 1800,  // SrcPublicWithdrawal (30 минут назад)
          now + 3600,  // SrcCancellation (1 час вперед)
          now + 7200,  // SrcPublicCancellation (2 часа вперед)
          now - 7200,  // DstFinality (2 часа назад)
          now + 3600,  // DstCancellation (1 час вперед)
          now + 7200   // DstPublicCancellation (2 часа вперед)
        ]
      }
    };
    
    console.log("Using Immutables structure for withdraw:", JSON.stringify(immutables, null, 2));
    
    // Передаем preimage как bytes32 и структуру Immutables
    const tx = await escrowSrc.withdraw(preimageBytes, immutables);

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log("Escrow withdrawn successfully!");
  } catch (error) {
    console.error("Error withdrawing from escrow:", error.message);
    process.exit(1);
  }
}

/**
 * Refund an escrow in EscrowSrc contract
 */
async function refundEscrow() {
  console.log("Refunding escrow...");

  try {
    // Get the contract address
    let contractAddress;
    let escrowId;

    // Try to load from saved file first
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        contractAddress = escrowData.contractAddress;
        escrowId = escrowData.escrowId;
        console.log(`Loaded escrow details from file.`);
      }
    } catch (error) {
      console.error("Error reading escrow details:", error.message);
    }

    // Override with environment variables if provided
    if (process.env.ESCROW_SRC_ADDRESS) {
      contractAddress = process.env.ESCROW_SRC_ADDRESS;
    }

    if (process.env.ESCROW_ID) {
      escrowId = process.env.ESCROW_ID;
    }

    if (!contractAddress) {
      console.error("EscrowSrc contract address not found. Please deploy the contract first.");
      process.exit(1);
    }

    if (!escrowId) {
      console.error("ESCROW_ID is required. Please set it in .env file or create an escrow first.");
      process.exit(1);
    }

    console.log("Refunding escrow with parameters:");
    console.log(`- Contract: ${contractAddress}`);
    console.log(`- Escrow ID: ${escrowId}`);

    // Connect to the contract
    const EscrowSrc = await hre.ethers.getContractFactory("EscrowSrc");
    const escrowSrc = EscrowSrc.attach(contractAddress);

    // Refund the escrow
    const tx = await escrowSrc.refund(escrowId);

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log("Escrow refunded successfully!");
  } catch (error) {
    console.error("Error refunding escrow:", error.message);
    process.exit(1);
  }
}

/**
 * Check the status of an escrow in EscrowSrc contract
 */
async function checkEscrow() {
  console.log("Checking escrow status...");

  try {
    // Get the contract address
    let contractAddress;
    let escrowId;

    // Try to load from saved file first
    try {
      const escrowFile = path.join(__dirname, "..", "vars", "escrow-src-details.json");
      if (fs.existsSync(escrowFile)) {
        const escrowData = JSON.parse(fs.readFileSync(escrowFile, 'utf8'));
        contractAddress = escrowData.contractAddress;
        escrowId = escrowData.escrowId;
        console.log(`Loaded escrow details from file.`);
      }
    } catch (error) {
      console.error("Error reading escrow details:", error.message);
    }

    // Override with environment variables if provided
    if (process.env.ESCROW_SRC_ADDRESS) {
      contractAddress = process.env.ESCROW_SRC_ADDRESS;
    }

    if (process.env.ESCROW_ID) {
      escrowId = process.env.ESCROW_ID;
    }

    if (!contractAddress) {
      console.error("EscrowSrc contract address not found. Please deploy the contract first.");
      process.exit(1);
    }

    if (!escrowId) {
      console.error("ESCROW_ID is required. Please set it in .env file or create an escrow first.");
      process.exit(1);
    }

    console.log("Checking escrow with parameters:");
    console.log(`- Contract: ${contractAddress}`);
    console.log(`- Escrow ID: ${escrowId}`);

    // Connect to the contract
    const EscrowSrc = await hre.ethers.getContractFactory("EscrowSrc");
    const escrowSrc = EscrowSrc.attach(contractAddress);

    // Get the escrow details
    const escrow = await escrowSrc.getEscrow(escrowId);

    console.log("\nEscrow details:");
    console.log(`- Sender: ${escrow.sender}`);
    console.log(`- Recipient: ${escrow.recipient}`);
    console.log(`- Token: ${escrow.token}`);
    console.log(`- Amount: ${hre.ethers.formatUnits(escrow.amount)} tokens`);
    console.log(`- Hashlock: ${escrow.hashlock}`);
    console.log(`- Timelock: ${escrow.timelock} (${new Date(Number(escrow.timelock) * 1000).toLocaleString()})`);
    console.log(`- Withdrawn: ${escrow.withdrawn}`);
    console.log(`- Refunded: ${escrow.refunded}`);
    console.log(`- Preimage: ${escrow.preimage}`);
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
Usage: npx hardhat run scripts/escrow/deploy-escrow-src.js [operation] --network [network]

Operations:
  deploy    - Deploy the EscrowSrc contract
  create    - Create a new escrow
  withdraw  - Withdraw from an existing escrow
  refund    - Refund an existing escrow
  check     - Check the status of an escrow
  help      - Show this help message

Environment Variables:
  EVM_TOKEN_ADDRESS     - Address of the EVM token contract
  EVM_RECIPIENT_ADDRESS - Recipient address for the escrow
  ESCROW_SRC_ADDRESS    - Address of the deployed EscrowSrc contract
  AMOUNT                - Amount of tokens for the escrow
  TIMELOCK              - Timelock in seconds
  HASHLOCK              - Hashlock for the escrow
  ESCROW_ID             - ID of an existing escrow
  PREIMAGE              - Preimage for withdrawing from an escrow
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
