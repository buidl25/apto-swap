/**
 * Withdraw from an Aptos HTLC using a valid contract ID from blockchain events
 */
const { execSync } = require('child_process');
require('dotenv').config();

async function withdrawHtlc() {
  // Use the latest contract ID from the events we found
  // Force using the latest contract ID we found in the events
  const contractId = "0x6eda0a58336358917ddff1fd9bd9a5fdb6270c47a0d4d0f0d6f7ae24da71ee19"; // Latest contract ID from events
  
  // Try different preimage format for zero hashlock
  // Instead of passing an empty string, let's pass a zero byte as hex
  const preimage = "00"; // Zero byte as hex for zero hashlock
  
  const moduleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  
  console.log("=== Withdrawing from Aptos HTLC ===");
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
          const verifyCommand = `aptos transaction show --transaction-id ${txHash}`;
          const verifyResult = execSync(verifyCommand, { encoding: 'utf8' });
          console.log("\nTransaction details:");
          console.log(verifyResult);
        } catch (verifyError) {
          console.warn("Could not verify transaction, but it might still be successful:", verifyError.message);
        }
      }
      
      console.log("\nHTLC withdrawal initiated successfully!");
    } catch (execError) {
      console.error("Error executing withdrawal command:");
      if (execError.stdout) console.log("Command output:\n", execError.stdout);
      if (execError.stderr) console.log("Command error:\n", execError.stderr);
      
      // Check for specific error messages
      const errorOutput = execError.stdout || execError.stderr || '';
      if (errorOutput.includes("E_CONTRACT_NOT_EXISTS")) {
        console.error("\nError: Contract does not exist. The contract ID might be incorrect or the contract may have already been withdrawn/refunded.");
        console.error("Try using one of the contract IDs from the list-aptos-htlcs script.");
      } else if (errorOutput.includes("E_INVALID_PREIMAGE")) {
        console.error("\nError: Invalid preimage. The provided secret does not match the hashlock.");
      } else if (errorOutput.includes("E_TIMELOCK_NOT_EXPIRED")) {
        console.error("\nError: Timelock not expired. Only the recipient can withdraw before the timelock expires.");
      }
    }
  } catch (error) {
    console.error("Error in withdrawHtlc function:", error.message);
  }
}

// Execute the script if run directly
if (require.main === module) {
  withdrawHtlc().catch(console.error);
}

module.exports = { withdrawHtlc };
