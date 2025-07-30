/**
 * Withdraw from the test Aptos HTLC using the known preimage
 * 
 * This script withdraws from a Hashed Timelock Contract (HTLC) on the Aptos blockchain
 * using the known preimage from our test HTLC.
 */

const { execSync } = require("child_process");
require("dotenv").config();

/**
 * Main function to withdraw from an HTLC on Aptos
 */
async function withdrawHtlc() {
  // Use the contract ID and preimage from our test HTLC
  const contractId = "0xe0c9058b2316409e5272f8bcbc4127cd4002e953a8482004385fc44bda5f1d80";
  const preimage = "test_secret";
  
  const moduleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  
  console.log("=== Withdrawing from Test Aptos HTLC ===");
  console.log(`Module Address: ${moduleAddress}`);
  console.log(`Contract ID: ${contractId}`);
  console.log(`Preimage (secret): ${preimage}`);
  
  try {
    console.log("\nWithdrawing from HTLC...");
    
    // Format the contract ID properly (remove 0x prefix for hex argument)
    const formattedContractId = contractId.replace(/^0x/, '');
    
    const command = `aptos move run \
      --function-id ${moduleAddress}::atomic_swap::withdraw \
      --type-args ${moduleAddress}::test_aptos_token::TestAptosToken \
      --args hex:${formattedContractId} string:${preimage} \
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
          const verifyCommand = `aptos move view \
            --function-id ${moduleAddress}::atomic_swap::get_htlc_info \
            --type-args ${moduleAddress}::test_aptos_token::TestAptosToken \
            --args hex:${formattedContractId}`;
          
          const verifyResult = execSync(verifyCommand, { encoding: 'utf8' });
          console.log("\nHTLC status after withdrawal:");
          console.log(verifyResult);
        } catch (verifyError) {
          console.warn("Could not verify HTLC status, but withdrawal might still be successful:", verifyError.message);
        }
      }
      
      console.log("\nHTLC withdrawal initiated successfully!");
      return { success: true };
    } catch (execError) {
      console.error("Error executing withdrawal command:");
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
        console.error("\nError: Unauthorized. Only the recipient can withdraw.");
      } else if (errorOutput.includes("E_INVALID_PREIMAGE")) {
        console.error("\nError: Invalid preimage. The provided secret does not match the hashlock.");
      } else if (errorOutput.includes("E_TIMELOCK_EXPIRED")) {
        console.error("\nError: Timelock expired. You can no longer withdraw from this HTLC.");
      }
      
      return { success: false, error: execError.message };
    }
  } catch (error) {
    console.error("Error in withdrawHtlc function:", error.message);
    return { success: false, error: error.message };
  }
}

// Execute the script if run directly
if (require.main === module) {
  withdrawHtlc().catch(console.error);
}

module.exports = { withdrawHtlc };
