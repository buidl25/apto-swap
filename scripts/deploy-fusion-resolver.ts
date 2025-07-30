/**
 * Deployment script for FusionResolver contract
 */

import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * Network-specific 1inch Limit Order Protocol addresses
 */
const LIMIT_ORDER_PROTOCOL_ADDRESSES: Record<number, string> = {
  1: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Ethereum Mainnet
  56: '0x1111111254EEB25477B68fb85Ed929f73A960582', // BSC
  137: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Polygon
  42161: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Arbitrum
  10: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Optimism
  43114: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Avalanche
  250: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Fantom
  100: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Gnosis
  8453: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Base
  31337: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Hardhat local (placeholder)
};

/**
 * Reads the deployed MockLOP address from the filesystem
 * @returns The address of the MockLOP contract, or null if not found
 */
function getMockLopAddress(): string | null {
  const filePath = path.join(__dirname, 'vars', 'mock-lop-address.json');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    return json['mock-lop-address'];
  }
  return null;
}

/**
 * Main deployment function
 */
async function main(): Promise<void> {
  try {
    console.log('Deploying FusionResolver contract...');
    
    // Get network ID
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    
    // Get LOP address for the current network
    let lopAddress = LIMIT_ORDER_PROTOCOL_ADDRESSES[chainId];

    if (chainId === 31337) {
      console.log('Local network detected. Attempting to use MockLOP address.');
      const mockAddress = getMockLopAddress();
      if (mockAddress) {
        lopAddress = mockAddress;
        console.log(`Using deployed MockLOP address: ${lopAddress}`);
      } else {
        console.warn('MockLOP address not found, falling back to placeholder. Please run deploy-mock-lop.ts first.');
      }
    }
    
    if (!lopAddress) {
      throw new Error(`No Limit Order Protocol address configured for chain ID ${chainId}`);
    }
    
    console.log(`Using Limit Order Protocol address: ${lopAddress}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying from account: ${deployer.address}`);
    
    // Deploy FusionResolver contract
    const FusionResolver = await ethers.getContractFactory('contracts/FusionResolver.sol:FusionResolver');
    const fusionResolver = await FusionResolver.deploy(lopAddress);
    
    console.log('Waiting for deployment transaction confirmation...');
    await fusionResolver.waitForDeployment();
    
    const resolverAddress = await fusionResolver.getAddress();
    console.log(`FusionResolver deployed to: ${resolverAddress}`);
    
    // Save the contract address to .env file
    console.log('\nAdd this line to your .env file:');
    console.log(`FUSION_RESOLVER_ADDRESS=${resolverAddress}`);
    
    // Save the Fusion Resolver address to a JSON file
    const varsDir = path.join(__dirname, 'vars');
    if (!fs.existsSync(varsDir)) {
      fs.mkdirSync(varsDir, { recursive: true });
    }
    
    const filePath = path.join(varsDir, 'fusion-resolver-address.json');
    const jsonContent = JSON.stringify({
      'fusion-resolver-address': resolverAddress
    }, null, 4);
    
    fs.writeFileSync(filePath, jsonContent);
    console.log(`Fusion Resolver address saved to ${filePath}`);
    
    // Verify contract on Etherscan (for supported networks)
    if (chainId !== 31337) {
      console.log('\nVerifying contract on Etherscan...');
      console.log('Run the following command:');
      console.log(`npx hardhat verify --network ${network.name} ${resolverAddress} ${lopAddress}`);
    }
    
  } catch (error) {
    console.error('Error during deployment:', error);
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
