/**
 * Script to find the correct preimage for a given hashlock using SHA3-256
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// The hashlock from the transaction
const expectedHashlock = "0x017f8a0d8805d72c0fbe4145d71c97effed47fab2bcb2355819acd8972e2f0ab";

// Load the preimage from environment variable or use default
const preimageFromEnv = process.env.PREIMAGE;

// Try to load the preimage from swap details
let swapPreimage;
try {
  const swapDetailsPath = path.join(__dirname, '..', 'vars', 'evm-aptos-swap-details.json');
  const swapDetails = JSON.parse(fs.readFileSync(swapDetailsPath, 'utf8'));
  swapPreimage = swapDetails.preimage;
  console.log(`Loaded preimage from swap details: ${swapPreimage}`);
} catch (error) {
  console.log(`Could not load swap details: ${error.message}`);
}

// Use the preimage from environment variable or swap details or default
const preimage = preimageFromEnv || swapPreimage || "ee91ed06a44b4bacc8e34166a9fd5a6c3e015f9f786c4df3ed7ed8c0a42ff44f";
console.log(`Using preimage: ${preimage}`);

// Function to compute hashlock from preimage using SHA3-256
function computeHashlock(preimage) {
  // Normalize preimage (remove 0x if present)
  const normalizedPreimage = preimage.startsWith('0x') ? preimage.substring(2) : preimage;
  
  // Convert to Buffer for hashing
  const preimageBuffer = Buffer.from(normalizedPreimage, 'hex');
  
  // Compute SHA3-256 hash
  const hash = crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
  return `0x${hash}`;
}

// Try different preimage formats
console.log("\nTrying different preimage formats:");

// Format 1: As is
console.log(`\nPreimage as is: ${preimage}`);
const hashlock1 = computeHashlock(preimage);
console.log(`SHA3-256: ${hashlock1}`);
console.log(`Matches expected: ${hashlock1.toLowerCase() === expectedHashlock.toLowerCase()}`);

// Format 2: With 0x prefix
const preimageWithPrefix = preimage.startsWith('0x') ? preimage : `0x${preimage}`;
console.log(`\nPreimage with 0x prefix: ${preimageWithPrefix}`);
const hashlock2 = computeHashlock(preimageWithPrefix);
console.log(`SHA3-256: ${hashlock2}`);
console.log(`Matches expected: ${hashlock2.toLowerCase() === expectedHashlock.toLowerCase()}`);

// Format 3: Try reversing the bytes
const reversedPreimage = Buffer.from(preimage.startsWith('0x') ? preimage.substring(2) : preimage, 'hex').reverse().toString('hex');
console.log(`\nReversed preimage: ${reversedPreimage}`);
const hashlock3 = computeHashlock(reversedPreimage);
console.log(`SHA3-256: ${hashlock3}`);
console.log(`Matches expected: ${hashlock3.toLowerCase() === expectedHashlock.toLowerCase()}`);

// Format 4: Try UTF-8 string interpretation
try {
  const preimageAsString = Buffer.from(preimage.startsWith('0x') ? preimage.substring(2) : preimage, 'hex').toString('utf8');
  console.log(`\nPreimage as UTF-8 string (if printable): [binary data]`);
  const hashlock4 = crypto.createHash('sha3-256').update(preimageAsString).digest('hex');
  console.log(`SHA3-256: 0x${hashlock4}`);
  console.log(`Matches expected: ${'0x' + hashlock4 === expectedHashlock.toLowerCase()}`);
} catch (error) {
  console.log(`Error processing preimage as string: ${error.message}`);
}

// Try to find the correct preimage by brute force (simple approach)
console.log("\n\nAttempting to find the correct preimage...");

// Try common preimage formats
const commonPreimages = [
  "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // Default test preimage
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // With 0x prefix
  "secret", // Simple string
  "0xsecret", // Simple string with 0x prefix
  "password", // Another simple string
  "0xpassword", // Another simple string with 0x prefix
];

for (const testPreimage of commonPreimages) {
  const testHashlock = computeHashlock(testPreimage);
  console.log(`Preimage: ${testPreimage}`);
  console.log(`SHA3-256: ${testHashlock}`);
  console.log(`Matches expected: ${testHashlock.toLowerCase() === expectedHashlock.toLowerCase()}`);
  console.log("---");
  
  if (testHashlock.toLowerCase() === expectedHashlock.toLowerCase()) {
    console.log(`\n*** FOUND MATCHING PREIMAGE: ${testPreimage} ***`);
    break;
  }
}

// If we haven't found a match, suggest next steps
console.log("\nIf no match was found, you may need to:");
console.log("1. Check if the hashlock was generated using a different algorithm");
console.log("2. Verify the hashlock value is correct");
console.log("3. Try to recover the original preimage from the creator of the escrow");
console.log("4. Consider using a different preimage and recreating the escrow");
