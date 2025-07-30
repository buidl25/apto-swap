/**
 * Complete Fusion Cross-Chain Swap
 * 
 * This script completes a previously initiated EVM to Aptos cross-chain swap
 * by withdrawing from the HTLC using the preimage.
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const { AptosClient, AptosAccount, HexString } = require('aptos');

// Load environment variables
dotenv.config();

// Detect if we're in mock mode
const MOCK_MODE = !process.env.EVM_RPC_URL || !process.env.EVM_PRIVATE_KEY || !process.env.APTOS_NODE_URL || !process.env.APTOS_PRIVATE_KEY || process.env.MOCK_MODE === 'true';

if (MOCK_MODE) {
  console.log('Running in MOCK MODE - no actual blockchain transactions will be sent');
}

/**
 * Executes an Aptos CLI command and returns the output
 * @param {string} command - The command to execute
 * @returns {string} - Command output
 */
function executeAptosCommand(command) {
  try {
    const output = execSync(`aptos ${command}`, { encoding: 'utf-8' });
    return output;
  } catch (error) {
    console.error(`Error executing Aptos command: ${error.message}`);
    if (error.stdout) console.error(`Command output: ${error.stdout}`);
    if (error.stderr) console.error(`Command error: ${error.stderr}`);
    throw error;
  }
}

/**
 * Loads a contract address from a JSON file in the vars directory
 * @param {string} contractName - Name of the contract (e.g., 'evm-token', 'fusion-resolver')
 * @returns {string|null} - Contract address or null if not found
 */
