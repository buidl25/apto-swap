/**
 * Interact with EscrowDst Contract - Refund Operation
 * 
 * This script provides functionality to refund from the EscrowDst contract
 * in the hackathon_clone module on Aptos blockchain
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

async function main() {
  console.log("\n=== Refunding from EscrowDst Contract ===\n");
  
  // Get the module address from environment or saved file
  let moduleAddress = process.env.APTOS_MODULE_ADDRESS;
  
  // Try to read from the saved file if not in environment
  if (!moduleAddress) {
    try {
      const addressFile = path.join(__dirname, "..", "vars", "hackathon-clone-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        moduleAddress = addressData["hackathon-clone-address"];
        console.log(`Loaded module address from file: ${moduleAddress}`);
      }
    } catch (error) {
      console.error("Error reading module address:", error.message);
    }
  }
  
  if (!moduleAddress) {
    console.error("Module address not found. Please set APTOS_MODULE_ADDRESS or deploy the contracts first.");
    process.exit(1);
  }
  
  await refundEscrow(moduleAddress);
}

/**
 * Функция для получения данных о созданных эскроу из событий блокчейна
 * 
 * @param {string} moduleAddress - адрес модуля
 * @param {string} orderHash - хеш ордера для фильтрации
 * @returns {Promise<Object>} - данные о созданном эскроу, включая deployed_at
 */
