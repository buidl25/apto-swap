/**
 * List all HTLCs stored in the AtomicSwap module
 * 
 * This script queries the HTLCStore resource to see all active contracts
 */

const { AptosClient, HexString, Types } = require("aptos");
const { execSync } = require("child_process");
require("dotenv").config();

/**
 * Executes an Aptos CLI command and returns the output
 * @param {string} command - The command to execute
 * @returns {string} - Command output
 */
function executeAptosCommand(command) {
  try {
    const output = execSync(`aptos ${command}`, { encoding: "utf-8" });
    return output;
  } catch (error) {
    console.error(`Error executing Aptos command: ${error.message}`);
    if (error.stdout) console.error(`Command output: ${error.stdout}`);
    if (error.stderr) console.error(`Command error: ${error.stderr}`);
    throw error;
  }
}

async function main() {
  console.log("=== Listing Aptos HTLCs ===");
  
  // Get module address from environment variables or use default
  const moduleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  
  console.log(`Module Address: ${moduleAddress}`);
  
  try {
    // Initialize Aptos client
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
    
    // Query the HTLCStore resource
    const resource = await client.getAccountResource(
      moduleAddress,
      `${moduleAddress}::atomic_swap::HTLCStore`
    );
    
    console.log("\nHTLCStore Resource:");
    console.log(JSON.stringify(resource, null, 2));
    
    // Get the table handle
    const tableHandle = resource.data.contracts.handle;
    console.log(`\nTable Handle: ${tableHandle}`);
    
    // Get events directly using the REST API
    console.log("\nFetching HTLCCreatedEvents using REST API...");
    try {
      // Get the event handle from the resource
      const eventHandle = resource.data.created_events.guid.id;
      const eventHandleStr = `${eventHandle.addr}::${eventHandle.creation_num}`;
      
      // Fetch events using the REST API
      const events = await client.getEventsByEventHandle(
        moduleAddress,
        `${moduleAddress}::atomic_swap::HTLCStore`,
        "created_events",
        { limit: 10 }
      );
      
      console.log("\nRecent HTLC Created Events:");
      console.log(JSON.stringify(events, null, 2));
      
      // Extract contract IDs from events
      if (events && events.length > 0) {
        console.log("\nExtracted Contract IDs:");
        events.forEach((event, index) => {
          console.log(`${index + 1}. Contract ID: ${event.data.contract_id}`);
          console.log(`   Sender: ${event.data.sender}`);
          console.log(`   Recipient: ${event.data.recipient}`);
          console.log(`   Amount: ${event.data.amount}`);
          console.log(`   Timelock: ${event.data.timelock} (${new Date(event.data.timelock * 1000).toLocaleString()})`);
          console.log(`   Hashlock: ${event.data.hashlock}`);
          console.log("---");
        });
      } else {
        console.log("No events found.");
      }
    } catch (error) {
      console.error("Error fetching events:", error.message);
    }
    
    return {
      success: true,
      resource
    };
  } catch (error) {
    console.error("Failed to query HTLCStore:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the script if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
