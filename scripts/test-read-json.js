/**
 * Test script to verify JSON file reading
 */
const fs = require('fs');
const path = require('path');

// Path to the saved HTLC details
const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
console.log(`Reading file from: ${htlcDetailsPath}`);

// Read the file directly
const fileContent = fs.readFileSync(htlcDetailsPath, { encoding: 'utf8', flag: 'r' });
console.log(`Raw file content: ${fileContent}`);

// Parse the JSON
const htlcDetails = JSON.parse(fileContent);
console.log(`Parsed contract ID: ${htlcDetails.contractId}`);

// Now let's try to run the withdrawal with the correct contract ID directly
const { execSync } = require('child_process');

// Format the contract ID correctly for the Aptos CLI command
// The hex: prefix in Aptos CLI expects the value WITHOUT 0x prefix
const formattedContractId = htlcDetails.contractId.startsWith('0x') 
  ? htlcDetails.contractId.substring(2) 
  : htlcDetails.contractId;

console.log(`Using formatted contract ID: ${formattedContractId}`);

try {
  const aptosModuleAddress = "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const preimage = htlcDetails.preimage || "secret";
  
  const withdrawCommand = `move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
    `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
    `--args hex:${formattedContractId} string:${preimage} ` +
    `--assume-yes`;
  
  console.log(`Executing command: aptos ${withdrawCommand}`);
  const output = execSync(`aptos ${withdrawCommand}`, { encoding: "utf-8" });
  console.log(output);
  console.log("Successfully withdrew from Aptos HTLC!");
} catch (error) {
  console.error(`Error executing Aptos command: ${error.message}`);
  if (error.stdout) console.error(`Command output: ${error.stdout}`);
  if (error.stderr) console.error(`Command error: ${error.stderr}`);
  console.error("Failed to withdraw from Aptos HTLC");
}
