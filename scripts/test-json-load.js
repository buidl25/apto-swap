const fs = require('fs');
const path = require('path');

// Path to the saved HTLC details
const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
console.log(`Loading HTLC details from: ${htlcDetailsPath}`);

// Check if the file exists and try to load details from it
if (fs.existsSync(htlcDetailsPath)) {
  try {
    // Read file with no caching
    const fileContent = fs.readFileSync(htlcDetailsPath, { encoding: 'utf8', flag: 'r' });
    console.log(`Raw file content: ${fileContent}`);
    
    const htlcDetails = JSON.parse(fileContent);
    console.log(`Parsed HTLC details: ${JSON.stringify(htlcDetails, null, 2)}`);
    
    // Use values from the file
    const contractId = htlcDetails.contractId;
    const preimage = htlcDetails.preimage;
    
    console.log('Loaded HTLC details from saved file');
    console.log(`Contract ID from file: ${contractId}`);
    console.log(`Preimage from file: ${preimage}`);
    
    // Format the contract ID correctly for the Aptos CLI command
    const formattedContractId = contractId.startsWith('0x') ? contractId.substring(2) : contractId;
    console.log(`Formatted contract ID for CLI: ${formattedContractId}`);
    
    // Construct the command that would be used
    const aptosModuleAddress = '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
    const withdrawCommand = `aptos move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
      `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
      `--args hex:${formattedContractId} string:${preimage} ` +
      `--assume-yes`;
    
    console.log(`Command that would be executed: ${withdrawCommand}`);
  } catch (error) {
    console.error(`Error loading HTLC details from file: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
} else {
  console.error(`HTLC details file not found at: ${htlcDetailsPath}`);
}
