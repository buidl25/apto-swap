// Script to deploy all escrow-related contracts
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const deployEscrowFactory = require("./deploy-escrow-factory");
const deployFusionResolver = require("./deploy-fusion-resolver");

async function main() {
  console.log("Deploying all escrow-related contracts...");
  console.log("===========================================");

  // Step 1: Deploy EscrowFactory
  console.log("\n1. Deploying EscrowFactory...");
  const { escrowFactoryAddress, implementationAddress, rescueDelay } = await deployEscrowFactory();
  
  // Step 2: Deploy FusionResolver
  console.log("\n2. Deploying FusionResolver...");
  process.env.ESCROW_FACTORY_ADDRESS = escrowFactoryAddress;
  const { fusionResolverAddress } = await deployFusionResolver();

  // Summary
  console.log("\n===========================================");
  console.log("Deployment Summary:");
  console.log("-----------------");
  console.log(`EscrowFactory: ${escrowFactoryAddress}`);
  console.log(`EscrowSrc Implementation: ${implementationAddress}`);
  console.log(`FusionResolver: ${fusionResolverAddress}`);
  console.log("===========================================");

  // Save all addresses in a single file for convenience
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  const allAddressesFilePath = path.join(varsDir, "escrow-system-addresses.json");
  fs.writeFileSync(allAddressesFilePath, JSON.stringify({
    "escrow-factory-address": escrowFactoryAddress,
    "fusion-resolver-address": fusionResolverAddress,
    "escrow-implementation-address": implementationAddress,
    "rescue-delay": rescueDelay
  }, null, 2));
  console.log(`All addresses saved to ${allAddressesFilePath}`);

  return {
    escrowFactoryAddress,
    implementationAddress,
    fusionResolverAddress
  };
}

// Execute the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;