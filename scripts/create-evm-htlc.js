/**
 * Create an HTLC on the EVM side
 * 
 * This script creates a Hashed Timelock Contract (HTLC) on the EVM chain
 * to lock tokens for a cross-chain swap.
 */

const hre = require("hardhat");
const crypto = require("crypto");
require("dotenv").config();

async function main() {
  const [sender] = await hre.ethers.getSigners();
  console.log("Creating HTLC with account:", sender.address);
  
  // Get parameters from environment variables or use defaults
  const tokenAddress = process.env.EVM_TOKEN_ADDRESS;
  const htlcAddress = process.env.EVM_HTLC_ADDRESS;
  const amount = process.env.AMOUNT || "10";
  const recipient = process.env.EVM_RECIPIENT || sender.address;
  
  // Generate or use hashlock and timelock
  const preimage = process.env.PREIMAGE || "secret";
  
  // Создаем хэшлок так же, как это делается в контракте: keccak256(abi.encodePacked(preimage))
  // В функции withdraw контракта: require(keccak256(abi.encodePacked(preimage)) == htlc.hashlock)
  
  // В Solidity abi.encodePacked для строки преобразует её в UTF-8 байты
  // В JS мы используем ethers.toUtf8Bytes для такого же преобразования
  const preimageBytes = hre.ethers.toUtf8Bytes(preimage);
  const hashlock = hre.ethers.keccak256(preimageBytes);
  
  // Для отладки
  console.log(`Preimage: ${preimage}`);
  console.log(`UTF-8 bytes: ${hre.ethers.hexlify(preimageBytes)}`);
  console.log(`Generated hashlock: ${hashlock}`);
  
  // Для сравнения с фиксированным хэшлоком
  const expectedHashlock = "0x2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
  console.log(`Expected hashlock: ${expectedHashlock}`);
  console.log(`Match: ${hashlock === expectedHashlock}`);
  
  // Если хэшлоки не совпадают, используем вычисленный хэшлок
  // Это гарантирует, что мы сможем вывести средства с тем же прообразом
  
  // Для реального использования мы бы использовали что-то вроде:
  // const preimageBytes = hre.ethers.toUtf8Bytes(preimage);
  // const hashlock = process.env.HASHLOCK || hre.ethers.keccak256(preimageBytes);
  
  // Timelock is 30 minutes from now if not specified
  const currentTime = Math.floor(Date.now() / 1000);
  const timelock = process.env.TIMELOCK ? 
    parseInt(process.env.TIMELOCK) + currentTime : 
    currentTime + 1800; // 30 minutes
  
  if (!tokenAddress || !htlcAddress) {
    console.error("Error: EVM_TOKEN_ADDRESS or EVM_HTLC_ADDRESS not set in environment variables");
    process.exit(1);
  }
  
  console.log("\n=== Creating EVM HTLC ===");
  console.log(`Token: ${tokenAddress}`);
  console.log(`HTLC Contract: ${htlcAddress}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Amount: ${amount} tokens`);
  console.log(`Hashlock: ${hashlock}`);
  console.log(`Timelock: ${timelock} (${new Date(timelock * 1000).toLocaleString()})`);
  console.log(`Preimage (secret): ${preimage}`);
  
  // Connect to the token contract
  const token = await hre.ethers.getContractAt("TestEvmToken", tokenAddress);
  
  // Connect to the HTLC contract
  const htlc = await hre.ethers.getContractAt("EthereumHTLC", htlcAddress);
  
  // Approve the HTLC contract to spend tokens
  console.log("\nApproving tokens...");
  const amountWei = hre.ethers.parseUnits(amount);
  const approveTx = await token.approve(htlcAddress, amountWei);
  await approveTx.wait();
  console.log(`Approved ${amount} tokens for HTLC contract`);
  
  // Create the HTLC
  console.log("\nCreating HTLC...");
  try {
    const createTx = await htlc.createHTLC(
      recipient,
      tokenAddress,
      amountWei,
      hashlock,
      timelock
    );
    
    console.log(`Transaction hash: ${createTx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    const receipt = await createTx.wait();
    console.log("Transaction confirmed!");
    
    // Debug information
    console.log("\nTransaction receipt:");
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
    console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    
    // Получаем ID контракта из события или вычисляем его так же, как в контракте
    // В контракте: contractId = keccak256(abi.encodePacked(msg.sender, recipient, token, amount, hashlock, timelock))
    const contractId = hre.ethers.keccak256(
      hre.ethers.solidityPacked(
        ["address", "address", "address", "uint256", "bytes32", "uint256"],
        [sender.address, recipient, tokenAddress, amountWei, hashlock, timelock]
      )
    );
    
    console.log(`\nHTLC created successfully!`);
    console.log(`Contract ID: ${contractId}`);
    console.log(`\nSave this information to use when withdrawing:`);
    console.log(`CONTRACT_ID=${contractId}`);
    console.log(`PREIMAGE=${preimage}`);
    
    // Save to a file for easy access later
    const fs = require('fs');
    const path = require('path');
    const evmHtlcDetails = {
      contractId,
      preimage,
      sender: sender.address,
      recipient,
      token: tokenAddress,
      amount: amount,
      hashlock, // Сохраняем реальный хэшлок вместо нулей
      timelock,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'vars', 'evm-htlc-details.json'),
      JSON.stringify(evmHtlcDetails, null, 2)
    );
    console.log("EVM HTLC details saved to scripts/vars/evm-htlc-details.json");
    
  } catch (error) {
    console.error("Error creating HTLC:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