async function getEscrowCreationData(moduleAddress, orderHash) {
  console.log(`\nПолучение данных о созданном эскроу с orderHash: ${orderHash}...`);
  
  try {
    // Используем Aptos CLI для получения событий создания эскроу
    const eventType = `${moduleAddress}::escrow_dst::EscrowStore::created_events`;
    const command = `aptos event list --event-key ${eventType} --profile default`;
    
    console.log(`Выполнение команды: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    
    // Парсим JSON результат
    const events = JSON.parse(result);
    console.log(`Найдено ${events.length} событий создания эскроу`);
    
    // Ищем событие с нужным orderHash
    const targetEvent = events.find(event => {
      // Сравниваем order_hash в событии с искомым
      const eventOrderHash = Buffer.from(event.data.immutables.order_hash).toString('hex');
      const targetOrderHash = orderHash.startsWith('0x') ? orderHash.substring(2) : orderHash;
      return eventOrderHash === targetOrderHash;
    });
    
    if (!targetEvent) {
      console.error(`Не найдено событий создания эскроу с orderHash: ${orderHash}`);
      return null;
    }
    
    console.log(`Найдено событие создания эскроу с orderHash: ${orderHash}`);
    
    // Извлекаем данные о времени создания (deployed_at)
    const deployedAt = targetEvent.data.timelocks.deployed_at;
    console.log(`Извлечено значение deployed_at: ${deployedAt}`);
    
    return {
      deployedAt,
      contractId: targetEvent.data.contract_id,
      maker: targetEvent.data.maker,
      taker: targetEvent.data.taker,
      amount: targetEvent.data.amount,
      hashlock: targetEvent.data.hashlock,
      timelocks: targetEvent.data.timelocks
    };
  } catch (error) {
    console.error(`Ошибка при получении данных эскроу:`, error.message);
    return null;
  }
}

/**
 * Вычисляет ID контракта, аналогично функции compute_contract_id в Move
 * 
 * @param {string} orderHash - хеш ордера (vector<u8>)
 * @param {string} hashlock - хеш для блокировки (vector<u8>)
 * @param {string} maker - адрес создателя (address)
 * @param {string} recipient - адрес получателя (address)
 * @param {string} amount - сумма (u64)
 * @param {string} safetyDeposit - страховой депозит (u64)
 * @param {number} deployedAt - время создания эскроу (u64)
 * @param {string} withdrawalDelay - задержка для вывода (u64)
 * @param {string} publicWithdrawalDelay - задержка для публичного вывода (u64)
 * @param {string} cancellationDelay - задержка для отмены (u64)
 * @returns {string} - хеш контракта
 */
function computeContractId(orderHash, hashlock, maker, recipient, amount, safetyDeposit, deployedAt, withdrawalDelay, publicWithdrawalDelay, cancellationDelay) {
  // Используем crypto для вычисления SHA3-256 хеша
  const crypto = require('crypto');
  
  // Функция для сериализации u64 в формате BCS
  function serializeU64(value) {
    // Преобразуем строку или число в BigInt
    const bigIntValue = BigInt(value);
    
    // Создаем буфер для 8 байт (u64)
    const buffer = Buffer.alloc(8);
    
    // Записываем значение в буфер в little-endian формате (как в BCS)
    buffer.writeBigUInt64LE(bigIntValue);
    
    return buffer;
  }
  
  // Функция для сериализации адреса в формате BCS
  function serializeAddress(address) {
    // Удаляем префикс 0x, если он есть
    const cleanAddress = address.startsWith('0x') ? address.substring(2) : address;
    
    // Преобразуем hex строку в буфер
    return Buffer.from(cleanAddress, 'hex');
  }
  
  // Собираем все данные в один буфер
  let data = Buffer.from(orderHash.startsWith('0x') ? orderHash.substring(2) : orderHash, 'hex');
  data = Buffer.concat([data, Buffer.from(hashlock.startsWith('0x') ? hashlock.substring(2) : hashlock, 'hex')]);
  
  // Добавляем адреса
  data = Buffer.concat([data, serializeAddress(maker)]);
  data = Buffer.concat([data, serializeAddress(recipient)]);
  
  // Добавляем числовые параметры
  data = Buffer.concat([data, serializeU64(amount)]);
  data = Buffer.concat([data, serializeU64(safetyDeposit)]);
  
  // Добавляем timelocks с использованием переданного значения deployedAt
  // Это значение должно быть точно таким же, как было установлено при создании эскроу
  data = Buffer.concat([data, serializeU64(deployedAt)]);
  data = Buffer.concat([data, serializeU64(withdrawalDelay)]);
  data = Buffer.concat([data, serializeU64(publicWithdrawalDelay)]);
  data = Buffer.concat([data, serializeU64(cancellationDelay)]);
  
  // Вычисляем SHA3-256 хеш
  const hash = crypto.createHash('sha3-256').update(data).digest('hex');
  
  return '0x' + hash;
}

/**
 * Refund an escrow in EscrowDst contract
 */
async function refundEscrow(moduleAddress) {
  const orderHash = process.env.ORDER_HASH;
  if (!orderHash) {
    console.error("ORDER_HASH is required for refund. Please set it in .env file.");
    process.exit(1);
  }

  // Вычисляем hashlock из preimage или используем заданный
  let hashlock = process.env.HASHLOCK;
  const preimage = process.env.PREIMAGE;
  if (preimage && !hashlock) {
    const crypto = require('crypto');
    hashlock = '0x' + crypto.createHash('sha3-256').update(Buffer.from(preimage, 'hex')).digest('hex');
    console.log(`Вычисленный hashlock из preimage: ${hashlock}`);
  } else if (!hashlock) {
    console.error("HASHLOCK или PREIMAGE требуется для refund. Пожалуйста, задайте один из них в .env файле.");
    process.exit(1);
  }

  // Получаем адрес получателя из профиля Aptos CLI
  console.log("Получение адреса получателя из профиля Aptos CLI...");
  const recipientProfile = process.env.RECIPIENT_PROFILE || "recipient";
  const recipientCommand = `aptos account lookup-address --profile ${recipientProfile}`;
  const recipientAddress = execSync(recipientCommand, { encoding: 'utf8' }).trim();
  console.log(`Адрес получателя: ${recipientAddress}`);

  // Получаем адрес создателя из профиля Aptos CLI
  console.log("Получение адреса создателя из профиля Aptos CLI...");
  const makerProfile = process.env.MAKER_PROFILE || "default";
  const makerCommand = `aptos account lookup-address --profile ${makerProfile}`;
  const makerAddress = execSync(makerCommand, { encoding: 'utf8' }).trim();
  console.log(`Адрес создателя: ${makerAddress}`);

  // Получаем параметры из .env или используем значения по умолчанию
  const amount = process.env.AMOUNT || "0.01";
  const safetyDeposit = process.env.SAFETY_DEPOSIT || "0";
  const withdrawalDelay = process.env.WITHDRAWAL_DELAY || "0";
  const publicWithdrawalDelay = process.env.PUBLIC_WITHDRAWAL_DELAY || "3600";
  const cancellationDelay = process.env.CANCELLATION_DELAY || "7200";

  // Получаем данные о созданном эскроу из блокчейна
  console.log("Получение данных о созданном эскроу из блокчейна...");
  const escrowData = await getEscrowCreationData(moduleAddress, orderHash);
  
  let escrowId;
  
  if (!escrowData) {
    console.error("Не удалось получить данные о созданном эскроу. Используем резервный метод.");
    // Если не удалось получить данные, пробуем использовать сохраненный в файле deployed_at
    let deployedAt;
    try {
      const escrowDataFile = path.join(__dirname, "..", "vars", "escrow-data.json");
      if (fs.existsSync(escrowDataFile)) {
        const savedData = JSON.parse(fs.readFileSync(escrowDataFile, 'utf8'));
        deployedAt = savedData.deployedAt;
        console.log(`Загружено deployed_at из файла: ${deployedAt}`);
      } else {
        // Если нет файла, используем текущее время как запасной вариант
        deployedAt = Math.floor(Date.now() / 1000) - 3600; // Предполагаем, что эскроу было создано примерно час назад
        console.log(`Используем резервное значение deployed_at: ${deployedAt}`);
      }
    } catch (error) {
      deployedAt = Math.floor(Date.now() / 1000) - 3600;
      console.log(`Ошибка при чтении файла, используем резервное значение: ${deployedAt}`);
    }
    
    // Вычислить ID контракта используя функцию computeContractId и резервное значение deployed_at
    escrowId = computeContractId(
      orderHash,
      hashlock,
      makerAddress,
      recipientAddress,
      amount,
      safetyDeposit,
      deployedAt,
      withdrawalDelay,
      publicWithdrawalDelay,
      cancellationDelay
    );
    console.log(`Вычисленный ID контракта с резервным значением deployed_at: ${escrowId}`);
  } else {
    // Используем полученные данные для вычисления ID контракта
    console.log(`Используем полученное значение deployed_at: ${escrowData.deployedAt}`);
    
    // Вычислить ID контракта используя функцию computeContractId и полученное значение deployed_at
    escrowId = computeContractId(
      orderHash,
      hashlock,
      makerAddress,
      recipientAddress,
      amount,
      safetyDeposit,
      escrowData.deployedAt,
      withdrawalDelay,
      publicWithdrawalDelay,
      cancellationDelay
    );
    console.log(`Вычисленный ID контракта с полученным значением deployed_at: ${escrowId}`);
    
    // Сравниваем с ID из события
    if (escrowData.contractId) {
      console.log(`ID контракта из события: ${escrowData.contractId}`);
      if (escrowId === escrowData.contractId) {
        console.log(`✅ ID контракта совпадает с ID из события!`);
      } else {
        console.log(`❌ ID контракта НЕ совпадает с ID из события. Используем ID из события.`);
        // Используем ID из события, если он не совпадает с вычисленным
        escrowId = escrowData.contractId;
      }
    }
  }

  console.log(`Итоговый ID контракта для refund: ${escrowId}`);

  // Выполняем refund
  console.log("\nВыполнение refund из эскроу...");
  const refundCommand = `aptos move run \
    --function-id ${moduleAddress}::escrow_dst::refund \
    --type-args 0x1::aptos_coin::AptosCoin \
    --args hex:${escrowId.startsWith('0x') ? escrowId.substring(2) : escrowId} \
    --profile ${makerProfile} \
    --assume-yes`;

  console.log(`\nExecuting: ${refundCommand}`);
  try {
    const result = execSync(refundCommand, { encoding: 'utf8' });
    console.log("Результат:");
    console.log(result);
    console.log("\n✅ Успешно выполнен refund из эскроу!");
  } catch (error) {
    console.error("❌ Ошибка при выполнении refund из эскроу:");
    console.error(error.message);
    process.exit(1);
  }
}

// Execute the main function and handle errors
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
