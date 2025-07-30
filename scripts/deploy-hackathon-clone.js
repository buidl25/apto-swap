const { AptosClient, AptosAccount, TxnBuilderTypes, BCS } = require("aptos");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com';
const PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY;
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';

// Constants
const RESCUE_DELAY = 3600; // 1 hour in seconds

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Error: APTOS_PRIVATE_KEY environment variable is not set");
    process.exit(1);
  }

  try {
    const client = new AptosClient(NODE_URL);
    
    // Create account from private key
    const account = AptosAccount.fromAptosAccountObject({
      privateKeyHex: PRIVATE_KEY
    });
    
    console.log(`Using account: ${account.address()}`);
    
    // Check account balance
    const resources = await client.getAccountResources(account.address());
    const accountResource = resources.find(r => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
    
    if (accountResource) {
      const balance = accountResource.data.coin.value;
      console.log(`Account balance: ${balance} APT`);
    } else {
      console.log("Account balance not found. Make sure the account is funded.");
    }

    // Initialize escrow_dst module
    console.log("Initializing escrow_dst module...");
    const initEscrowDstTxnHash = await initializeEscrowDst(client, account);
    console.log(`Escrow DST initialized. Transaction hash: ${initEscrowDstTxnHash}`);
    
    // Initialize escrow_factory module
    console.log("Initializing escrow_factory module...");
    const initFactoryTxnHash = await initializeEscrowFactory(client, account);
    console.log(`Escrow Factory initialized. Transaction hash: ${initFactoryTxnHash}`);
    
    // Save deployed addresses to JSON file
    const deployedAddresses = {
      "escrow-dst-address": `${MODULE_ADDRESS}::escrow_dst`,
      "escrow-factory-address": `${MODULE_ADDRESS}::escrow_factory`
    };
    
    // Add the existing token address if it exists
    const addressFilePath = path.join(__dirname, 'vars', 'aptos-token-address.json');
    let existingData = {};
    
    try {
      if (fs.existsSync(addressFilePath)) {
        const fileContent = fs.readFileSync(addressFilePath, 'utf8');
        existingData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.log(`No existing address file found or error reading it: ${error.message}`);
    }
    
    // Merge existing data with new addresses
    const updatedAddresses = { ...existingData, ...deployedAddresses };
    
    // Ensure the directory exists
    const dirPath = path.dirname(addressFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(
      addressFilePath,
      JSON.stringify(updatedAddresses, null, 4),
      'utf8'
    );
    
    console.log(`Deployed addresses saved to: ${addressFilePath}`);
    console.log("Deployment completed successfully!");
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

async function initializeEscrowDst(client, account) {
  const payload = {
    function: `${MODULE_ADDRESS}::escrow_dst::initialize`,
    type_arguments: [],
    arguments: [RESCUE_DELAY]
  };

  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const txnResult = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(txnResult.hash);
  
  return txnResult.hash;
}

async function initializeEscrowFactory(client, account) {
  const payload = {
    function: `${MODULE_ADDRESS}::escrow_factory::initialize`,
    type_arguments: [],
    arguments: [RESCUE_DELAY]
  };

  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const txnResult = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(txnResult.hash);
  
  return txnResult.hash;
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});
