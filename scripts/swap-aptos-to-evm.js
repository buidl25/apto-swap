/**
 * Aptos to EVM Cross-Chain Swap
 * 
 * This script demonstrates swapping tokens from Aptos to EVM:
 * 1. Burns Aptos tokens on the source chain
 * 2. Transfers equivalent EVM tokens on the target chain
 */

const hre = require("hardhat");
const { execSync } = require("child_process");
const { AptosClient } = require("aptos");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Импортируем ethers v6 напрямую
const { ethers } = require("ethers");

// Получаем путь к токену Aptos из JSON файла или используем значение по умолчанию
let APTOS_TOKEN_MODULE_ADDRESS = "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
let APTOS_TOKEN_TYPE = "";

// Пытаемся прочитать адрес токена Aptos из файла JSON
try {
  const aptosTokenAddressFile = path.join(__dirname, "vars", "aptos-token-address.json");
  if (fs.existsSync(aptosTokenAddressFile)) {
    const aptosTokenData = JSON.parse(fs.readFileSync(aptosTokenAddressFile, 'utf8'));
    APTOS_TOKEN_TYPE = aptosTokenData["aptos-token-address"];
    // Извлекаем адрес модуля из полного пути токена
    APTOS_TOKEN_MODULE_ADDRESS = APTOS_TOKEN_TYPE.split("::")[0];
    console.log(`Загружен адрес токена Aptos из файла: ${APTOS_TOKEN_TYPE}`);
  }
} catch (error) {
  console.error("Ошибка при чтении файла адреса токена Aptos:", error.message);
}

// Если не удалось загрузить из файла, используем значение по умолчанию
if (!APTOS_TOKEN_TYPE) {
  APTOS_TOKEN_TYPE = `${APTOS_TOKEN_MODULE_ADDRESS}::test_aptos_token::TestAptosToken`;
  console.log(`Используется адрес токена Aptos по умолчанию: ${APTOS_TOKEN_TYPE}`);
}

