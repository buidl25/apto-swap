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

// Helper function to handle BigInt serialization in JSON.stringify
const bigIntReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

async function main() {
  console.log("\n=== Deploying and Interacting with EscrowSrc Contract ===\n");
  console.log('process.argv :>>', process.argv)
  // Get the operation from environment variable or command line arguments
  const operation = process.env.OPERATION || process.argv[2] || "deploy";
  console.log("🚀 ~ main ~ operation:", operation)
  console.log(`Operation: ${operation}`);

  switch (operation.toLowerCase()) {
    case "deploy":
      await deployEscrowFactory();
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
 * Deploy the EscrowFactory contract
 */
async function deployEscrowFactory() {
  console.log("Deploying EscrowFactory contract...");

  try {
    // Deploy the EscrowFactory contract
    // EscrowFactory constructor expects a uint32 rescueDelay parameter
    const rescueDelay = 86400; // 24 hours in seconds
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = await EscrowFactory.deploy(rescueDelay);

    await escrowFactory.waitForDeployment();
    const escrowFactoryAddress = await escrowFactory.getAddress();

    console.log(`EscrowFactory deployed to: ${escrowFactoryAddress}`);

    const implementationAddress = await escrowFactory.implementation();
    console.log(`Escrow implementation deployed to: ${implementationAddress}`);

    // Create the vars directory if it doesn't exist
    const varsDir = path.join(__dirname, "..", "vars");
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }

    const addressFile = path.join(varsDir, "escrow-factory-address.json");
    fs.writeFileSync(addressFile, JSON.stringify({
      "escrow-factory-address": escrowFactoryAddress
    }, null, 2));

    const addressFileBackend = path.join(varsDir, "../../be/vars", "escrow-factory-address.json");
    fs.writeFileSync(addressFileBackend, JSON.stringify({
      "escrow-factory-address": escrowFactoryAddress
    }, null, 2));

    console.log(`Contract address saved to: ${addressFile}`);

    const implAddressFile = path.join(varsDir, "escrow-implementation-address.json");
    fs.writeFileSync(implAddressFile, JSON.stringify({
      "escrow-implementation-address": implementationAddress
    }, null, 2));
    console.log(`Implementation address saved to: ${implAddressFile}`);

    return { escrowFactoryAddress, implementationAddress, rescueDelay };
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

  // Early debugging to ensure we see output
  console.log('Debug: Starting createEscrow function');

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

    // Connect to the factory contract using the contract factory
    console.log('Loading EscrowFactory contract...');
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = await EscrowFactory.attach(factoryAddress);

    // Get the contract interface to examine the function signature
    const iface = escrowFactory.interface;
    const deployFunctionInfo = iface.getFunction('deploy');
    console.log('Deploy function signature:', deployFunctionInfo.format());
    console.log('Deploy function fragment:', JSON.stringify(deployFunctionInfo));

    // Get the token address
    let tokenAddress;

    if (!tokenAddress) {
      try {
        const tokenAddressFile = path.join(__dirname, '../vars/evm-token-address.json');
        if (fs.existsSync(tokenAddressFile)) {
          const tokenData = JSON.parse(fs.readFileSync(tokenAddressFile, 'utf8'));
          tokenAddress = tokenData.address;
          console.log(`Loaded token address from file: ${tokenAddress}`);
        }
      } catch (error) {
        console.error("Error reading token address:", error.message);
      }
    }

    if (!tokenAddress) {
      console.error("EVM_TOKEN_ADDRESS is required. Please set it in .env file or deploy a token first.");
      process.exit(1);
    }

    console.log(`Final token address to be used: ${tokenAddress}`);

    // Validate token address format
    if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
      console.error(`Invalid token address format: ${tokenAddress}`);
      process.exit(1);
    }

    // Convert amount to wei
    const amountWei = hre.ethers.parseUnits(amount);

    // Create a unique order hash
    const orderHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`${Date.now()}`));

    // Get the signer address
    const signerAddress = process.env.EVM_ADDRESS || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; //await (await hre.ethers.getSigner()).getAddress();
    console.log(`Signer address: ${signerAddress}`);

    // Get the current timestamp
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = now + parseInt(timelock);

    // Create timelocks array with 8 values as expected by the contract
    // Values correspond to TimelocksLib.Stage enum:
    // 0: SrcFinality, 1: SrcWithdrawal, 2: SrcPublicWithdrawal, 3: SrcCancellation,
    // 4: SrcPublicCancellation, 5: DstFinality, 6: DstCancellation, 7: DstPublicCancellation
    const timelocksArray = [
      now,                // SrcFinality
      now,                // SrcWithdrawal
      now + 3600,         // SrcPublicWithdrawal (1 hour after now)
      expiryTime,         // SrcCancellation
      expiryTime + 3600,  // SrcPublicCancellation (1 hour after expiry)
      now,                // DstFinality
      expiryTime,         // DstCancellation
      expiryTime + 3600   // DstPublicCancellation (1 hour after expiry)
    ];

    console.log("Timelocks array:", timelocksArray);

    // Debug address values
    console.log('=== DEBUG: Address Values ===');
    console.log('signerAddress:', signerAddress, typeof signerAddress);
    console.log('recipient:', recipient, typeof recipient);
    console.log('tokenAddress:', tokenAddress, typeof tokenAddress);

    // Validate addresses are not null or undefined
    if (!signerAddress) {
      console.error('ERROR: signerAddress is null or undefined');
      process.exit(1);
    }
    if (!recipient) {
      console.error('ERROR: recipient is null or undefined');
      process.exit(1);
    }
    if (!tokenAddress) {
      console.error('ERROR: tokenAddress is null or undefined');
      process.exit(1);
    }

    console.log('✅ All addresses validated successfully');

    // Normalize addresses using ethers.getAddress
    console.log('Normalizing addresses...');
    const normalizedSigner = hre.ethers.getAddress(signerAddress);
    const normalizedRecipient = hre.ethers.getAddress(recipient);
    const normalizedToken = hre.ethers.getAddress(tokenAddress);

    console.log('=== DEBUG: Normalized Addresses ===');
    console.log('normalizedSigner:', normalizedSigner);
    console.log('normalizedRecipient:', normalizedRecipient);
    console.log('normalizedToken:', normalizedToken);

    // Create a properly structured immutables object for the contract based on the ABI
    console.log('Creating immutables structure for EscrowFactory.deploy...');

    // Based on the ABI from the contract interface, we'll try a direct array structure
    // that matches the exact order and types expected by the ABI
    console.log('Creating array structure based on ABI...');

    // Create a direct array matching the ABI's tuple structure
    // Format: [orderHash, maker, taker, token, amount, secretHash, safetyDeposit, timelocks]
    const immutables = [
      orderHash,                    // bytes32 orderHash
      normalizedSigner,             // uint256 maker (as address string)
      normalizedRecipient,          // uint256 taker (as address string)
      normalizedToken,              // uint256 token (as address string)
      amountWei,                    // uint256 amount
      hashlock,                     // bytes32 secretHash
      0,                            // uint256 safetyDeposit
      [timelocksArray]              // tuple with uint256[8] values
    ];

    console.log('Using direct array structure for immutables:');
    console.log('- orderHash:', immutables[0]);
    console.log('- maker:', immutables[1]);
    console.log('- taker:', immutables[2]);
    console.log('- token:', immutables[3]);
    console.log('- amount:', immutables[4].toString());
    console.log('- secretHash:', immutables[5]);
    console.log('- safetyDeposit:', immutables[6]);
    console.log('- timelocks:', immutables[7]);

    console.log('=== DEBUG: Immutables Structure ===');
    // Use the bigIntReplacer function for serialization
    console.log(JSON.stringify(immutables, bigIntReplacer, 2));

    // Log each field individually for debugging - using array indices since immutables is an array
    console.log('orderHash:', immutables[0]);
    console.log('maker:', immutables[1]);
    console.log('taker:', immutables[2]);
    console.log('token:', immutables[3]);
    console.log('amount:', immutables[4].toString());
    console.log('secretHash:', immutables[5]);
    console.log('safetyDeposit:', immutables[6]);
    console.log('timelocks.values:', immutables[7][0]);

    // Log the immutables object for debugging
    console.log('Immutables object:');
    console.log(JSON.stringify(immutables, bigIntReplacer, 2));

    // Deploy the escrow using the factory
    console.log("Deploying escrow via factory...");

    // Get the contract interface
    console.log("Getting contract interface...");
    console.log(`Factory address: ${factoryAddress}`);

    // Use fragments instead of functions
    if (escrowFactory.interface && escrowFactory.interface.fragments) {
      console.log(`Factory contract methods:`, escrowFactory.interface.fragments.map(f => f.name).filter(Boolean));
    } else {
      console.log('escrowFactory.interface.fragments is not available');
      console.log('Available interface properties:', Object.keys(escrowFactory.interface));
    }

    // Log the contract interface methods again for clarity
    console.log('Factory contract methods:', escrowFactory.interface.fragments.map(f => f.name).filter(Boolean));

    // Inspect the deploy function signature
    const deployFunction = escrowFactory.interface.fragments.find(f => f.name === 'deploy');
    console.log('Deploy function signature:', deployFunction ? deployFunction.format() : 'Not found');

    // Log the full immutables object for debugging
    console.log('Full immutables object:');
    console.log(JSON.stringify(immutables, bigIntReplacer, 2));

    try {
      console.log('Using BigInt for addresses - confirmed working approach');

      // Convert addresses to BigInt (this is the key to resolving the invalid address error)
      const makerBigInt = BigInt(normalizedSigner);
      const takerBigInt = BigInt(normalizedRecipient);
      const tokenBigInt = BigInt(normalizedToken);

      console.log('Address conversions:');
      console.log(`Original signer: ${normalizedSigner}`);
      console.log(`BigInt signer: ${makerBigInt}`);
      console.log(`Original recipient: ${normalizedRecipient}`);
      console.log(`BigInt recipient: ${takerBigInt}`);
      console.log(`Original token: ${normalizedToken}`);
      console.log(`BigInt token: ${tokenBigInt}`);

      // Create immutables with BigInt addresses
      const bigIntImmutables = {
        orderHash: orderHash,
        maker: makerBigInt,
        taker: takerBigInt,
        token: tokenBigInt,
        amount: amountWei,
        secretHash: hashlock,
        safetyDeposit: 0,
        timelocks: { values: timelocksArray }
      };

      console.log('BigInt immutables structure:');
      // Use the bigIntReplacer function for serialization
      console.log(JSON.stringify(bigIntImmutables, bigIntReplacer, 2));

      // Add transaction overrides
      const overrides = {
        gasLimit: 5000000,  // Increase gas limit
      };

      // Дополнительная проверка и логирование перед вызовом контракта
      console.log('Final check of all parameters before contract call:');
      console.log('- orderHash:', bigIntImmutables.orderHash ? 'OK' : 'NULL/UNDEFINED');
      console.log('- maker:', bigIntImmutables.maker ? 'OK' : 'NULL/UNDEFINED');
      console.log('- taker:', bigIntImmutables.taker ? 'OK' : 'NULL/UNDEFINED');
      console.log('- token:', bigIntImmutables.token ? 'OK' : 'NULL/UNDEFINED');
      console.log('- amount:', bigIntImmutables.amount ? 'OK' : 'NULL/UNDEFINED');
      console.log('- secretHash:', bigIntImmutables.secretHash ? 'OK' : 'NULL/UNDEFINED');
      console.log('- safetyDeposit:', bigIntImmutables.safetyDeposit !== undefined ? 'OK' : 'NULL/UNDEFINED');
      console.log('- timelocks:', bigIntImmutables.timelocks ? 'OK' : 'NULL/UNDEFINED');
      console.log('- timelocks.values:', bigIntImmutables.timelocks?.values ? 'OK' : 'NULL/UNDEFINED');

      // Проверяем, что все необходимые параметры определены
      if (!bigIntImmutables.orderHash || !bigIntImmutables.maker || !bigIntImmutables.taker ||
        !bigIntImmutables.token || !bigIntImmutables.amount || !bigIntImmutables.secretHash ||
        bigIntImmutables.safetyDeposit === undefined || !bigIntImmutables.timelocks || !bigIntImmutables.timelocks.values) {
        console.error('ERROR: Some required parameters are null or undefined!');
        console.error('Full bigIntImmutables object:', JSON.stringify(bigIntImmutables, bigIntReplacer, 2));
        process.exit(1);
      }

      // Use the deploy function with BigInt addresses
      console.log('Attempting contract call with BigInt addresses...');
      console.log('Available contract methods:', Object.keys(escrowFactory));
      console.log('Is deploy a function?', typeof escrowFactory.deploy === 'function');

      // Check if deploy function exists
      if (typeof escrowFactory.deploy !== 'function') {
        console.error('ERROR: deploy function not found on escrowFactory contract!');
        process.exit(1);
      }

      // Add retry logic with exponential backoff
      const maxRetries = 3;
      let retryCount = 0;
      let tx;

      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1}/${maxRetries} to deploy escrow...`);
          tx = await escrowFactory.deploy(bigIntImmutables, overrides);
          console.log('Deploy transaction sent successfully!');
          break; // Success, exit the retry loop
        } catch (error) {
          retryCount++;
          console.error(`Error on attempt ${retryCount}:`, error.message);

          if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
            console.log('Connection error detected. Retrying after a short delay...');
            if (retryCount < maxRetries) {
              // Wait with exponential backoff before retrying
              const delayMs = 1000 * Math.pow(2, retryCount - 1);
              console.log(`Waiting ${delayMs}ms before next attempt...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
              console.error('Maximum retry attempts reached. Giving up.');
              throw error;
            }
          } else {
            // For other errors, don't retry
            console.error('Non-connection error occurred:', error);
            throw error;
          }
        }
      }

      if (!tx) {
        throw new Error('Failed to deploy escrow after multiple attempts');
      }
      console.log(`Transaction hash: ${tx.hash}`);
      console.log("Waiting for transaction confirmation...");

      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      console.log('Escrow created successfully!');

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
        return;
      }

      // Save the escrow address to a file
      const escrowAddressFile = path.join(__dirname, "..", "vars", "evm-escrow-address.json");
      fs.writeFileSync(escrowAddressFile, JSON.stringify({ "evm-escrow-address": escrowAddress }, null, 2));
      console.log(`Saved escrow address to ${escrowAddressFile}`);

      // Save the escrow details to a file
      const escrowDetailsFile = path.join(__dirname, "..", "vars", "evm-escrow-details.json");
      fs.writeFileSync(escrowDetailsFile, JSON.stringify({
        "evm-escrow-address": escrowAddress,
        "evm-token-address": tokenAddress,
        "recipient": recipient,
        "amount": amount,
        "timelock": timelock,
        "hashlock": hashlock,
        "preimage": process.env.PREIMAGE || ""
      }, null, 2));
      console.log(`Saved escrow details to ${escrowDetailsFile}`);
    } catch (error) {
      console.error(`Error creating escrow: ${error.message}`);
      // Log the full error for debugging
      console.error(error);
      process.exit(1);
    }
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
    console.log(`- Preimage: ${preimage}`);

    // Connect to the contract
    const EscrowSrc = await hre.ethers.getContractFactory("EscrowSrc");
    const escrowSrc = EscrowSrc.attach(contractAddress);

    // Withdraw from the escrow
    const tx = await escrowSrc.withdraw(escrowId, preimage);

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

module.exports = deployEscrowFactory;
module.exports.main = main;