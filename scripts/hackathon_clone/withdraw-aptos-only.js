/**
 * Simplified script to withdraw from Aptos escrow only
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log("=== Aptos Escrow Withdrawal Script ===");
  
  // Set preimage from environment variable or use a default for testing
  const preimage = process.env.PREIMAGE || "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  console.log(`Using preimage: ${preimage}`);
  
  try {
    // Load escrow details
    const escrowDetailsFile = path.join(__dirname, "..", "vars", "hackathon-escrow-details.json");
    
    if (!fs.existsSync(escrowDetailsFile)) {
      throw new Error(`Escrow details file not found: ${escrowDetailsFile}`);
    }
    
    const escrowDetails = JSON.parse(fs.readFileSync(escrowDetailsFile, 'utf8'));
    console.log("Loaded escrow details:", JSON.stringify(escrowDetails, null, 2));
    
    // Try to load swap details for hashlock and preimage
    const swapDetailsFile = path.join(__dirname, "..", "vars", "evm-aptos-swap-details.json");
    let hashlock = escrowDetails.hashlock;
    let swapPreimage = null;
    
    if (fs.existsSync(swapDetailsFile)) {
      const swapDetails = JSON.parse(fs.readFileSync(swapDetailsFile, 'utf8'));
      console.log("Loaded swap details:", JSON.stringify(swapDetails, null, 2));
      
      if (swapDetails.hashlock) {
        hashlock = swapDetails.hashlock;
        console.log(`Using hashlock from swap details: ${hashlock}`);
      }
      
      if (swapDetails.preimage) {
        swapPreimage = swapDetails.preimage;
        console.log(`Found preimage in swap details: ${swapPreimage}`);
      }
    }
    
    // Use preimage from environment, swap details, or default
    const preimageToUse = process.env.PREIMAGE || swapPreimage || preimage;
    console.log(`Final preimage to use: ${preimageToUse}`);
    
    // Use the correct contract ID from the transaction event
    // This is the actual contract ID used when the escrow was created
    const correctContractId = "0xe50de5e755b37495b586b78dbbdd4d3c6c2e000d496ed6eacfbade2f0e3eafd8";
    console.log("Using correct contract ID from transaction event:", correctContractId);
    const contractId = correctContractId;
    
    if (!contractId) {
      throw new Error("Could not determine contract ID from escrow details");
    }
    
    console.log(`Using contract ID: ${contractId}`);
    
    // Format the escrow ID and preimage for the command
    const escrowIdArg = contractId.startsWith('0x') ? contractId.substring(2) : contractId;
    
    // Try different preimage formats
    const preimageFormats = [];
    
    // Format 1: Direct hex string with hex: prefix
    if (preimageToUse.startsWith('0x')) {
      preimageFormats.push(`hex:${preimageToUse.substring(2)}`);
    } else {
      preimageFormats.push(`hex:${preimageToUse}`);
    }
    
    // Format 2: Vector<u8> format
    const preimageBytes = Buffer.from(preimageToUse.startsWith('0x') ? preimageToUse.substring(2) : preimageToUse, 'hex');
    let vectorFormat = 'vector[';
    for (let i = 0; i < preimageBytes.length; i++) {
      vectorFormat += preimageBytes[i];
      if (i < preimageBytes.length - 1) vectorFormat += ',';
    }
    vectorFormat += ']';
    preimageFormats.push(vectorFormat);
    
    // Format 3: String format
    preimageFormats.push(`string:${preimageToUse}`);
    
    // Get the module address
    const moduleAddress = escrowDetails.moduleAddress || process.env.APTOS_MODULE_ADDRESS;
    if (!moduleAddress) {
      throw new Error("Module address not found in escrow details or environment variables");
    }
    
    console.log("Withdrawing from Aptos escrow with parameters:");
    console.log(`- Module Address: ${moduleAddress}`);
    console.log(`- Contract ID: ${contractId}`);
    console.log(`- Hashlock: ${hashlock}`);
    console.log(`- Preimage: ${preimageToUse}`);
    
    // Try each preimage format
    let lastError = null;
    for (const preimageArg of preimageFormats) {
      console.log(`\nTrying preimage format: ${preimageArg}`);
      
      const withdrawCommand = `aptos move run \
        --function-id ${moduleAddress}::escrow_dst::withdraw \
        --type-args 0x1::aptos_coin::AptosCoin \
        --args hex:${escrowIdArg} ${preimageArg} \
        --max-gas 10000 \
        --gas-unit-price 100 \
        --profile default \
        --assume-yes`;
      
      console.log(`\nExecuting withdraw command:\n${withdrawCommand}`);
      
      try {
        execSync(withdrawCommand, { stdio: 'inherit' });
        console.log('\nWithdrawal successful with format:', preimageArg);
        return; // Exit the function if successful
      } catch (error) {
        console.log(`Error with format ${preimageArg}:`, error.message);
        lastError = error;
      }
    }
    
    // If we get here, all formats failed
    throw lastError || new Error('All preimage formats failed');
    
  } catch (error) {
    console.error("\nAptos escrow withdrawal failed:");
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
