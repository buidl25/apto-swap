// Этот скрипт использует ethers.js v6 напрямую, без интеграции hardhat-ethers
const fs = require("fs");
const path = require("path");
// Импортируем ethers v6 явно, чтобы избежать конфликтов с v5
const ethers6 = require("ethers");

async function main() {
  // Создаем провайдер для подключения к локальной ноде
  const provider = new ethers6.JsonRpcProvider("http://localhost:8545");
  
  // Получаем приватный ключ первого аккаунта (стандартный для hardhat)
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers6.Wallet(privateKey, provider);
  
  console.log("Deploying with account:", wallet.address);

  // Получаем артефакт контракта
  const artifactPath = path.join(__dirname, "../artifacts/contracts/TestEvmToken.sol/TestEvmToken.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("Contract artifact not found. Make sure you've compiled the contracts with 'npx hardhat compile'");
    process.exit(1);
  }
  
  const contractArtifact = JSON.parse(fs.readFileSync(artifactPath));
  
  // Создаем фабрику контракта
  const contractFactory = new ethers6.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );

  // Деплоим контракт
  console.log("Deploying TestEvmToken contract...");
  const token = await contractFactory.deploy();
  await token.deploymentTransaction().wait();
  
  const tokenAddress = await token.getAddress();
  console.log("TestEvmToken deployed to:", tokenAddress);
  
  // Сохраняем адрес токена в JSON файл
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  
  const filePath = path.join(varsDir, "evm-token-address.json");
  const jsonContent = JSON.stringify({
    "evm-token-address": tokenAddress
  }, null, 4);
  
  fs.writeFileSync(filePath, jsonContent);
  console.log(`Token address saved to ${filePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
