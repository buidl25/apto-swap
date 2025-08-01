const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const TestEvmToken = await ethers.getContractFactory("TestEvmToken");
  const token = await TestEvmToken.deploy();
  // В ethers.js v6 используем waitForDeployment() вместо deployed()
  await token.waitForDeployment();

  // В ethers.js v6 используем getAddress() вместо свойства address
  const tokenAddress = await token.getAddress();
  console.log("TestEvmToken deployed to:", tokenAddress);

  // Сохраняем адрес токена в JSON файл
  const filePath = path.join(__dirname, "vars", "evm-token-address.json");
  const jsonContent = JSON.stringify({
    "evm-token-address": tokenAddress
  }, null, 4);

  const filePathBackend = path.join(__dirname, "../be/vars", "evm-token-address.json");
  const jsonContentBackend = JSON.stringify({
    "evm-token-address": tokenAddress
  }, null, 4);

  // Убедимся, что директория vars существует
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }

  const varsDirBackend = path.join(__dirname, "../be/vars");
  if (!fs.existsSync(varsDirBackend)) {
    fs.mkdirSync(varsDirBackend, { recursive: true });
  }

  fs.writeFileSync(filePath, jsonContent);
  console.log(`Token address saved to ${filePath}`);

  fs.writeFileSync(filePathBackend, jsonContentBackend);
  console.log(`Token address saved to ${filePathBackend}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});