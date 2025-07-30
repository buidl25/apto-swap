const { AptosClient } = require("aptos");
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

async function checkBalance() {
  const accountAddress = process.env.APTOS_MODULE_ADDRESS || "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const tokenType = `${accountAddress}::test_aptos_token::TestAptosToken`;
  const coinStoreType = `0x1::coin::CoinStore<${tokenType}>`;
  
  // Try to load recipient address from saved HTLC details
  let recipientAddress = process.env.APTOS_RECIPIENT || process.env.APTOS_RECIPIENT_ADDRESS;
  
  // Path to the saved HTLC details
  const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
  
  // Check if the file exists and try to load details from it
  if (fs.existsSync(htlcDetailsPath)) {
    try {
      const htlcDetails = JSON.parse(fs.readFileSync(htlcDetailsPath, 'utf8'));
      recipientAddress = recipientAddress || htlcDetails.recipient;
      console.log('Loaded recipient address from saved HTLC details');
    } catch (error) {
      console.error(`Error loading HTLC details from file: ${error.message}`);
    }
  }
  
  // Fallback to default recipient if not set
  recipientAddress = recipientAddress || "0x318942fc76d84578ab2efc2c85ed031d06c4f444f3cdae9bbaf09901677b573f";
  
  console.log(`Module Address: ${accountAddress}`);
  console.log(`Recipient Address: ${recipientAddress}`);
  console.log(`Token Type: ${tokenType}`);
  
  console.log("Checking account resources using Aptos SDK...");
  const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
  const resources = await client.getAccountResources(recipientAddress);
  
  console.log("\nAvailable resources:");
  resources.forEach(resource => {
    console.log(`- ${resource.type}`);
  });
  
  // Check for any CoinStore resources
  const coinStores = resources.filter(r => r.type.startsWith("0x1::coin::CoinStore"));
  console.log("\nFound CoinStore resources:", coinStores.length > 0 ? coinStores.length : "None");
  coinStores.forEach(store => {
    console.log(`- ${store.type}: ${store.data.coin.value}`);
  });
  
  // Check specifically for our token's CoinStore
  const coinResource = resources.find(r => r.type === coinStoreType);
  
  if (coinResource) {
    console.log("\nTestAptosToken Balance:", coinResource.data.coin.value);
  } else {
    console.log("\nNo CoinStore found for TestAptosToken. Let's check with the CLI...");
    
    try {
      // Use the Aptos CLI to get more detailed information
      console.log("\nRunning CLI command to check account resources...");
      const cliOutput = execSync(`aptos account list --account ${recipientAddress} --profile recipient`, { encoding: 'utf8' });
      
      // Check if the output contains our CoinStore
      if (cliOutput.includes(`CoinStore<${tokenType}>`)) {
        console.log("\nFound TestAptosToken in CLI output!");
      } else {
        console.log("\nNo TestAptosToken found in CLI output either.");
        console.log("\nLet's try registering the token again:");
        console.log(`aptos move run --function-id 0x1::managed_coin::register --type-args ${tokenType} --profile default --assume-yes`);
      }
    } catch (error) {
      console.error("Error running CLI command:", error.message);
    }
    
    // Let's also check the coin info to see if the token exists
    const coinInfo = resources.find(r => r.type === `0x1::coin::CoinInfo<${tokenType}>`);
    if (coinInfo) {
      console.log("\nToken information:");
      console.log(`- Name: ${coinInfo.data.name}`);
      console.log(`- Symbol: ${coinInfo.data.symbol}`);
      console.log(`- Decimals: ${coinInfo.data.decimals}`);
      
      // Check if any tokens have been minted
      try {
        const supplyValue = coinInfo.data.supply?.vec?.[0]?.integer?.vec?.[0]?.value;
        console.log(`- Total Supply: ${supplyValue || "0"}`);
      } catch (e) {
        console.log(`- Total Supply: Unable to determine`);
      }
    }
  }
}

console.log('=== Checking Aptos Recipient Balance ===');
checkBalance().catch(error => {
  console.error(`Error checking balance: ${error.message}`);
  process.exit(1);
});