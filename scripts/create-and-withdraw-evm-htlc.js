/**
 * Создание и вывод средств из EVM HTLC в одном скрипте
 * для проверки правильности кодирования прообраза
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = hre;
const { formatEther, parseEther } = ethers;

async function main() {
  console.log("=== Создание и вывод средств из EVM HTLC ===\n");
  
  // Получаем аккаунты
  const [deployer] = await ethers.getSigners();
  console.log(`Используем аккаунт: ${deployer.address}\n`);
  
  // Получаем контракты
  const htlcFactory = await ethers.getContractFactory("EthereumHTLC");
  const tokenFactory = await ethers.getContractFactory("ERC20Mock");
  
  // Адреса развернутых контрактов
  const htlcAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
  const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  const htlc = htlcFactory.attach(htlcAddress);
  const token = tokenFactory.attach(tokenAddress);
  
  console.log(`HTLC контракт: ${htlcAddress}`);
  console.log(`ERC20 токен: ${tokenAddress}\n`);
  
  // Параметры HTLC
  const preimage = "secret";
  const recipient = deployer.address; // Для тестирования используем тот же адрес
  const amount = parseEther("10");
  
  // Вычисляем хэшлок от прообраза
  // Сначала преобразуем прообраз в bytes32
  const preimageBytes32 = ethers.encodeBytes32String(preimage);
  // Используем keccak256 для вычисления хэшлока
  const hashlock = ethers.keccak256(preimageBytes32);
  
  console.log(`Прообраз: ${preimage}`);
  console.log(`Прообраз в bytes32: ${preimageBytes32}`);
  console.log(`Хэшлок: ${hashlock}\n`);
  
  // Устанавливаем таймлок на 24 часа
  const timelock = Math.floor(Date.now() / 1000) + 86400;
  
  // Проверяем баланс токенов
  const balance = await token.balanceOf(deployer.address);
  console.log(`Баланс токенов: ${formatEther(balance)}\n`);
  
  // Одобряем перевод токенов на контракт HTLC
  console.log("Одобряем перевод токенов...");
  const approveTx = await token.approve(htlcAddress, amount);
  await approveTx.wait();
  console.log("Токены одобрены для перевода\n");
  
  // Создаем новый HTLC
  console.log("Создаем новый HTLC...");
  const createTx = await htlc.createHTLC(recipient, tokenAddress, amount, hashlock, timelock);
  const createReceipt = await createTx.wait();
  
  // Получаем ID контракта из события
  const htlcCreatedEvent = createReceipt.logs.find(
    (log) => log.fragment && log.fragment.name === "HTLCCreated"
  );
  
  if (!htlcCreatedEvent) {
    throw new Error("Событие HTLCCreated не найдено в логах транзакции");
  }
  
  const contractId = htlcCreatedEvent.args[0];
  console.log(`HTLC создан с ID: ${contractId}`);
  
  // Сохраняем детали HTLC в файл
  const htlcDetailsPath = path.join(__dirname, "vars", "evm-htlc-details.json");
  const htlcDetails = {
    contractId: contractId,
    preimage: preimage,
    hashlock: hashlock,
    sender: deployer.address,
    recipient: recipient,
    amount: amount.toString(),
    timelock: timelock,
    token: tokenAddress,
  };
  
  // Создаем директорию, если она не существует
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  
  fs.writeFileSync(htlcDetailsPath, JSON.stringify(htlcDetails, null, 2));
  console.log(`Детали HTLC сохранены в ${htlcDetailsPath}`);
  
  // Получаем данные HTLC из контракта
  console.log("Получаем данные HTLC...");
  const htlcData = await htlc.contracts(contractId);
  console.log(`Данные HTLC:
Отправитель: ${htlcData.sender}
Получатель: ${htlcData.recipient}
Токен: ${htlcData.token}
Сумма: ${formatEther(htlcData.amount)} токенов
Хэшлок: ${htlcData.hashlock}
Таймлок: ${Number(htlcData.timelock)} (${new Date(Number(htlcData.timelock) * 1000).toLocaleString()})
Выведено: ${htlcData.withdrawn}
Возвращено: ${htlcData.refunded}\n`);
  
  // Проверяем, что хэшлок совпадает
  if (htlcData.hashlock !== hashlock) {
    console.error(`ОШИБКА: Хэшлок в контракте (${htlcData.hashlock}) не совпадает с ожидаемым (${hashlock})`);
    return;
  }
  
  // Проверяем, что контракт существует и не выведен
  if (htlcData.sender === ethers.ZeroAddress) {
    console.error("ОШИБКА: Контракт не существует");
    return;
  }
  
  if (htlcData.withdrawn) {
    console.error("ОШИБКА: Средства уже выведены");
    return;
  }
  
  // Ждем 2 секунды перед выводом средств
  console.log("Ждем 2 секунды перед выводом средств...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  // Выводим средства из HTLC
  console.log("\n=== Выводим средства из HTLC ===");
  console.log(`Контракт ID: ${contractId}`);
  console.log(`Прообраз: ${preimage}`);
  console.log("Выводим средства из HTLC...");
  
  try {
    // Проверяем, что хэшлок совпадает
    // Сначала преобразуем прообраз в bytes32
    const preimageBytes32 = ethers.encodeBytes32String(preimage);
    // Используем keccak256 для вычисления хэшлока
    const calculatedHashlock = ethers.keccak256(preimageBytes32);
    
    if (calculatedHashlock !== htlcData.hashlock) {
      console.log(`Хэшлок от прообраза: ${calculatedHashlock}`);
      console.log(`Хэшлок в контракте: ${htlcData.hashlock}`);
      throw new Error("Хэшлок не совпадает с ожидаемым");
    }
    
    console.log(`Прообраз в bytes32: ${preimageBytes32}`);
    console.log(`Хэшлок от прообраза: ${calculatedHashlock}`);
    console.log(`Хэшлок в контракте: ${htlcData.hashlock}`);
    
    // Вызываем функцию withdraw с правильным прообразом
    const withdrawTx = await htlc.withdraw(contractId, preimageBytes32);
    await withdrawTx.wait();
    
    console.log("Средства успешно выведены!");
    
    // Проверяем баланс после вывода
    const balanceAfter = await token.balanceOf(deployer.address);
    console.log(`Баланс после вывода: ${formatEther(balanceAfter)} токенов`);
  } catch (error) {
    console.log(`Ошибка при выводе средств: ${error.message}`);
    htlcDetails.lastError = error.message;
    fs.writeFileSync(htlcDetailsPath, JSON.stringify(htlcDetails, null, 2));
    console.log(`Детали ошибки сохранены в ${htlcDetailsPath}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
