const { AptosClient } = require("aptos");
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

async function checkTransactions() {
  // Try to load recipient address from saved HTLC details
  let recipientAccountAddress = process.env.APTOS_RECIPIENT || process.env.APTOS_RECIPIENT_ADDRESS;
  
  // Path to the saved HTLC details
  const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
  
  // Check if the file exists and try to load details from it
  if (fs.existsSync(htlcDetailsPath)) {
    try {
      const htlcDetails = JSON.parse(fs.readFileSync(htlcDetailsPath, 'utf8'));
      recipientAccountAddress = recipientAccountAddress || htlcDetails.recipient;
      console.log('Loaded recipient address from saved HTLC details');
    } catch (error) {
      console.error(`Error loading HTLC details from file: ${error.message}`);
    }
  }
  
  // Fallback to default recipient if not set
  recipientAccountAddress = recipientAccountAddress || "0x318942fc76d84578ab2efc2c85ed031d06c4f444f3cdae9bbaf09901677b573f";
  const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
  
  console.log(`Checking recent transactions for account: ${recipientAccountAddress}\n`);
  
  try {
    // Get account transactions
    const transactions = await client.getAccountTransactions(recipientAccountAddress, { limit: 10 });
    
    console.log(`Found ${transactions.length} recent transactions:\n`);
    
    for (const tx of transactions) {
      console.log(`Transaction Hash: ${tx.hash}`);
      console.log(`Type: ${tx.type}`);
      console.log(`Status: ${tx.success ? 'Success' : 'Failed'}`);
      console.log(`Timestamp: ${new Date(tx.timestamp / 1000).toLocaleString()}`);
      
      if (tx.payload && tx.payload.function) {
        console.log(`Function: ${tx.payload.function}`);
        console.log(`Type Arguments: ${tx.payload.type_arguments.join(', ') || 'None'}`);
        console.log(`Arguments: ${JSON.stringify(tx.payload.arguments)}`);
      }
      
      console.log('---------------------------------------------------');
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
}

console.log('=== Checking Aptos Recipient Transactions ===');
checkTransactions().catch(error => {
  console.error(`Error checking transactions: ${error.message}`);
  process.exit(1);
});
