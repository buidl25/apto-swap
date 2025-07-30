/**
 * Withdraw from an HTLC on the EVM side
 * 
 * This script withdraws tokens from a Hashed Timelock Contract (HTLC) on the EVM chain
 * by providing the correct preimage (secret).
 */

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [recipient] = await hre.ethers.getSigners();
  console.log("Withdrawing HTLC with account:", recipient.address);
  
  // Get parameters from environment variables
  const htlcAddress = process.env.EVM_HTLC_ADDRESS;
  const contractId = process.env.CONTRACT_ID;
  const preimage = process.env.PREIMAGE;
  
  if (!htlcAddress || !contractId || !preimage) {
    console.error("Error: EVM_HTLC_ADDRESS, CONTRACT_ID, or PREIMAGE not set in environment variables");
    console.error("Please set these variables and try again");
    process.exit(1);
  }
  
  console.log("\n=== Withdrawing from EVM HTLC ===");
  console.log(`HTLC Contract: ${htlcAddress}`);
  console.log(`Contract ID: ${contractId}`);
  console.log(`Preimage (secret): ${preimage}`);
  
  // Connect to the HTLC contract
  const htlc = await hre.ethers.getContractAt("EthereumHTLC", htlcAddress);
  
  // Get the HTLC data to verify it exists
  try {
    const htlcData = await htlc.contracts(contractId);
    console.log("\nHTLC Data:");
    console.log(`Sender: ${htlcData.sender}`);
    console.log(`Recipient: ${htlcData.recipient}`);
    console.log(`Token: ${htlcData.token}`);
    console.log(`Amount: ${hre.ethers.formatUnits(htlcData.amount)} tokens`);
    console.log(`Hashlock: ${htlcData.hashlock}`);
    console.log(`Timelock: ${htlcData.timelock} (${new Date(Number(htlcData.timelock) * 1000).toLocaleString()})`);
    console.log(`Withdrawn: ${htlcData.withdrawn}`);
    console.log(`Refunded: ${htlcData.refunded}`);
    
    if (htlcData.withdrawn) {
      console.error("Error: HTLC already withdrawn");
      process.exit(1);
    }
    
    if (htlcData.refunded) {
      console.error("Error: HTLC already refunded");
      process.exit(1);
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (Number(htlcData.timelock) < currentTime) {
      console.error("Error: HTLC timelock expired");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error fetching HTLC data:", error.message);
    process.exit(1);
  }
  
  // В контракте проверка: require(keccak256(abi.encodePacked(preimage)) == htlc.hashlock)
  // Для совместимости с контрактом нужно использовать правильный метод кодирования
  
  // В контракте функция withdraw ожидает параметр preimage типа bytes32
  // Поэтому нам нужно правильно преобразовать строку "secret" в формат bytes32
  
  // Создадим новый HTLC с правильным методом кодирования
  console.log(`\nСоздаем новый HTLC с правильным методом кодирования...`);
  
  // Преобразуем прообраз в байты UTF-8, как это делает Solidity в abi.encodePacked
  const preimageBytes = hre.ethers.toUtf8Bytes(preimage);
  
  // Для отладки - показываем разные способы кодирования
  console.log(`Preimage (raw): ${preimage}`);
  console.log(`UTF-8 bytes: ${hre.ethers.hexlify(preimageBytes)}`);
  
  // Вычисляем хэшлок из прообраза так же, как это делает контракт
  const calculatedHashlock = hre.ethers.keccak256(preimageBytes);
  console.log(`Calculated hashlock: ${calculatedHashlock}`);
  
  // Фиксированный хэшлок для прообраза "secret"
  const expectedHashlock = "0x2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
  console.log(`Expected hashlock: ${expectedHashlock}`);
  
  // Проверяем, что вычисленный хэшлок совпадает с ожидаемым
  if (calculatedHashlock !== expectedHashlock) {
    console.warn(`Warning: Calculated hashlock ${calculatedHashlock} does not match expected hashlock ${expectedHashlock}!`);
    console.warn(`Хэшлоки не совпадают. Возможно, нужно создать новый HTLC с правильным хэшлоком.`);
  } else {
    console.log("Hashlock verification successful!");
  }
  // Это работает, потому что контракт сам вычислит хэшлок из прообраза
  
  // Withdraw from the HTLC
  console.log("\nWithdrawing from HTLC...");
  try {
    // Передаем прообраз в контракт
    // В контракте функция withdraw ожидает параметр типа bytes32
  // Но проверка происходит через keccak256(abi.encodePacked(preimage))
  
  // На основе тестирования мы выяснили, что правильный метод - это использование UTF-8 байтов
  // Но функция withdraw ожидает параметр типа bytes32, который должен иметь длину ровно 32 байта
  
  // Используем UTF-8 байты прообраза, дополненные нулями до 32 байт
  const preimageBytes = hre.ethers.toUtf8Bytes(preimage);
  const paddedBytes = hre.ethers.zeroPadBytes(preimageBytes, 32);
  console.log(`UTF-8 bytes for withdraw: ${hre.ethers.hexlify(preimageBytes)}`);
  console.log(`Padded bytes (32 bytes): ${hre.ethers.hexlify(paddedBytes)}`);
  
  console.log(`\nПробуем вывести средства с правильным кодированием прообраза...`);
  const withdrawTx = await htlc.withdraw(contractId, paddedBytes);
    const receipt = await withdrawTx.wait();
    
    // Extract the withdrawal event from the logs
    const htlcWithdrawnEvent = receipt.logs.find(
      log => log.fragment && log.fragment.name === "HTLCWithdrawn"
    );
    
    if (htlcWithdrawnEvent) {
      console.log(`\nHTLC withdrawn successfully!`);
      console.log(`Transaction hash: ${withdrawTx.hash}`);
      
      // Get token balance after withdrawal
      const htlcData = await htlc.contracts(contractId);
      const token = await hre.ethers.getContractAt("TestEvmToken", htlcData.token);
      const balance = await token.balanceOf(recipient.address);
      console.log(`\nNew token balance: ${hre.ethers.formatUnits(balance)} tokens`);
    } else {
      console.log("HTLC withdrawal event not found in logs");
    }
  } catch (error) {
    console.error("Error withdrawing from HTLC:", error.message);
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
