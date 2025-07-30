const { execSync } = require('child_process');
const { AptosClient } = require("aptos");
const fs = require('fs');
const path = require('path');

async function setupToken() {
  const accountAddress = "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const tokenAddress = `${accountAddress}::test_aptos_token::TestAptosToken`;
  
  console.log("=== Setting up Aptos Token ===");
  
  try {
    // Step 1: Check if the token is already registered
    console.log("Checking if token is already registered...");
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
    const resources = await client.getAccountResources(accountAddress);
    
    const coinStoreType = `0x1::coin::CoinStore<${tokenAddress}>`;
    const coinStore = resources.find(r => r.type === coinStoreType);
    
    if (!coinStore) {
      console.log("Token not registered. Registering now...");
      
      // Step 2: Register the token
      const registerCommand = `aptos move run \
        --function-id 0x1::managed_coin::register \
        --type-args ${tokenAddress} \
        --assume-yes \
        --profile default`;
      
      console.log(`Executing command: ${registerCommand}`);
      
      try {
        const registerResult = execSync(registerCommand, { encoding: 'utf8' });
        console.log(registerResult);
        console.log(`\nSuccessfully registered TestAptosToken for ${accountAddress}`);
      } catch (execError) {
        console.error("Error registering token:", execError.message);
        if (execError.stdout) console.log("Command output:", execError.stdout);
        if (execError.stderr) console.log("Command error:", execError.stderr);
        return;
      }
    } else {
      console.log("Token already registered.");
    }
    
    // Step 3: Mint tokens
    console.log("\nMinting tokens...");
    const mintAmount = "1000000000000"; // 1000 tokens with 9 decimals
    const mintCommand = `aptos move run \
      --function-id 0x1::managed_coin::mint \
      --type-args ${tokenAddress} \
      --args address:${accountAddress} u64:${mintAmount} \
      --assume-yes \
      --profile default`;
    
    console.log(`Executing command: ${mintCommand}`);
    
    try {
      const mintResult = execSync(mintCommand, { encoding: 'utf8' });
      console.log(mintResult);
      console.log(`\nSuccessfully minted ${parseInt(mintAmount) / 1e9} TestAptosToken to ${accountAddress}`);
    } catch (execError) {
      console.error("Error minting tokens:", execError.message);
      if (execError.stdout) console.log("Command output:", execError.stdout);
      if (execError.stderr) console.log("Command error:", execError.stderr);
      return;
    }
    
    // Step 4: Verify balance
    console.log("\nVerifying balance...");
    const updatedResources = await client.getAccountResources(accountAddress);
    const updatedCoinStore = updatedResources.find(r => r.type === coinStoreType);
    
    if (updatedCoinStore) {
      console.log(`TestAptosToken Balance: ${updatedCoinStore.data.coin.value}`);
    } else {
      console.log("Still no CoinStore found for TestAptosToken. There might be an issue with the token setup.");
    }
    
    // Step 5: Save the token address to a JSON file
    console.log("\nSaving token address to JSON file...");
    const varsDir = path.join(__dirname, "vars");
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }
    
    const filePath = path.join(varsDir, "aptos-token-address.json");
    const jsonContent = JSON.stringify({
      "aptos-token-address": tokenAddress
    }, null, 4);
    
    fs.writeFileSync(filePath, jsonContent);
    console.log(`Aptos token address saved to ${filePath}`);
    
  } catch (error) {
    console.error("Error in setupToken function:", error.message);
  }
}

setupToken().catch(console.error);
