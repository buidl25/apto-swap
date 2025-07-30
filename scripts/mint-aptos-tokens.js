const { execSync } = require('child_process');

async function mintTokens() {
  const accountAddress = "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const tokenAddress = `${accountAddress}::test_aptos_token::TestAptosToken`;
  const recipientAddress = accountAddress; // Minting to the same account that owns the token
  
  try {
    // Use the managed_coin::mint function from the Aptos framework
    const mintAmount = "1000000000000"; // 1000 tokens with 9 decimals
    const command = `aptos move run \
      --function-id 0x1::managed_coin::mint \
      --type-args ${tokenAddress} \
      --args address:${recipientAddress} u64:${mintAmount} \
      --assume-yes \
      --profile default`;
      
    console.log(`Executing command: ${command}`);
    
    try {
      const result = execSync(command, { encoding: 'utf8' });
      console.log(result);
      console.log(`\nSuccessfully minted ${parseInt(mintAmount) / 1e9} TestAptosToken to ${recipientAddress}`);
    } catch (execError) {
      console.error("Error executing command:", execError.message);
      if (execError.stdout) console.log("Command output:", execError.stdout);
      if (execError.stderr) console.log("Command error:", execError.stderr);
    }
  } catch (error) {
    console.error("Error in mintTokens function:", error.message);
  }
}

mintTokens().catch(console.error);