/**
 * @fileoverview Script to deploy the FusionResolver contract
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Main function to deploy the FusionResolver contract
 */
async function main() {
  console.log("Deploying FusionResolver contract...");

  // Get network information
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);

  // Get or set the Limit Order Protocol address
  let lopAddress = process.env.LIMIT_ORDER_PROTOCOL_ADDRESS;
  if (!lopAddress) {
    // Default 1inch Limit Order Protocol address (mainnet)
    lopAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
  }
  console.log(`Using Limit Order Protocol address: ${lopAddress}`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  // Deploy the FusionResolver contract
  const FusionResolver = await ethers.getContractFactory("contracts/FusionResolver.sol:FusionResolver");
  const fusionResolver = await FusionResolver.deploy(lopAddress);
  console.log('Waiting for deployment transaction confirmation...');
  await fusionResolver.waitForDeployment();

  const resolverAddress = await fusionResolver.getAddress();
  console.log(`FusionResolver deployed to: ${resolverAddress}`);

  // Set the default timelock if specified in environment variables
  const defaultTimelock = process.env.DEFAULT_TIMELOCK;
  if (defaultTimelock) {
    console.log(`Setting default timelock to ${defaultTimelock} seconds...`);
    const tx = await fusionResolver.setDefaultTimelock(defaultTimelock);
    await tx.wait();
    console.log("Default timelock set successfully");
  }

  console.log("Deployment completed successfully");
  
  // Return the resolver address for use in other scripts
  return resolverAddress;
}

// Execute the script if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
