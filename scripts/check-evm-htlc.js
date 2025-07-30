/**
 * Check the status of an HTLC on the EVM side
 * 
 * This script checks if an HTLC exists on the EVM chain
 * and prints its details if it does.
 */

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  // Get the contract address and contract ID from environment variables or command line arguments
  const htlcAddress = process.env.EVM_HTLC_ADDRESS || process.argv[2];
  const contractId = process.env.CONTRACT_ID || process.argv[3];

  if (!htlcAddress || !contractId) {
    console.error("Error: EVM_HTLC_ADDRESS or CONTRACT_ID not set");
    console.error("Usage: node check-evm-htlc.js <htlc-address> <contract-id>");
    process.exit(1);
  }
  
  console.log("\n=== Checking EVM HTLC ===");
  console.log(`HTLC Contract: ${htlcAddress}`);
  console.log(`Contract ID: ${contractId}`);
  
  // Get the signer
  const [sender] = await hre.ethers.getSigners();
  console.log(`Checking with account: ${sender.address}`);
  
  try {
    // Connect to the HTLC contract
    const htlc = await hre.ethers.getContractAt("EthereumHTLC", htlcAddress);
    
    // Try to get the HTLC data
    console.log("\nAttempting to fetch HTLC data...");
    
    // Check if the contract exists
    try {
      const htlcData = await htlc.contracts(contractId);
      console.log("\nHTLC Data found:");
      console.log(`Sender: ${htlcData.sender}`);
      console.log(`Recipient: ${htlcData.recipient}`);
      console.log(`Token: ${htlcData.token}`);
      console.log(`Amount: ${htlcData.amount.toString()}`);
      console.log(`Hashlock: ${htlcData.hashlock}`);
      console.log(`Timelock: ${htlcData.timelock.toString()}`);
      console.log(`Withdrawn: ${htlcData.withdrawn}`);
      console.log(`Refunded: ${htlcData.refunded}`);
    } catch (error) {
      console.error(`Error fetching HTLC data: ${error.message}`);
      
      // Check if the contract exists at the given address
      const code = await hre.ethers.provider.getCode(htlcAddress);
      if (code === "0x") {
        console.error(`No contract found at address ${htlcAddress}`);
        console.error("The Hardhat network may have been restarted. Try redeploying the contract.");
      } else {
        console.log(`Contract exists at ${htlcAddress}, but HTLC with ID ${contractId} was not found.`);
        console.log("Try creating a new HTLC.");
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
