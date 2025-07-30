// Script to verify EscrowSrc contract and related contracts on Etherscan
const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting verification of Escrow contracts...");

  // Try to read addresses from JSON files first
  let escrowFactoryAddress;
  let fusionResolverAddress;
  let lopAddress;
  let rescueDelay = process.env.RESCUE_DELAY || 3600;

  // Path to the JSON files
  const varsDir = path.join(__dirname, "vars");
  const allAddressesPath = path.join(varsDir, "escrow-system-addresses.json");
  const escrowFactoryPath = path.join(varsDir, "escrow-factory-address.json");
  const fusionResolverPath = path.join(varsDir, "fusion-resolver-address.json");

  // Try to read from the combined addresses file first
  if (fs.existsSync(allAddressesPath)) {
    try {
      const addressesData = JSON.parse(fs.readFileSync(allAddressesPath, 'utf8'));
      escrowFactoryAddress = addressesData["escrow-factory-address"];
      fusionResolverAddress = addressesData["fusion-resolver-address"];
      rescueDelay = addressesData["rescue-delay"] || rescueDelay;
      console.log("Loaded addresses from combined JSON file.");
    } catch (error) {
      console.error("Error reading combined addresses file:", error.message);
    }
  }

  // If not found in combined file, try individual files
  if (!escrowFactoryAddress && fs.existsSync(escrowFactoryPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(escrowFactoryPath, 'utf8'));
      escrowFactoryAddress = data["escrow-factory-address"];
      console.log("Loaded EscrowFactory address from individual JSON file.");
    } catch (error) {
      console.error("Error reading EscrowFactory address file:", error.message);
    }
  }

  if (!fusionResolverAddress && fs.existsSync(fusionResolverPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fusionResolverPath, 'utf8'));
      fusionResolverAddress = data["fusion-resolver-address"];
      console.log("Loaded FusionResolver address from individual JSON file.");
    } catch (error) {
      console.error("Error reading FusionResolver address file:", error.message);
    }
  }

  // Fall back to environment variables if files not found
  escrowFactoryAddress = escrowFactoryAddress || process.env.ESCROW_FACTORY_ADDRESS;
  fusionResolverAddress = fusionResolverAddress || process.env.FUSION_RESOLVER_ADDRESS;
  lopAddress = lopAddress || process.env.LOP_ADDRESS;

  // Validate required addresses
  if (!escrowFactoryAddress) {
    console.error("Error: EscrowFactory address not found in JSON files or environment variables");
    process.exit(1);
  }

  if (!fusionResolverAddress) {
    console.error("Error: FusionResolver address not found in JSON files or environment variables");
    process.exit(1);
  }

  if (!lopAddress) {
    console.error("Error: LOP_ADDRESS environment variable not set");
    console.log("Using the first signer address as LOP address for verification...");
    const [signer] = await ethers.getSigners();
    lopAddress = await signer.getAddress();
  }

  console.log(`Verifying EscrowFactory at address: ${escrowFactoryAddress}`);
  console.log(`Verifying FusionResolver at address: ${fusionResolverAddress}`);
  console.log(`LOP Address: ${lopAddress}`);
  console.log(`Rescue Delay: ${rescueDelay}`);

  try {
    // Verify EscrowFactory
    console.log("\nVerifying EscrowFactory...");
    await run("verify:verify", {
      address: escrowFactoryAddress,
      contract: "contracts/escrow/EscrowFactory.sol:EscrowFactory",
      constructorArguments: [rescueDelay],
    });
    console.log("EscrowFactory verification complete!");
  } catch (error) {
    console.error("Error verifying EscrowFactory:", error.message);
  }

  try {
    // Verify FusionResolver
    console.log("\nVerifying FusionResolver...");
    await run("verify:verify", {
      address: fusionResolverAddress,
      contract: "contracts/escrow/FusionResolver.sol:FusionResolver",
      constructorArguments: [lopAddress, escrowFactoryAddress],
    });
    console.log("FusionResolver verification complete!");
  } catch (error) {
    console.error("Error verifying FusionResolver:", error.message);
  }

  // Note: The Escrow implementation is deployed by the factory and doesn't need separate verification
  // as it's a deterministic deployment and should be automatically verified when the factory is verified

  console.log("\nVerification process completed!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
