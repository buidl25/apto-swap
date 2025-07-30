/**
 * Helper script to run the EVM HTLC withdrawal with required variables
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read the EVM HTLC address from the JSON file
const htlcAddressFile = path.join(__dirname, 'vars', 'evm-htlc-address.json');
const htlcAddressData = JSON.parse(fs.readFileSync(htlcAddressFile, 'utf8'));
const evmHtlcAddress = htlcAddressData['evm-htlc-address'];

// Get the contract ID from command line or use a default
// Usage: node run-withdraw-evm.js <contractId>
const contractId = process.argv[2];
if (!contractId) {
  console.error('Error: Contract ID is required');
  console.error('Usage: node run-withdraw-evm.js <contractId>');
  process.exit(1);
}

// Use the same preimage as in the Aptos withdrawal
const preimage = 'secret';

console.log('Running EVM HTLC withdrawal with:');
console.log(`EVM_HTLC_ADDRESS: ${evmHtlcAddress}`);
console.log(`CONTRACT_ID: ${contractId}`);
console.log(`PREIMAGE: ${preimage}`);

// Set up environment variables for the child process
const env = {
  ...process.env,
  EVM_HTLC_ADDRESS: evmHtlcAddress,
  CONTRACT_ID: contractId,
  PREIMAGE: preimage
};

// Run the withdraw-evm-htlc script with the environment variables
const npmProcess = spawn('npm', ['run', 'withdraw-evm-htlc'], {
  env,
  stdio: 'inherit'
});

npmProcess.on('close', (code) => {
  process.exit(code);
});
