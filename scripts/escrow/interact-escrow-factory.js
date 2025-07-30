/**
 * Deploy and interact with EscrowFactory Contract
 * 
 * This script deploys and provides functionality to interact with the EscrowFactory contract
 */

// Use explicit path to hardhat to avoid TypeScript config issues
const hre = require("../../node_modules/hardhat");

// Set the config path to use JavaScript config
process.env.HARDHAT_CONFIG = "hardhat.config.js";
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("\n=== Deploying and Interacting with EscrowFactory Contract ===\n");
  
  // Get the operation from command line arguments
  const operation = process.argv[2] || "deploy";
  
  switch (operation) {
    case "deploy":
      await deployEscrowFactory();
      break;
    case "create":
      await createEscrow();
      break;
    case "list":
      await listEscrows();
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
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = await EscrowFactory.deploy();
    
    await escrowFactory.waitForDeployment();
    const escrowFactoryAddress = await escrowFactory.getAddress();
    
    console.log(`EscrowFactory deployed to: ${escrowFactoryAddress}`);
    
    // Save the contract address to a file
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
 * Create a new escrow using the EscrowFactory
 */
async function createEscrow() {
  console.log("Creating new escrow through factory...");
  
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
    console.log(`- Token: ${tokenAddress}`);
    console.log(`- Recipient: ${recipient}`);
    console.log(`- Amount: ${amount}`);
    console.log(`- Timelock: ${timelock} seconds`);
    console.log(`- Hashlock: ${hashlock}`);
    
    // Connect to the factory contract
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = EscrowFactory.attach(factoryAddress);
    
    // Convert amount to wei
    const amountWei = hre.ethers.parseUnits(amount);
    
    // Create the escrow
    const tx = await escrowFactory.createEscrow(
      tokenAddress,
      recipient,
      amountWei,
      hashlock,
      timelock
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Try to extract the escrow address from the event logs
    let escrowAddress;
    for (const log of receipt.logs) {
      try {
        const parsedLog = escrowFactory.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "EscrowCreated") {
          escrowAddress = parsedLog.args[0];
          break;
        }
      } catch (error) {
        // Skip logs that can't be parsed
      }
    }
    
    if (escrowAddress) {
      console.log(`Escrow created at address: ${escrowAddress}`);
      
      // Save the escrow details to a file
      const escrowDetails = {
        factoryAddress,
        escrowAddress,
        tokenAddress,
        recipient,
        amount,
        timelock,
        hashlock,
        txHash: tx.hash
      };
      
      const varsDir = path.join(__dirname, "..", "vars");
      if (!fs.existsSync(varsDir)) {
        fs.mkdirSync(varsDir, { recursive: true });
      }
      
      const escrowFile = path.join(varsDir, "escrow-factory-details.json");
      fs.writeFileSync(escrowFile, JSON.stringify(escrowDetails, null, 2));
      console.log(`Escrow details saved to: ${escrowFile}`);
    } else {
      console.log("Escrow created successfully, but could not extract the escrow address.");
    }
  } catch (error) {
    console.error("Error creating escrow through factory:", error.message);
    process.exit(1);
  }
}

/**
 * List all escrows created by the factory
 */
async function listEscrows() {
  console.log("Listing escrows created by the factory...");
  
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
    
    // Connect to the factory contract
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = EscrowFactory.attach(factoryAddress);
    
    // Get the count of escrows
    const count = await escrowFactory.getEscrowCount();
    console.log(`Total escrows created: ${count}`);
    
    // Get all escrow addresses
    const escrows = [];
    for (let i = 0; i < count; i++) {
      const escrowAddress = await escrowFactory.escrows(i);
      escrows.push(escrowAddress);
    }
    
    console.log("\nEscrow addresses:");
    escrows.forEach((address, index) => {
      console.log(`${index + 1}. ${address}`);
    });
    
    // Save the escrow list to a file
    const escrowList = {
      factoryAddress,
      count: count.toString(),
      escrows
    };
    
    const varsDir = path.join(__dirname, "..", "vars");
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }
    
    const escrowFile = path.join(varsDir, "escrow-factory-list.json");
    fs.writeFileSync(escrowFile, JSON.stringify(escrowList, null, 2));
    console.log(`\nEscrow list saved to: ${escrowFile}`);
  } catch (error) {
    console.error("Error listing escrows:", error.message);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Usage: npx hardhat run scripts/escrow/interact-escrow-factory.js [operation] --network [network]

Operations:
  deploy    - Deploy the EscrowFactory contract
  create    - Create a new escrow through the factory
  list      - List all escrows created by the factory
  help      - Show this help message

Environment Variables:
  EVM_TOKEN_ADDRESS     - Address of the EVM token contract
  EVM_RECIPIENT_ADDRESS - Recipient address for the escrow
  AMOUNT                - Amount of tokens for the escrow
  TIMELOCK              - Timelock in seconds
  HASHLOCK              - Hashlock for the escrow
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
