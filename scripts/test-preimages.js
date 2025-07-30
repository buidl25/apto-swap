/**
 * Test different preimage values to find one that works with the zero hashlock
 */
const crypto = require('crypto');

function testPreimages() {
  console.log("=== Testing Preimages for Zero Hashlock ===");
  
  // The hashlock we're trying to match
  const targetHashlock = "0000000000000000000000000000000000000000000000000000000000000000";
  
  // Try different preimage values
  const preimages = [
    "", // Empty string
    "0", // Zero
    "0x00", // Hex zero
    "secret", // Default value
    Buffer.alloc(0).toString('hex'), // Empty buffer as hex
    Buffer.alloc(1, 0).toString('hex'), // Single zero byte as hex
    Buffer.alloc(32, 0).toString('hex'), // 32 zero bytes as hex
    "00".repeat(32), // 32 zero bytes as hex string
  ];
  
  console.log("Target hashlock:", targetHashlock);
  console.log("\nTesting preimages:");
  
  preimages.forEach((preimage, index) => {
    // Hash the preimage using SHA3-256
    const hash = crypto.createHash('sha3-256').update(Buffer.from(preimage)).digest('hex');
    
    console.log(`\n${index + 1}. Preimage: "${preimage}"`);
    console.log(`   SHA3-256 Hash: ${hash}`);
    console.log(`   Matches target: ${hash === targetHashlock ? 'YES' : 'NO'}`);
  });
  
  console.log("\nNote: In cryptography, finding a preimage that hashes to all zeros is extremely difficult.");
  console.log("The contract might have a special case for the zero hashlock or there might be a different approach needed.");
}

// Run the test
testPreimages();
