/**
 * @fileoverview Script to interact with the FusionResolver contract
 */

const { ethers } = require("hardhat");
const crypto = require("crypto");
require("dotenv").config();

/**
 * Creates a random preimage and its corresponding hashlock
 * @returns {Object} Object containing preimage and hashlock
 */
function generatePreimageAndHashlock() {
  // Generate a random 32-byte preimage
  const preimage = `0x${crypto.randomBytes(32).toString("hex")}`;
  
  // Create hashlock by hashing the preimage with keccak256
  const hashlock = ethers.keccak256(preimage);
  
  return { preimage, hashlock };
}

/**
 * Simulates a taker interaction with the resolver
 * @param {string} resolverAddress - Address of the deployed resolver contract
 * @param {string} tokenAddress - Address of the token being used in the swap
 * @param {string} amount - Amount of tokens to swap
 * @returns {Object} Object containing transaction details and hashlock
 */
async function simulateTakerInteraction(resolverAddress, tokenAddress, amount) {
  // Get signers
  const [deployer, taker] = await ethers.getSigners();
  
  // Generate preimage and hashlock
  const { preimage, hashlock } = generatePreimageAndHashlock();
  console.log(`Generated preimage: ${preimage}`);
  console.log(`Generated hashlock: ${hashlock}`);
  
  // Connect to the resolver contract
  const fusionResolver = await ethers.getContractAt("FusionResolver", resolverAddress);
  
  // Prepare interaction data (encode the hashlock)
  const interactionData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32"], 
    [hashlock]
  );
  
  console.log(`Simulating taker interaction with resolver at ${resolverAddress}`);
  console.log(`Token address: ${tokenAddress}`);
  console.log(`Amount: ${amount}`);
  
  // Call takerInteraction function
  const tx = await fusionResolver.takerInteraction(
    taker.address,
    tokenAddress,
    tokenAddress, // Using same token for maker and taker assets for simplicity
    amount,
    amount,
    interactionData
  );
  
  // Wait for transaction to be mined
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  
  // Check if tokens are locked
  const tokensLocked = await fusionResolver.areTokensLocked(hashlock);
  console.log(`Tokens locked with hashlock: ${tokensLocked}`);
  
  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    preimage,
    hashlock,
    taker: taker.address,
    tokenAddress,
    amount
  };
}

/**
 * Withdraws tokens using the preimage
 * @param {string} resolverAddress - Address of the deployed resolver contract
 * @param {string} tokenAddress - Address of the token to withdraw
 * @param {string} recipient - Address of the recipient
 * @param {string} amount - Amount to withdraw
 * @param {string} preimage - Preimage of the hashlock
 * @returns {Object} Transaction receipt
 */
async function withdrawTokens(resolverAddress, tokenAddress, recipient, amount, preimage) {
  // Connect to the resolver contract
  const fusionResolver = await ethers.getContractAt("FusionResolver", resolverAddress);
  
  console.log(`Withdrawing tokens from resolver at ${resolverAddress}`);
  console.log(`Token address: ${tokenAddress}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Amount: ${amount}`);
  console.log(`Using preimage: ${preimage}`);
  
  // Call withdraw function
  const tx = await fusionResolver.withdraw(
    tokenAddress,
    recipient,
    amount,
    preimage
  );
  
  // Wait for transaction to be mined
  const receipt = await tx.wait();
  console.log(`Withdrawal confirmed in block ${receipt.blockNumber}`);
  
  return receipt;
}

/**
 * Main function to demonstrate resolver interaction
 */
async function main() {
  // Get resolver address from environment or deploy a new one
  let resolverAddress = process.env.RESOLVER_ADDRESS;
  
  if (!resolverAddress) {
    console.log("No resolver address found in environment, deploying a new resolver...");
    const deployResolver = require("./deploy-fusion-resolver");
    resolverAddress = await deployResolver();
  }
  
  // Get token address from environment or deploy a mock token
  let tokenAddress = process.env.EVM_TOKEN_ADDRESS;
  
  if (!tokenAddress) {
    console.log("No token address found in environment, deploying a mock token...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log(`Mock token deployed at: ${tokenAddress}`);
    
    // Transfer some tokens to the resolver for testing
    const tx = await mockToken.transfer(resolverAddress, ethers.parseEther("10000"));
    await tx.wait();
    console.log(`Transferred 10,000 tokens to resolver`);
  }
  
  // Amount to use in the interaction
  const amount = process.env.SWAP_AMOUNT || ethers.parseEther("100");
  
  // Simulate taker interaction
  const interactionResult = await simulateTakerInteraction(
    resolverAddress,
    tokenAddress,
    amount
  );
  
  // Wait a bit to simulate time passing
  console.log("Waiting for 5 seconds before withdrawal...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Withdraw tokens
  const [, recipient] = await ethers.getSigners();
  await withdrawTokens(
    resolverAddress,
    tokenAddress,
    recipient.address,
    amount,
    interactionResult.preimage
  );
  
  // Check recipient balance
  const token = await ethers.getContractAt("MockERC20", tokenAddress);
  const balance = await token.balanceOf(recipient.address);
  console.log(`Recipient balance after withdrawal: ${ethers.formatEther(balance)} tokens`);
  
  console.log("Interaction completed successfully");
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

module.exports = {
  generatePreimageAndHashlock,
  simulateTakerInteraction,
  withdrawTokens
};