async function main() {
  const aptosAmount = process.env.AMOUNT || "10"; // Default to 10 tokens if not specified
  const aptosSenderAddress = process.env.APTOS_SENDER || APTOS_TOKEN_MODULE_ADDRESS;
  
  // Get the EVM recipient from .env или используем первый аккаунт из hardhat
  let evmRecipientAddress;
  if (process.env.EVM_RECIPIENT_ADDRESS) {
    evmRecipientAddress = process.env.EVM_RECIPIENT_ADDRESS;
    console.log(`Используется получатель EVM из .env: ${evmRecipientAddress}`);
  } else {
    const [evmRecipient] = await hre.ethers.getSigners();
    evmRecipientAddress = await evmRecipient.getAddress(); // В ethers.js v6 используется метод getAddress()
    console.log(`Используется получатель EVM по умолчанию: ${evmRecipientAddress}`);
  }
  
  console.log("\n=== Aptos to EVM Cross-Chain Swap ===\n");
  console.log(`Aptos Sender: ${aptosSenderAddress}`);
  console.log(`EVM Recipient: ${evmRecipientAddress}`);
  console.log(`Amount: ${aptosAmount} tokens\n`);
  
  // Step 1: Connect to the EVM token contract
  const TestEvmToken = await hre.ethers.getContractFactory("TestEvmToken");
  
  // Получаем адрес токена из файла JSON или переменной окружения
  let tokenAddress = process.env.EVM_TOKEN_ADDRESS;
  
  if (!tokenAddress) {
    try {
      const tokenAddressFile = path.join(__dirname, "vars", "evm-token-address.json");
      if (fs.existsSync(tokenAddressFile)) {
        const tokenData = JSON.parse(fs.readFileSync(tokenAddressFile, 'utf8'));
        tokenAddress = tokenData["evm-token-address"];
        console.log(`Загружен адрес EVM токена из файла: ${tokenAddress}`);
      }
    } catch (error) {
      console.error("Ошибка при чтении файла адреса EVM токена:", error.message);
    }
  } else {
    console.log(`Используется адрес EVM токена из .env: ${tokenAddress}`);
  }
  
  if (!tokenAddress) {
    console.error("Error: EVM_TOKEN_ADDRESS environment variable is not set and token address file not found.");
    console.error("Please deploy the EVM token first with 'npm run deploy-evm-token' and set the address.");
    process.exit(1);
  }
  
  const token = TestEvmToken.attach(tokenAddress);
  console.log(`Connected to EVM token at: ${await token.getAddress()}`);
  
  // Step 2: Check Aptos token balance before swap
  const aptosBalanceBefore = await getAptosTokenBalance(aptosSenderAddress);
  console.log(`Aptos balance before swap: ${aptosBalanceBefore} tokens`);
  
  // Если токен не зарегистрирован, регистрируем его для отправителя
  if (aptosBalanceBefore === "0 (not registered)") {
    console.log("\nРегистрация токена для отправителя...");
    await registerAptosToken(aptosSenderAddress);
    
    // Проверяем баланс после регистрации
    const balanceAfterRegistration = await getAptosTokenBalance(aptosSenderAddress);
    console.log(`Aptos balance after registration: ${balanceAfterRegistration} tokens`);
    
    // Если баланс все еще 0, чеканим токены для отправителя
    if (balanceAfterRegistration === "0") {
      console.log("\nЧеканка токенов для отправителя...");
      await mintAptosTokens(aptosSenderAddress, aptosAmount);
      
      // Проверяем баланс после чеканки
      const balanceAfterMint = await getAptosTokenBalance(aptosSenderAddress);
      console.log(`Aptos balance after minting: ${balanceAfterMint} tokens`);
    }
  }
  
  // Step 3: Check EVM token balance before swap
  const evmBalanceBefore = await token.balanceOf(evmRecipientAddress);
  console.log(`EVM balance before swap: ${ethers.formatUnits(evmBalanceBefore)} tokens`);
  
  // Step 4: Burn Aptos tokens (simulating the cross-chain lock/burn)
  console.log("\nBurning Aptos tokens...");
  await burnAptosTokens(aptosSenderAddress, aptosAmount);
  
  // Step 5: Check Aptos balance after burn
  const aptosBalanceAfter = await getAptosTokenBalance(aptosSenderAddress);
  console.log(`Aptos balance after burn: ${aptosBalanceAfter} tokens`);
  
  // Step 6: Transfer equivalent tokens on EVM (simulating the cross-chain mint)
  console.log("\nTransferring equivalent tokens on EVM...");
  const amountWei = ethers.parseUnits(aptosAmount);
  
  try {
    // Получаем адрес владельца контракта (который имеет токены)
    const [owner] = await hre.ethers.getSigners();
    const ownerAddress = await owner.getAddress();
    
    // Проверяем баланс владельца
    const ownerBalance = await token.balanceOf(ownerAddress);
    console.log(`Owner balance: ${ethers.formatUnits(ownerBalance)} tokens`);
    
    // Проверяем баланс получателя перед переводом
    const recipientBalanceBefore = await token.balanceOf(evmRecipientAddress);
    console.log(`Recipient balance before transfer: ${ethers.formatUnits(recipientBalanceBefore)} tokens`);
    
    // Переводим токены от владельца к получателю
    console.log(`Transferring ${aptosAmount} tokens from ${ownerAddress} to ${evmRecipientAddress}...`);
    const transferTx = await token.transfer(evmRecipientAddress, amountWei);
    console.log(`Transaction hash: ${transferTx.hash}`);
    
    // Ждем подтверждения транзакции
    console.log("Waiting for transaction confirmation...");
    const receipt = await transferTx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Transferred ${aptosAmount} EVM tokens in transaction: ${transferTx.hash}`);
    
    // Step 7: Check EVM balance after transfer
    const evmBalanceAfter = await token.balanceOf(evmRecipientAddress);
    console.log(`EVM balance after transfer: ${ethers.formatUnits(evmBalanceAfter)} tokens`);
    
    // Проверяем баланс владельца после перевода
    const ownerBalanceAfter = await token.balanceOf(ownerAddress);
    console.log(`Owner balance after transfer: ${ethers.formatUnits(ownerBalanceAfter)} tokens`);
  } catch (error) {
    console.error("\nОшибка при переводе токенов EVM:", error.message);
    console.log("\nПроверьте, что локальный узел Ethereum запущен и доступен.");
    console.log("Вы можете запустить его с помощью команды: npx hardhat node");
  }
  
  console.log("\n=== Cross-Chain Swap Completed ===\n");
}

/**
 * Get the balance of TestAptosToken for a given address
 * @param {string} address - The Aptos account address
 * @returns {string} - The token balance or error message
 */
async function getAptosTokenBalance(address) {
  try {
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
    const resources = await client.getAccountResources(address);
    
    // Используем правильный тип токена TestAptosToken
    const coinStoreType = `0x1::coin::CoinStore<${APTOS_TOKEN_TYPE}>`;
    
    // Выводим все типы ресурсов для отладки
    console.log(`Ищем ресурс типа: ${coinStoreType}`);
    
    const coinResource = resources.find(r => r.type === coinStoreType);
    
    if (coinResource) {
      // Convert from smallest unit to standard unit (considering 9 decimals for Aptos token)
      const rawBalance = coinResource.data.coin.value;
      return parseInt(rawBalance) / 1000000000; // 9 decimals
    } else {
      // Проверяем, зарегистрирован ли токен
      try {
        // Проверяем баланс через Aptos CLI
        const balanceCommand = `aptos account list --account ${address} --query resources`;
        const result = execSync(balanceCommand, { encoding: 'utf8' });
        
        if (result.includes(APTOS_TOKEN_TYPE)) {
          return "0"; // Токен зарегистрирован, но баланс 0
        } else {
          return "0 (not registered)";
        }
      } catch (cliError) {
        console.error("Error checking registration via CLI:", cliError.message);
        return "0 (not registered)";
      }
    }
  } catch (error) {
    console.error("Error fetching Aptos balance:", error.message);
    return "Error";
  }
}

/**
 * Register TestAptosToken for an address
 * @param {string} address - The address to register the token for
 * @returns {Promise<boolean>} - True if registration was successful, false otherwise
 */
async function registerAptosToken(address) {
  try {
    const registerCommand = `aptos move run \
      --function-id 0x1::managed_coin::register \
      --type-args ${APTOS_TOKEN_TYPE} \
      --sender-account ${address} \
      --assume-yes \
      --profile default`;
    
    execSync(registerCommand, { stdio: 'inherit' });
    console.log("Регистрация токена успешна.");
    return true;
  } catch (error) {
    console.error("Ошибка при регистрации токена:", error.message);
    return false;
  }
}

/**
 * Mint TestAptosToken to an address
 * @param {string} toAddress - The address to mint tokens to
 * @param {string} amount - The amount to mint (in standard units)
 * @returns {Promise<boolean>} - True if minting was successful, false otherwise
 */
async function mintAptosTokens(toAddress, amount) {
  try {
    // Convert amount to Aptos token units (9 decimals)
    const aptosAmount = parseInt(amount) * 1000000000; // 9 decimals
    
    const mintCommand = `aptos move run \
      --function-id 0x1::managed_coin::mint \
      --type-args ${APTOS_TOKEN_TYPE} \
      --args address:${toAddress} u64:${aptosAmount} \
      --sender-account ${APTOS_TOKEN_MODULE_ADDRESS} \
      --assume-yes \
      --profile default`;
    
    execSync(mintCommand, { stdio: 'inherit' });
    console.log(`Чеканка ${amount} токенов для ${toAddress} успешна.`);
    return true;
  } catch (error) {
    console.error("Ошибка при чеканке токенов:", error.message);
    return false;
  }
}

/**
 * Burn TestAptosToken from a sender's address
 * @param {string} senderAddress - The sender's Aptos address
 * @param {string} amount - The amount to burn (in standard units)
 * @returns {Promise<boolean>} - True if burn was successful, false otherwise
 */
async function burnAptosTokens(senderAddress, amount) {
  try {
    // Convert amount to Aptos token units (9 decimals)
    const aptosAmount = parseInt(amount) * 1000000000; // 9 decimals
    
    // В реальной реализации это было бы сделано через контракт моста
    // Для этой демонстрации мы сжигаем токены, переводя их на мертвый адрес
    const deadAddress = "0xdead"; // Адрес для симуляции сжигания
    
    // Сначала регистрируем токен для мертвого адреса (чтобы получить сожженные токены)
    console.log("Регистрация токена для адреса сжигания...");
    try {
      const registerCommand = `aptos move run \
        --function-id 0x1::managed_coin::register \
        --type-args ${APTOS_TOKEN_TYPE} \
        --sender-account ${deadAddress} \
        --assume-yes \
        --profile default`;
      
      execSync(registerCommand, { stdio: 'inherit' });
      console.log("Регистрация успешна.");
    } catch (error) {
      console.warn("Регистрация не удалась, но продолжаем (возможно, уже зарегистрирован):", error.message);
    }
    
    // Сжигаем токены, переводя их на мертвый адрес
    console.log(`Сжигание ${amount} токенов с адреса ${senderAddress}...`);
    const burnCommand = `aptos move run \
      --function-id 0x1::coin::transfer \
      --type-args ${APTOS_TOKEN_TYPE} \
      --args address:${deadAddress} u64:${aptosAmount} \
      --sender-account ${senderAddress} \
      --assume-yes \
      --profile default`;
    
    execSync(burnCommand, { stdio: 'inherit' });
    console.log("Сжигание успешно.");
    return true;
  } catch (error) {
    console.error("Ошибка при сжигании токенов:", error.message);
    return false;
  }
}

// Execute the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });