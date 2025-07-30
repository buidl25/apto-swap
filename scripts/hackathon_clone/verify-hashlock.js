/**
 * Script to verify if a preimage produces the expected hashlock
 */
const crypto = require('crypto');

// The preimage and hashlock from our data
const preimage = "ee91ed06a44b4bacc8e34166a9fd5a6c3e015f9f786c4df3ed7ed8c0a42ff44f";
const expectedHashlock = "0x017f8a0d8805d72c0fbe4145d71c97effed47fab2bcb2355819acd8972e2f0ab";

// Function to compute hashlock from preimage using different hash algorithms
function computeHashlocks(preimage) {
  // Normalize preimage (remove 0x if present)
  const normalizedPreimage = preimage.startsWith('0x') ? preimage.substring(2) : preimage;
  
  // Convert to Buffer for hashing
  const preimageBuffer = Buffer.from(normalizedPreimage, 'hex');
  
  // Try different hash algorithms
  const algorithms = ['sha256', 'sha3-256', 'keccak256'];
  const results = {};
  
  algorithms.forEach(algo => {
    let hash;
    if (algo === 'keccak256') {
      // Node.js doesn't have keccak256 directly, use sha3-256 as approximation
      hash = crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
    } else {
      hash = crypto.createHash(algo).update(preimageBuffer).digest('hex');
    }
    results[algo] = `0x${hash}`;
  });
  
  return results;
}

// Compute hashlocks using different algorithms
const hashlocks = computeHashlocks(preimage);

// Compare with expected hashlock
console.log("Preimage:", preimage);
console.log("Expected hashlock:", expectedHashlock);
console.log("\nComputed hashlocks with different algorithms:");

for (const [algo, hash] of Object.entries(hashlocks)) {
  console.log(`${algo}: ${hash}`);
  console.log(`Matches expected: ${hash.toLowerCase() === expectedHashlock.toLowerCase()}`);
}

// Try different preimage formats
console.log("\nTrying different preimage formats:");

// Format 1: With 0x prefix
const preimageWithPrefix = `0x${preimage}`;
console.log(`\nPreimage with 0x prefix: ${preimageWithPrefix}`);
const hashlocks1 = computeHashlocks(preimageWithPrefix);
for (const [algo, hash] of Object.entries(hashlocks1)) {
  console.log(`${algo}: ${hash}`);
  console.log(`Matches expected: ${hash.toLowerCase() === expectedHashlock.toLowerCase()}`);
}

// Format 2: UTF-8 string interpretation
const preimageAsString = Buffer.from(preimage, 'hex').toString('utf8');
console.log(`\nPreimage as UTF-8 string (if printable): [binary data]`);
try {
  const hashlocks2 = {};
  const algorithms = ['sha256', 'sha3-256', 'keccak256'];
  
  algorithms.forEach(algo => {
    let hash;
    if (algo === 'keccak256') {
      hash = crypto.createHash('sha3-256').update(preimageAsString).digest('hex');
    } else {
      hash = crypto.createHash(algo).update(preimageAsString).digest('hex');
    }
    hashlocks2[algo] = `0x${hash}`;
    console.log(`${algo}: ${hashlocks2[algo]}`);
    console.log(`Matches expected: ${hashlocks2[algo].toLowerCase() === expectedHashlock.toLowerCase()}`);
  });
} catch (error) {
  console.log("Error processing preimage as string:", error.message);
}

// Format 3: Try reversing the bytes
const reversedPreimage = Buffer.from(preimage, 'hex').reverse().toString('hex');
console.log(`\nReversed preimage: ${reversedPreimage}`);
const hashlocks3 = computeHashlocks(reversedPreimage);
for (const [algo, hash] of Object.entries(hashlocks3)) {
  console.log(`${algo}: ${hash}`);
  console.log(`Matches expected: ${hash.toLowerCase() === expectedHashlock.toLowerCase()}`);
}
