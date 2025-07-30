/**
 * Test different preimage values for Aptos HTLC withdrawal
 */
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Get parameters from environment variables or use defaults
const aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS || 
  "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";

// The contract ID we know exists on the blockchain
const contractId = "0xd419391c07453c0484c1e7120dec53245dc30cab150cd82412cf849bd0a0a91e";
const formattedContractId = contractId.startsWith('0x') ? contractId.substring(2) : contractId;

// Read the HTLC details from the JSON file
const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
console.log(`Reading file from: ${htlcDetailsPath}`);
const rawFileContent = fs.readFileSync(htlcDetailsPath, 'utf8');
console.log(`Raw file content: ${rawFileContent}`);
const htlcDetails = JSON.parse(rawFileContent);

// Get the hashlock from the HTLC details
const hashlock = htlcDetails.hashlock;
console.log(`Hashlock from file: ${hashlock}`);

// Try different preimage values
const preimageOptions = [
  // Empty string
  "",
  // Null byte
  "\0",
  // Buffer of zeros
  Buffer.alloc(32).toString('binary'),
  // Original preimage
  "secret",
  // Hex string of zeros
  "0000000000000000000000000000000000000000000000000000000000000000",
  // Byte array of zeros
  Array(32).fill(0).toString(),
];

console.log("\nTesting different preimage values:");

for (const preimage of preimageOptions) {
  console.log(`\nTrying preimage: "${preimage}" (${Buffer.from(preimage).toString('hex')})`);
  
  // Calculate the SHA3-256 hash of the preimage
  const hash = crypto.createHash('sha3-256').update(preimage).digest('hex');
  console.log(`Hash: ${hash}`);
  
  // Check if the hash matches the hashlock
  const hashlockWithoutPrefix = hashlock.replace(/^0x/, '');
  const isMatch = hash === hashlockWithoutPrefix;
  console.log(`Matches hashlock: ${isMatch}`);
  
  if (isMatch) {
    console.log("Found matching preimage!");
    
    // Try to withdraw with this preimage
    try {
      const command = `aptos move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
        `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
        `--args hex:${formattedContractId} string:${preimage} ` +
        `--assume-yes`;
      
      console.log(`\nExecuting command: ${command}`);
      const output = execSync(command, { encoding: 'utf8' });
      console.log("Withdrawal successful!");
      console.log(output);
      break;
    } catch (error) {
      console.error(`Error executing Aptos command: ${error.message}`);
      if (error.stdout) console.error(`Command output: ${error.stdout}`);
    }
  }
}

// If none of the preimages worked, try with a byte array preimage
console.log("\nTrying with byte array preimage:");
try {
  // Use a hex string for the preimage argument
  const byteArrayPreimage = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const command = `aptos move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
    `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
    `--args hex:${formattedContractId} hex:${byteArrayPreimage.replace(/^0x/, '')} ` +
    `--assume-yes`;
  
  console.log(`\nExecuting command: ${command}`);
  const output = execSync(command, { encoding: 'utf8' });
  console.log("Withdrawal successful!");
  console.log(output);
} catch (error) {
  console.error(`Error executing Aptos command: ${error.message}`);
  if (error.stdout) console.error(`Command output: ${error.stdout}`);
}
