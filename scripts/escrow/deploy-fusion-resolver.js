// Script to deploy the FusionResolver contract
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying FusionResolver contract...");

  // Get the Limit Order Protocol address from environment or use a mock address
  const limitOrderProtocolAddress = process.env.LIMIT_ORDER_PROTOCOL_ADDRESS || "0x0000000000000000000000000000000000000000";

  // If using a mock address, warn the user
  if (limitOrderProtocolAddress === "0x0000000000000000000000000000000000000000") {
    console.warn("WARNING: Using a zero address for Limit Order Protocol. This is only for testing purposes.");
    console.warn("Set the LIMIT_ORDER_PROTOCOL_ADDRESS environment variable to use a real address.");
  }

  // Get the EscrowFactory address from environment or deploy a new one
  // from scripts/vars/escrow-factory-address.json
  // scripts/vars/escrow-factory-address.json
  let escrowFactoryAddress = null;

  if (!escrowFactoryAddress) {
    console.log("No EscrowFactory address provided. Trying to load from file...");
    try {
      const addressFile = path.join(__dirname, "vars", "escrow-factory-address.json");
      if (fs.existsSync(addressFile)) {
        const addressData = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
        escrowFactoryAddress = addressData["escrow-factory-address"];
        console.log(`Loaded EscrowFactory address from file: ${escrowFactoryAddress}`);
      }
    } catch (error) {
      console.error("Error reading EscrowFactory address from file:", error.message);
    }
  }

  if (!escrowFactoryAddress) {
    console.log("No EscrowFactory address found in file. Deploying a new EscrowFactory...");
    const deployEscrowFactory = require("./deploy-escrow-factory");
    const { escrowFactoryAddress: newAddress } = await deployEscrowFactory();
    escrowFactoryAddress = newAddress;
  }

  // Get the contract factory
  const FusionResolver = await hre.ethers.getContractFactory("contracts/escrow/FusionResolver.sol:FusionResolver");

  // Deploy the contract with the Limit Order Protocol and EscrowFactory addresses
  const fusionResolver = await FusionResolver.deploy(limitOrderProtocolAddress, escrowFactoryAddress);

  // Wait for the contract to be deployed
  await fusionResolver.waitForDeployment();

  const fusionResolverAddress = await fusionResolver.getAddress();
  console.log(`FusionResolver deployed to: ${fusionResolverAddress}`);
  console.log(`Using Limit Order Protocol at: ${limitOrderProtocolAddress}`);
  console.log(`Using EscrowFactory at: ${escrowFactoryAddress}`);

  // Save the address to a file
  const varsDir = path.join(__dirname, "vars");
  if (!fs.existsSync(varsDir)) {
    fs.mkdirSync(varsDir, { recursive: true });
  }
  const resolverAddressFile = path.join(varsDir, "fusion-resolver-address.json");
  fs.writeFileSync(resolverAddressFile, JSON.stringify({
    "fusion-resolver-address": fusionResolverAddress
  }, null, 2));
  console.log(`Resolver address saved to: ${resolverAddressFile}`);

  const resolverAddressFileBackend = path.join(varsDir, "../../../be/vars", "fusion-resolver-address.json");
  fs.writeFileSync(resolverAddressFileBackend, JSON.stringify({
    "fusion-resolver-address": fusionResolverAddress
  }, null, 2));
  console.log(`Resolver address saved to: ${resolverAddressFileBackend}`);

  return { fusionResolver, fusionResolverAddress, escrowFactoryAddress, limitOrderProtocolAddress };
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