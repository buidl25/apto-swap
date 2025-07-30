/**
 * Тестирование различных способов кодирования прообраза для EVM HTLC
 * 
 * Этот скрипт тестирует различные способы кодирования прообраза "secret"
 * и проверяет, какой из них дает хэшлок, соответствующий ожидаемому значению
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Тестирование кодирования прообраза для EVM HTLC ===\n");
  
  // Получаем данные HTLC из файла
  const htlcDetailsPath = path.join(__dirname, "vars", "evm-htlc-details.json");
  const htlcDetails = JSON.parse(fs.readFileSync(htlcDetailsPath, "utf8"));
  
  const preimage = htlcDetails.preimage || "secret";
  const expectedHashlock = htlcDetails.hashlock;
  
  console.log(`Прообраз: "${preimage}"`);
  console.log(`Ожидаемый хэшлок: ${expectedHashlock}\n`);
  
  // Тест 1: UTF-8 байты
  const utf8Bytes = hre.ethers.toUtf8Bytes(preimage);
  const hashFromUtf8 = hre.ethers.keccak256(utf8Bytes);
  console.log("Метод 1: UTF-8 байты");
  console.log(`UTF-8 байты: ${hre.ethers.hexlify(utf8Bytes)}`);
  console.log(`Хэшлок: ${hashFromUtf8}`);
  console.log(`Совпадение: ${hashFromUtf8 === expectedHashlock}`);
  
  // Тест 2: Bytes32 String
  const bytes32String = hre.ethers.encodeBytes32String(preimage);
  const hashFromBytes32 = hre.ethers.keccak256(bytes32String);
  console.log("\nМетод 2: Bytes32 String");
  console.log(`Bytes32: ${bytes32String}`);
  console.log(`Хэшлок: ${hashFromBytes32}`);
  console.log(`Совпадение: ${hashFromBytes32 === expectedHashlock}`);
  
  // Тест 3: Дополненные нулями UTF-8 байты
  const paddedBytes = hre.ethers.zeroPadBytes(utf8Bytes, 32);
  const hashFromPadded = hre.ethers.keccak256(paddedBytes);
  console.log("\nМетод 3: Дополненные нулями UTF-8 байты");
  console.log(`Дополненные байты: ${hre.ethers.hexlify(paddedBytes)}`);
  console.log(`Хэшлок: ${hashFromPadded}`);
  console.log(`Совпадение: ${hashFromPadded === expectedHashlock}`);
  
  // Тест 4: Строка в шестнадцатеричном формате
  const hexString = "0x" + Buffer.from(preimage).toString("hex");
  const hashFromHex = hre.ethers.keccak256(hexString);
  console.log("\nМетод 4: Строка в шестнадцатеричном формате");
  console.log(`Hex строка: ${hexString}`);
  console.log(`Хэшлок: ${hashFromHex}`);
  console.log(`Совпадение: ${hashFromHex === expectedHashlock}`);
  
  // Тест 5: ABI кодирование строки
  const abiCoder = hre.ethers.AbiCoder.defaultAbiCoder();
  const abiEncoded = abiCoder.encode(["string"], [preimage]);
  const hashFromAbi = hre.ethers.keccak256(abiEncoded);
  console.log("\nМетод 5: ABI кодирование строки");
  console.log(`ABI encoded: ${abiEncoded}`);
  console.log(`Хэшлок: ${hashFromAbi}`);
  console.log(`Совпадение: ${hashFromAbi === expectedHashlock}`);
  
  // Тест 6: Прямое использование строки как байтов
  try {
    const directBytes = hre.ethers.getBytes(preimage);
    const hashFromDirect = hre.ethers.keccak256(directBytes);
    console.log("\nМетод 6: Прямое использование строки как байтов");
    console.log(`Прямые байты: ${hre.ethers.hexlify(directBytes)}`);
    console.log(`Хэшлок: ${hashFromDirect}`);
    console.log(`Совпадение: ${hashFromDirect === expectedHashlock}`);
  } catch (error) {
    console.log("\nМетод 6: Прямое использование строки как байтов - Ошибка:", error.message);
  }
  
  // Тест 7: Использование байтов в формате bytes32
  try {
    // Преобразуем строку в байты, затем в bytes32
    const bytes = hre.ethers.getBytes("0x" + Buffer.from(preimage).toString("hex"));
    const bytes32Value = hre.ethers.hexlify(hre.ethers.zeroPadBytes(bytes, 32));
    const hashFromBytes32Value = hre.ethers.keccak256(bytes32Value);
    console.log("\nМетод 7: Использование байтов в формате bytes32");
    console.log(`Bytes32 значение: ${bytes32Value}`);
    console.log(`Хэшлок: ${hashFromBytes32Value}`);
    console.log(`Совпадение: ${hashFromBytes32Value === expectedHashlock}`);
  } catch (error) {
    console.log("\nМетод 7: Использование байтов в формате bytes32 - Ошибка:", error.message);
  }
  
  // Тест 8: Использование строки "secret" в шестнадцатеричном формате
  const hexSecret = "0x736563726574"; // "secret" в hex
  const hashFromHexSecret = hre.ethers.keccak256(hexSecret);
  console.log("\nМетод 8: Hex представление 'secret'");
  console.log(`Hex 'secret': ${hexSecret}`);
  console.log(`Хэшлок: ${hashFromHexSecret}`);
  console.log(`Совпадение: ${hashFromHexSecret === expectedHashlock}`);
  
  // Тест 9: Использование строки "secret" в шестнадцатеричном формате с дополнением нулями
  const paddedHexSecret = hre.ethers.hexlify(hre.ethers.zeroPadBytes(hre.ethers.getBytes(hexSecret), 32));
  const hashFromPaddedHexSecret = hre.ethers.keccak256(paddedHexSecret);
  console.log("\nМетод 9: Дополненное нулями hex представление 'secret'");
  console.log(`Дополненный hex 'secret': ${paddedHexSecret}`);
  console.log(`Хэшлок: ${hashFromPaddedHexSecret}`);
  console.log(`Совпадение: ${hashFromPaddedHexSecret === expectedHashlock}`);
  
  // Тест 10: Использование строки "secret" в формате bytes32 с правильным выравниванием
  const rightAlignedBytes32 = hre.ethers.hexlify(
    hre.ethers.concat([
      new Uint8Array(32 - utf8Bytes.length).fill(0),
      utf8Bytes
    ])
  );
  const hashFromRightAligned = hre.ethers.keccak256(rightAlignedBytes32);
  console.log("\nМетод 10: Строка 'secret' в формате bytes32 с правильным выравниванием");
  console.log(`Выровненный bytes32: ${rightAlignedBytes32}`);
  console.log(`Хэшлок: ${hashFromRightAligned}`);
  console.log(`Совпадение: ${hashFromRightAligned === expectedHashlock}`);
  
  console.log("\n=== Результаты тестирования ===");
  console.log(`Ожидаемый хэшлок: ${expectedHashlock}`);
  
  // Проверяем, нашли ли мы совпадение
  if (hashFromUtf8 === expectedHashlock) {
    console.log("Метод 1 (UTF-8 байты) дает правильный хэшлок!");
  } else if (hashFromBytes32 === expectedHashlock) {
    console.log("Метод 2 (Bytes32 String) дает правильный хэшлок!");
  } else if (hashFromPadded === expectedHashlock) {
    console.log("Метод 3 (Дополненные нулями UTF-8 байты) дает правильный хэшлок!");
  } else if (hashFromHex === expectedHashlock) {
    console.log("Метод 4 (Строка в шестнадцатеричном формате) дает правильный хэшлок!");
  } else if (hashFromAbi === expectedHashlock) {
    console.log("Метод 5 (ABI кодирование строки) дает правильный хэшлок!");
  } else if (hashFromHexSecret === expectedHashlock) {
    console.log("Метод 8 (Hex представление 'secret') дает правильный хэшлок!");
  } else if (hashFromPaddedHexSecret === expectedHashlock) {
    console.log("Метод 9 (Дополненное нулями hex представление 'secret') дает правильный хэшлок!");
  } else if (hashFromRightAligned === expectedHashlock) {
    console.log("Метод 10 (Строка 'secret' в формате bytes32 с правильным выравниванием) дает правильный хэшлок!");
  } else {
    console.log("Ни один из методов не дает правильный хэшлок!");
    console.log("Возможно, хэшлок был сгенерирован с использованием другого прообраза или другого метода кодирования.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
