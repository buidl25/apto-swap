const { AptosClient } = require("aptos");

async function checkTransactions() {
  const accountAddress = "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
  
  console.log(`Checking recent transactions for account: ${accountAddress}\n`);
  
  try {
    // Get account transactions
    const transactions = await client.getAccountTransactions(accountAddress, { limit: 10 });
    
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

checkTransactions().catch(console.error);
