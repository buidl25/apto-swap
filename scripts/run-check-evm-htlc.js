/**
 * Run script to check EVM HTLC status
 * 
 * This script runs the check-evm-htlc script with the contract ID from command line or environment
 */

require('dotenv').config();
const { spawn } = require('child_process');

// Get contract ID from command line or environment
const contractId = process.argv[2] || process.env.CONTRACT_ID;

if (!contractId) {
  console.error("Error: CONTRACT_ID not provided");
  console.error("Usage: node run-check-evm-htlc.js <contract-id>");
  process.exit(1);
}

console.log("Running EVM HTLC check with:");
console.log(`EVM_HTLC_ADDRESS: ${process.env.EVM_HTLC_ADDRESS}`);
console.log(`CONTRACT_ID: ${contractId}`);

// Run the npm script
const child = spawn('npm', ['run', 'check-evm-htlc'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CONTRACT_ID: contractId
  }
});

child.on('error', (error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code);
});
