// Script to deploy EscrowSrc contract and related contracts
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying EscrowSrc and related contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${await deployer.getAddress()}`);

  // Set rescue delay to 1 hour (3600 seconds)
  const rescueDelay = 3600;
  console.log(`Setting rescue delay to: ${rescueDelay} seconds`);

  // Deploy EscrowFactory first
  console.log("Deploying EscrowFactory...");
  const EscrowFactory = await ethers.getContractFactory("contracts/escrow/EscrowFactory.sol:EscrowFactory");
  const escrowFactory = await EscrowFactory.deploy(rescueDelay);
  await escrowFactory.waitForDeployment();
  const escrowFactoryAddress = await escrowFactory.getAddress();
  console.log(`EscrowFactory deployed to: ${escrowFactoryAddress}`);

  // Deploy FusionResolver
  console.log("Deploying FusionResolver...");
  // For LOP address, we'll use the deployer address as a placeholder
  // In production, this should be the actual LimitOrderProtocol address
  const lopAddress = await deployer.getAddress();
  console.log(`Using LOP address: ${lopAddress}`);

  const FusionResolver = await ethers.getContractFactory("contracts/escrow/FusionResolver.sol:FusionResolver");
  const fusionResolver = await FusionResolver.deploy(
    lopAddress,
    escrowFactoryAddress
  );
  await fusionResolver.waitForDeployment();
  const fusionResolverAddress = await fusionResolver.getAddress();
  console.log(`FusionResolver deployed to: ${fusionResolverAddress}`);

  // Get the implementation address from the factory
  const implementationAddress = await escrowFactory.implementation();
  console.log(`Escrow implementation deployed to: ${implementationAddress}`);

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(`EscrowFactory: ${escrowFactoryAddress}`);
  console.log(`FusionResolver: ${fusionResolverAddress}`);
  console.log(`Escrow Implementation: ${implementationAddress}`);
  console.log(`Rescue Delay: ${rescueDelay} seconds`);

  // Save addresses to JSON files
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }

  // Save EscrowFactory address
  const escrowFactoryFilePath = path.join(varsDir, "escrow-factory-address.json");
  fs.writeFileSync(escrowFactoryFilePath, JSON.stringify({
    "escrow-factory-address": escrowFactoryAddress
  }, null, 2));
  console.log(`EscrowFactory address saved to ${escrowFactoryFilePath}`);

  // Save FusionResolver address
  const fusionResolverFilePath = path.join(varsDir, "fusion-resolver-address.json");
  fs.writeFileSync(fusionResolverFilePath, JSON.stringify({
    "fusion-resolver-address": fusionResolverAddress
  }, null, 2));
  console.log(`FusionResolver address saved to ${fusionResolverFilePath}`);

  // Save Escrow implementation address
  const escrowImplFilePath = path.join(varsDir, "escrow-implementation-address.json");
  fs.writeFileSync(escrowImplFilePath, JSON.stringify({
    "escrow-implementation-address": implementationAddress
  }, null, 2));
  console.log(`Escrow implementation address saved to ${escrowImplFilePath}`);

  // Save all addresses in a single file for convenience
  const allAddressesFilePath = path.join(varsDir, "escrow-system-addresses.json");
  fs.writeFileSync(allAddressesFilePath, JSON.stringify({
    "escrow-factory-address": escrowFactoryAddress,
    "fusion-resolver-address": fusionResolverAddress,
    "escrow-implementation-address": implementationAddress,
    "rescue-delay": rescueDelay
  }, null, 2));
  console.log(`All addresses saved to ${allAddressesFilePath}`);
  
  console.log("\nAdd these to your .env file:");
  console.log(`ESCROW_FACTORY_ADDRESS=${escrowFactoryAddress}`);
  console.log(`FUSION_RESOLVER_ADDRESS=${fusionResolverAddress}`);
  console.log(`ESCROW_IMPLEMENTATION_ADDRESS=${implementationAddress}`);
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