function loadContractAddress(contractName) {
  try {
    const filePath = path.join(__dirname, 'vars', `${contractName}-address.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`Contract address file not found: ${filePath}`);
      return null;
    }
    
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const addressData = JSON.parse(jsonContent);
    return addressData[`${contractName}-address`];
  } catch (error) {
    console.error(`Error loading contract address: ${error.message}`);
    return null;
  }
}

/**
 * Loads the swap details from the saved JSON file
 * @returns {Object|null} - Swap details or null if not found
 */
function loadSwapDetails() {
  try {
    const filePath = path.join(__dirname, 'vars', 'fusion-swap-details.json');
    if (!fs.existsSync(filePath)) {
      console.warn('Swap details file not found');
      return null;
    }
    
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error(`Error loading swap details: ${error.message}`);
    return null;
  }
}

/**
 * Withdraws from the EVM HTLC contract
 * @param {string} contractId - The ID of the HTLC contract
 * @param {string} preimage - The preimage to reveal
 * @returns {Promise<boolean>} - Whether the withdrawal was successful
 */
async function withdrawEvmHtlc(contractId, preimage) {
  try {
    console.log(`Withdrawing from EVM HTLC with contract ID: ${contractId}`);
    console.log(`Using preimage: ${preimage}`);
    
    // Use the global MOCK_MODE flag
    if (MOCK_MODE) {
      console.log('Mock mode detected for EVM withdrawal, simulating success');
      return true;
    }
    
    // Ensure we have the required environment variables
    if (!process.env.EVM_RPC_URL) {
      console.error('EVM_RPC_URL environment variable not set');
      return false;
    }
    
    if (!process.env.EVM_PRIVATE_KEY) {
      console.error('EVM_PRIVATE_KEY environment variable not set');
      return false;
    }
    
    // Load the contract address
    const contractsPath = path.join(__dirname, 'vars', 'evm-htlc-address.json');
    if (!fs.existsSync(contractsPath)) {
      console.error(`Contract address file not found at ${contractsPath}`);
      return false;
    }
    
    const contractData = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
    const contractAddress = contractData.address;
    
    console.log(`EVM HTLC contract address: ${contractAddress}`);
    
    // Connect to the provider
    const provider = new ethers.JsonRpcProvider(process.env.EVM_RPC_URL);
    
    // Check if we can connect to the provider
    try {
      await provider.getNetwork();
    } catch (error) {
      console.error(`Failed to connect to EVM provider: ${error.message}`);
      return false;
    }
    
    // Create a wallet
    const wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY, provider);
    
    // Load the contract ABI
    const contractAbiPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'EthereumHTLC.sol', 'EthereumHTLC.json');
    const contractAbi = JSON.parse(fs.readFileSync(contractAbiPath, 'utf8')).abi;
    
    // Create the contract instance
    const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
    
    // Ensure contractId is a valid bytes32 (64 hex chars + 0x prefix)
    if (contractId.startsWith('0x') && contractId.length !== 66) {
      console.warn('ContractId is not a valid bytes32, attempting to pad...');
      // Remove 0x prefix, pad to 64 chars, add 0x prefix back
      contractId = '0x' + contractId.slice(2).padStart(64, '0');
      console.log(`Padded contractId: ${contractId}`);
    }
    
    // Ensure preimage is a valid bytes32
    if (preimage.startsWith('0x') && preimage.length !== 66) {
      console.warn('Preimage is not a valid bytes32, attempting to pad...');
      // Remove 0x prefix, pad to 64 chars, add 0x prefix back
      preimage = '0x' + preimage.slice(2).padStart(64, '0');
      console.log(`Padded preimage: ${preimage}`);
    }
    
    // Call the withdraw function
    console.log('Calling withdraw on EVM HTLC contract...');
    const tx = await contract.withdraw(contractId, preimage);
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log('Waiting for transaction confirmation...');
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    return true;
  } catch (error) {
    console.error(`Error withdrawing from EVM HTLC: ${error.message}`);
    return false;
  }
}

/**
 * Withdraws from an HTLC on the Aptos blockchain
 * @param {string} contractId - Contract ID of the HTLC
 * @param {string} preimage - Preimage to unlock the HTLC
 * @returns {Promise<boolean>} - Success status
 */
async function withdrawAptosHtlc(contractId, preimage) {
  try {
    console.log(`Withdrawing from Aptos HTLC with contract ID: ${contractId}`);
    console.log(`Using preimage: ${preimage}`);
    
    // Use the global MOCK_MODE flag
    if (MOCK_MODE) {
      console.log('Mock mode detected for Aptos withdrawal, simulating success');
      return true;
    }
    
    // Load the Aptos module address
    const moduleAddress = loadContractAddress('aptos-htlc');
    if (!moduleAddress) {
      console.error('Aptos HTLC module address not found');
      return false;
    }
    
    // Load the Aptos token address
    const tokenAddress = loadContractAddress('aptos-token');
    if (!tokenAddress) {
      console.error('Aptos token address not found');
      return false;
    }
    
    // Convert preimage to hex string without 0x prefix
    const preimageHex = preimage.startsWith('0x') ? preimage.slice(2) : preimage;
    
    // Execute the Aptos command to withdraw from the HTLC
    console.log('Withdrawing from Aptos HTLC...');
    const command = `move run --function-id ${moduleAddress}::atomic_swap::withdraw --type-args ${tokenAddress} --args string:${contractId} hex:${preimageHex} --assume-yes`;
    
    try {
      const output = executeAptosCommand(command);
      console.log('Aptos HTLC withdrawal successful');
      console.log('Transaction output:', output);
      return true;
    } catch (cmdError) {
      // Check if this is the E_CONTRACT_NOT_EXISTS error
      if (cmdError.message && cmdError.message.includes('E_CONTRACT_NOT_EXISTS')) {
        console.error('Error: The Aptos HTLC contract does not exist on this network.');
        console.error('This is expected in mock mode or if the contract has not been deployed.');
      } else {
        console.error('Error executing Aptos withdrawal command:', cmdError.message);
      }
      return false;
    }
  } catch (error) {
    console.error('Error withdrawing from Aptos HTLC:', error.message);
    return false;
  }
}

/**
 * Main function to complete the cross-chain swap
 */
async function main() {
  try {
    console.log('=== Completing Fusion Cross-Chain Swap ===');
    
    // Load the swap details
    const swapDetails = loadSwapDetails();
    if (!swapDetails) {
      throw new Error('No active swap found. Please initiate a swap first.');
    }
    
    console.log('\nLoaded swap details:');
    console.log(`EVM HTLC ID: ${swapDetails.evmHtlcId}`);
    console.log(`Aptos HTLC ID: ${swapDetails.aptosHtlcId}`);
    console.log(`Preimage: ${swapDetails.preimage}`);
    console.log(`Hashlock: ${swapDetails.hashlock}`);
    console.log(`Timelock: ${swapDetails.timelock} (${new Date(swapDetails.timelock * 1000).toLocaleString()})`);
    
    // Check if the timelock has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= swapDetails.timelock) {
      console.warn('\nWARNING: Timelock has expired. The sender may be able to refund the HTLC.');
    }
    
    // Withdraw from the Aptos HTLC
    console.log('\nWithdrawing from Aptos HTLC...');
    const aptosSuccess = await withdrawAptosHtlc(
      swapDetails.aptosHtlcId,
      swapDetails.preimage
    );
    
    if (aptosSuccess) {
      console.log('Successfully withdrawn from Aptos HTLC!');
    } else {
      console.error('Failed to withdraw from Aptos HTLC');
    }
    
    // Withdraw from the EVM HTLC
    console.log('\nWithdrawing from EVM HTLC...');
    
    // In the contract, contractId is a bytes32 value
    // For mock mode, we need to convert the string ID to a proper bytes32 format
    let evmHtlcId = swapDetails.evmHtlcId;
    
    // Check if we're in mock mode or if the contractId is not a full bytes32 hash
    if (MOCK_MODE || (evmHtlcId.startsWith('0x') && evmHtlcId.length < 66)) {
      console.log('Converting contractId to bytes32 format for compatibility');
      // Create a bytes32 value by hashing the ID
      evmHtlcId = ethers.id(evmHtlcId);
      console.log(`Converted EVM HTLC ID to bytes32: ${evmHtlcId}`);
    }
    
    const evmSuccess = await withdrawEvmHtlc(
      evmHtlcId,
      swapDetails.preimage
    );
    
    if (evmSuccess) {
      console.log('Successfully withdrawn from EVM HTLC!');
    } else {
      console.error('Failed to withdraw from EVM HTLC');
    }
    
    // Update the swap details with completion status
    swapDetails.completed = {
      timestamp: currentTime,
      aptosSuccess,
      evmSuccess
    };
    
    // Save the updated swap details
    const varsDir = path.join(__dirname, 'vars');
    const filePath = path.join(varsDir, 'fusion-swap-details.json');
    fs.writeFileSync(filePath, JSON.stringify(swapDetails, null, 2));
    
    if (aptosSuccess && evmSuccess) {
      console.log('\nCross-chain swap completed successfully!');
    } else {
      console.warn('\nCross-chain swap partially completed. Check the logs for details.');
    }
    
  } catch (error) {
    console.error('Error completing cross-chain swap:', error.message);
    process.exit(1);
  }
}

// Execute the main function if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error in main:', error);
      process.exit(1);
    });
}

module.exports = { main };
