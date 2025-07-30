/**
 * Generate correct preimage for a known hashlock
 * 
 * This script tries different encoding methods to find the correct preimage
 * that generates the expected hashlock
 */

const { ethers } = require("ethers");

// Фиксированный хэшлок для прообраза "secret"
const expectedHashlock = "0x2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
const preimage = "secret";

console.log(`\nTrying to find correct encoding for preimage "${preimage}" to match hashlock ${expectedHashlock}\n`);

// Метод 1: UTF-8 байты
const utf8Bytes = ethers.toUtf8Bytes(preimage);
const hashFromUtf8 = ethers.keccak256(utf8Bytes);
console.log("Method 1: UTF-8 bytes");
console.log(`UTF-8 bytes: ${ethers.hexlify(utf8Bytes)}`);
console.log(`Hashlock: ${hashFromUtf8}`);
console.log(`Match: ${hashFromUtf8 === expectedHashlock}`);

// Метод 2: Bytes32 String
const bytes32String = ethers.encodeBytes32String(preimage);
const hashFromBytes32 = ethers.keccak256(bytes32String);
console.log("\nMethod 2: Bytes32 String");
console.log(`Bytes32: ${bytes32String}`);
console.log(`Hashlock: ${hashFromBytes32}`);
console.log(`Match: ${hashFromBytes32 === expectedHashlock}`);

// Метод 3: Hex строка
const hexString = ethers.hexlify(ethers.toUtf8Bytes(preimage)).padEnd(66, '0');
const hashFromHex = ethers.keccak256(hexString);
console.log("\nMethod 3: Hex string padded");
console.log(`Hex padded: ${hexString}`);
console.log(`Hashlock: ${hashFromHex}`);
console.log(`Match: ${hashFromHex === expectedHashlock}`);

// Метод 4: ABI кодирование строки
const abiEncoded = ethers.AbiCoder.defaultAbiCoder().encode(["string"], [preimage]);
const hashFromAbi = ethers.keccak256(abiEncoded);
console.log("\nMethod 4: ABI encoded string");
console.log(`ABI encoded: ${abiEncoded}`);
console.log(`Hashlock: ${hashFromAbi}`);
console.log(`Match: ${hashFromAbi === expectedHashlock}`);

// Метод 5: Прямое использование строки как байтов
try {
  const directBytes = ethers.getBytes(preimage);
  const hashFromDirect = ethers.keccak256(directBytes);
  console.log("\nMethod 5: Direct bytes");
  console.log(`Direct bytes: ${ethers.hexlify(directBytes)}`);
  console.log(`Hashlock: ${hashFromDirect}`);
  console.log(`Match: ${hashFromDirect === expectedHashlock}`);
} catch (error) {
  console.log("\nMethod 5: Direct bytes - Error:", error.message);
}

// Метод 6: Использование известного прообраза для известного хэшлока
console.log("\nMethod 6: Known preimage for hashlock");
console.log(`For hashlock ${expectedHashlock}, try using preimage "secret" directly in the contract`);
console.log(`The contract might be using a different encoding method internally.`);

// Метод 7: Использование строки "secret" в шестнадцатеричном формате
const hexSecret = "0x736563726574"; // "secret" в hex
const hashFromHexSecret = ethers.keccak256(hexSecret);
console.log("\nMethod 7: Hex representation of 'secret'");
console.log(`Hex 'secret': ${hexSecret}`);
console.log(`Hashlock: ${hashFromHexSecret}`);
console.log(`Match: ${hashFromHexSecret === expectedHashlock}`);

console.log("\nSummary:");
console.log(`Expected hashlock: ${expectedHashlock}`);
console.log(`None of the standard methods match the expected hashlock.`);
console.log(`The hashlock was likely generated using a custom method or a different preimage.`);
