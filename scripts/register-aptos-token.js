const { execSync } = require('child_process');

async function registerToken() {
  const accountAddress = "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const tokenAddress = `${accountAddress}::test_aptos_token::TestAptosToken`;
  
  try {
    // Use the managed_coin::register function from the Aptos framework
    const command = `aptos move run \
      --function-id 0x1::managed_coin::register \
      --type-args ${tokenAddress} \
      --assume-yes \
      --profile default`;
      
    console.log(`Executing command: ${command}`);
    
    try {
      const result = execSync(command, { encoding: 'utf8' });
      console.log(result);
      console.log(`\nSuccessfully registered TestAptosToken for ${accountAddress}`);
    } catch (execError) {
      console.error("Error executing command:", execError.message);
      if (execError.stdout) console.log("Command output:", execError.stdout);
      if (execError.stderr) console.log("Command error:", execError.stderr);
    }
  } catch (error) {
    console.error("Error in registerToken function:", error.message);
  }
}

registerToken().catch(console.error);
