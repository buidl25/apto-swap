/**
 * EVM to Aptos Cross-Chain Swap
 * 
 * This script demonstrates swapping tokens from EVM to Aptos:
 * 1. Burns EVM tokens on the source chain
 * 2. Mints equivalent Aptos tokens on the target chain
 */

const hre = require("hardhat");
const { execSync } = require("child_process");
const { AptosClient } = require("aptos");
require("dotenv").config();

async function main() {
  const evmAmount = process.env.AMOUNT || "10"; // Default to 10 tokens if not specified
  const aptosRecipientAddress = process.env.APTOS_RECIPIENT || "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";
  
  // Get the EVM signer
  const [signer] = await hre.ethers.getSigners();
  const evmSenderAddress = await signer.getAddress();
  
  console.log("\n=== EVM to Aptos Cross-Chain Swap ===\n");
  console.log(`EVM Sender: ${evmSenderAddress}`);
  console.log(`Aptos Recipient: ${aptosRecipientAddress}`);
  console.log(`Amount: ${evmAmount} tokens\n`);
  
  // Step 1: Connect to the EVM token contract
  const TestEvmToken = await hre.ethers.getContractFactory("TestEvmToken");
  
  // Read token address from the JSON file
  let tokenAddress;
  try {
    const tokenAddressFile = require('./vars/evm-token-address.json');
    tokenAddress = tokenAddressFile['evm-token-address'];
    
    if (!tokenAddress) {
      throw new Error("Token address not found in JSON file");
    }
  } catch (error) {
    console.error("Error reading EVM token address from JSON file:", error.message);
    console.error("Please deploy the EVM token first with 'npm run deploy-evm-token'.");
    process.exit(1);
  }
  
  const token = TestEvmToken.attach(tokenAddress);
  console.log(`Connected to EVM token at: ${await token.getAddress()}`);
  
  // Step 2: Check EVM token balance before swap
  const evmBalanceBefore = await token.balanceOf(evmSenderAddress);
  console.log(`EVM balance before swap: ${hre.ethers.formatUnits(evmBalanceBefore)} tokens`);
  
  // Step 3: Check Aptos token balance before swap
  const aptosBalanceBefore = await getAptosTokenBalance(aptosRecipientAddress);
  console.log(`Aptos balance before swap: ${aptosBalanceBefore} tokens`);
  
  // Step 4: Burn EVM tokens (simulating the cross-chain lock/burn)
  console.log("\nBurning EVM tokens...");
  const amountWei = hre.ethers.parseUnits(evmAmount);
  const burnTx = await token.burn(amountWei);
  await burnTx.wait();
  console.log(`Burned ${evmAmount} EVM tokens in transaction: ${burnTx.hash}`);
  
  // Step 5: Check EVM balance after burn
  const evmBalanceAfter = await token.balanceOf(evmSenderAddress);
  console.log(`EVM balance after burn: ${hre.ethers.formatUnits(evmBalanceAfter)} tokens`);
  
  // Step 6: Mint equivalent tokens on Aptos (simulating the cross-chain mint)
  console.log("\nMinting equivalent tokens on Aptos...");
  await mintAptosTokens(aptosRecipientAddress, evmAmount);
  
  // Step 7: Check Aptos balance after mint
  const aptosBalanceAfter = await getAptosTokenBalance(aptosRecipientAddress);
  console.log(`Aptos balance after mint: ${aptosBalanceAfter} tokens`);
  
  console.log("\n=== Cross-Chain Swap Completed ===\n");
}

/**
 * Get the balance of TestAptosToken for a given address
 * @param {string} address - The Aptos account address
 * @returns {string} - The token balance or error message
 */
async function getAptosTokenBalance(address) {
  try {
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
    const resources = await client.getAccountResources(address);
    
    const tokenType = `0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken`;
    const coinStoreType = `0x1::coin::CoinStore<${tokenType}>`;
    
    const coinResource = resources.find(r => r.type === coinStoreType);
    
    if (coinResource) {
      // Convert from smallest unit to standard unit (considering 9 decimals for Aptos token)
      const rawBalance = coinResource.data.coin.value;
      return parseInt(rawBalance) / 1000000000; // 9 decimals
    } else {
      return "0 (not registered)";
    }
  } catch (error) {
    console.error("Error fetching Aptos balance:", error.message);
    return "Error";
  }
}

/**
 * Mint TestAptosToken to a recipient address
 * @param {string} recipientAddress - The recipient's Aptos address
 * @param {string} amount - The amount to mint (in standard units)
 */
async function mintAptosTokens(recipientAddress, amount) {
  try {
    // Convert amount to Aptos token units (9 decimals)
    const aptosAmount = parseInt(amount) * 1000000000; // 9 decimals
    
    // In a real implementation, this would be done through a bridge contract
    // For this demo, we'll directly mint tokens using the Aptos CLI
    const tokenAddress = "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128::test_aptos_token::TestAptosToken";
    
    const command = `aptos move run \
      --function-id 0x1::managed_coin::mint \
      --type-args ${tokenAddress} \
      --args address:${recipientAddress} u64:${aptosAmount} \
      --assume-yes \
      --profile default`;
    
    console.log(`Executing command: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    
    if (result.includes("Executed successfully")) {
      console.log(`Successfully minted ${amount} TestAptosToken to ${recipientAddress}`);
    } else {
      console.log("Mint result:", result);
    }
  } catch (error) {
    console.error("Error minting Aptos tokens:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});