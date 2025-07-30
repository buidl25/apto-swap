/**
 * Check Aptos HTLC events (created, withdrawn, refunded)
 * 
 * This script checks all events related to HTLCs on the Aptos blockchain
 */
const { AptosClient } = require("aptos");
require("dotenv").config();

/**
 * Main function to check HTLC events on Aptos
 */
async function checkHtlcEvents() {
  console.log("=== Checking Aptos HTLC Events ===");
  
  const moduleAddress = process.env.APTOS_MODULE_ADDRESS || 
    "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  
  console.log(`Module Address: ${moduleAddress}`);
  
  try {
    // Initialize Aptos client
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
    
    // Fetch all event types
    console.log("\nFetching HTLC events...");
    
    // Fetch HTLCCreatedEvents
    const createdEvents = await client.getEventsByEventHandle(
      moduleAddress,
      `${moduleAddress}::atomic_swap::HTLCStore`,
      "created_events",
      { limit: 100 }
    );
    
    console.log(`\nFound ${createdEvents.length} HTLCCreatedEvents:`);
    createdEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. Contract ID: ${event.data.contract_id}`);
      console.log(`   Sender: ${event.data.sender}`);
      console.log(`   Recipient: ${event.data.recipient}`);
      console.log(`   Amount: ${event.data.amount}`);
      console.log(`   Timelock: ${event.data.timelock} (${new Date(event.data.timelock * 1000).toLocaleString()})`);
      console.log(`   Hashlock: ${event.data.hashlock}`);
      console.log(`   Transaction Version: ${event.version}`);
    });
    
    // Fetch HTLCWithdrawnEvents
    const withdrawnEvents = await client.getEventsByEventHandle(
      moduleAddress,
      `${moduleAddress}::atomic_swap::HTLCStore`,
      "withdrawn_events",
      { limit: 100 }
    );
    
    console.log(`\nFound ${withdrawnEvents.length} HTLCWithdrawnEvents:`);
    withdrawnEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. Contract ID: ${event.data.contract_id}`);
      console.log(`   Preimage: ${event.data.preimage}`);
      console.log(`   Transaction Version: ${event.version}`);
    });
    
    // Fetch HTLCRefundedEvents
    const refundedEvents = await client.getEventsByEventHandle(
      moduleAddress,
      `${moduleAddress}::atomic_swap::HTLCStore`,
      "refunded_events",
      { limit: 100 }
    );
    
    console.log(`\nFound ${refundedEvents.length} HTLCRefundedEvents:`);
    refundedEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. Contract ID: ${event.data.contract_id}`);
      console.log(`   Transaction Version: ${event.version}`);
      
      // Find the corresponding created event to show more details
      const createdEvent = createdEvents.find(e => e.data.contract_id === event.data.contract_id);
      if (createdEvent) {
        console.log(`   Original Sender: ${createdEvent.data.sender}`);
        console.log(`   Original Recipient: ${createdEvent.data.recipient}`);
        console.log(`   Original Amount: ${createdEvent.data.amount}`);
        console.log(`   Original Timelock: ${createdEvent.data.timelock} (${new Date(createdEvent.data.timelock * 1000).toLocaleString()})`);
      }
    });
    
    // Summary
    console.log("\n=== Summary ===");
    console.log(`Total HTLCs Created: ${createdEvents.length}`);
    console.log(`Total HTLCs Withdrawn: ${withdrawnEvents.length}`);
    console.log(`Total HTLCs Refunded: ${refundedEvents.length}`);
    console.log(`HTLCs Still Active: ${createdEvents.length - withdrawnEvents.length - refundedEvents.length}`);
    
    return {
      success: true,
      created: createdEvents,
      withdrawn: withdrawnEvents,
      refunded: refundedEvents
    };
  } catch (error) {
    console.error("Error checking HTLC events:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the script if run directly
if (require.main === module) {
  checkHtlcEvents().catch(console.error);
}

module.exports = { checkHtlcEvents };
