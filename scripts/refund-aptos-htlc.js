/**
 * Refund an Aptos HTLC after timelock expiration
 * 
 * This script attempts to refund an HTLC after its timelock has expired
 */
const { execSync } = require('child_process');
require('dotenv').config();

/**
 * Main function to refund an HTLC on Aptos
 */
async function refundHtlc() {
  // Force using the correct contract ID we verified works on the blockchain
  const contractId = "0xd419391c07453c0484c1e7120dec53245dc30cab150cd82412cf849bd0a0a91e"; // Verified contract ID
  
  const moduleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  
  console.log("=== Refunding Aptos HTLC ===");
  console.log(`Module Address: ${moduleAddress}`);
  console.log(`Contract ID: ${contractId}`);
  
  // Get current timestamp
  const currentTime = Math.floor(Date.now() / 1000);
  console.log(`Current timestamp: ${currentTime} (${new Date(currentTime * 1000).toLocaleString()})`);
  
  try {
    console.log("\nAttempting to refund HTLC...");
    
    // Format the contract ID properly (remove 0x prefix for hex argument)
    const formattedContractId = contractId.replace(/^0x/, '');
    
    const command = `aptos move run \
      --function-id ${moduleAddress}::atomic_swap::refund \
      --type-args ${moduleAddress}::test_aptos_token::TestAptosToken \
      --args hex:${formattedContractId} \
      --assume-yes`;
    
    console.log(`Executing command: ${command}`);
    
    try {
      const result = execSync(command, { encoding: 'utf8' });
      console.log("Transaction submitted successfully!");
      
      // Extract transaction hash for verification
      const txHashMatch = result.match(/Transaction hash: ([a-f0-9]+)/i);
      if (txHashMatch && txHashMatch[1]) {
        const txHash = txHashMatch[1];
        console.log(`Transaction hash: ${txHash}`);
        console.log("\nVerifying transaction on chain...");
        
        // Wait a moment for transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          // Verify transaction using aptos CLI
          const verifyCommand = `aptos transaction show --transaction-id ${txHash}`;
          const verifyResult = execSync(verifyCommand, { encoding: 'utf8' });
          console.log("\nTransaction details:");
          console.log(verifyResult);
        } catch (verifyError) {
          console.warn("Could not verify transaction, but it might still be successful:", verifyError.message);
        }
      }
      
      console.log("\nHTLC refund initiated successfully!");
    } catch (execError) {
      console.error("Error executing refund command:");
      if (execError.stdout) console.log("Command output:\n", execError.stdout);
      if (execError.stderr) console.log("Command error:\n", execError.stderr);
      
      // Check for specific error messages
      const errorOutput = execError.stdout || execError.stderr || '';
      if (errorOutput.includes("E_CONTRACT_NOT_EXISTS")) {
        console.error("\nError: Contract does not exist. The contract ID might be incorrect or the contract may have already been withdrawn/refunded.");
      } else if (errorOutput.includes("E_ALREADY_WITHDRAWN")) {
        console.error("\nError: Contract has already been withdrawn.");
      } else if (errorOutput.includes("E_ALREADY_REFUNDED")) {
        console.error("\nError: Contract has already been refunded.");
      } else if (errorOutput.includes("E_UNAUTHORIZED")) {
        console.error("\nError: Unauthorized. Only the sender can refund.");
      } else if (errorOutput.includes("E_TIMELOCK_NOT_EXPIRED")) {
        console.error("\nError: Timelock not expired. You must wait until the timelock expires to refund.");
        console.error("Try again after the timelock expires.");
      }
    }
  } catch (error) {
    console.error("Error in refundHtlc function:", error.message);
  }
}

// Execute the script if run directly
if (require.main === module) {
  refundHtlc().catch(console.error);
}

module.exports = { refundHtlc };
