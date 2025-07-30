import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Deploying MockLOP contract...');

  const MockLOP = await ethers.getContractFactory('contracts/mocks/MockLOP.sol:MockLOP');
  const mockLOP = await MockLOP.deploy();
  await mockLOP.waitForDeployment();

  const mockAddress = await mockLOP.getAddress();
  console.log(`MockLOP deployed to: ${mockAddress}`);

  // Save the address for other scripts to use
  const varsDir = path.join(__dirname, 'vars');
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  const filePath = path.join(varsDir, 'mock-lop-address.json');
  fs.writeFileSync(filePath, JSON.stringify({ 'mock-lop-address': mockAddress }, null, 4));
  console.log(`MockLOP address saved to ${filePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
