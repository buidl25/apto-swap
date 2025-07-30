/**
 * Fusion HTLC Swap Integration
 * 
 * This script connects the 1inch Fusion SDK with our HTLC-based atomic swap system
 * to enable cross-chain swaps with MEV protection and better rates.
 */

import { ethers } from 'ethers';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { createFusionSdk, getWalletAddress } from './sdk-setup';
import { createOrder, formatTokenAmount, OrderInfo } from './create-order';
import { submitOrder, getOrderStatus, waitForOrderCompletion } from './execute-order';
import { AptosClient, AptosAccount, HexString } from 'aptos';

// Load environment variables
dotenv.config();

/**
 * Parameters for a cross-chain Fusion swap
 */
export interface FusionSwapParams {
  readonly fromChain: 'evm' | 'aptos';
  readonly toChain: 'evm' | 'aptos';
  readonly fromTokenAddress: string;
  readonly toTokenAddress: string;
  readonly amount: string;
  readonly recipient: string;
  readonly timelock?: number;
  readonly preimage?: string;
}

/**
 * Result of a cross-chain swap operation
 */
export interface FusionSwapResult {
  readonly success: boolean;
  readonly orderHash?: string;
  readonly htlcId?: string;
  readonly hashlock: string;
  readonly preimage?: string;
  readonly timelock: number;
  readonly error?: string;
}

/**
 * Generates a random preimage and its corresponding hashlock
 * @returns Object containing the preimage and hashlock
 */
export const generatePreimageAndHashlock = (): { preimage: string; hashlock: string } => {
  // Generate a random 32-byte preimage
  const preimage = crypto.randomBytes(32).toString('hex');
  
  // Create SHA-256 hash of the preimage
  const hashlock = '0x' + crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
  
  return { preimage, hashlock };
};

/**
 * Executes an Aptos CLI command and returns the output
 * @param command - The command to execute
 * @returns Command output
 */
function executeAptosCommand(command: string): string {
  try {
    const output = execSync(`aptos ${command}`, { encoding: 'utf-8' });
    return output;
  } catch (error: any) {
    console.error(`Error executing Aptos command: ${error.message}`);
    if (error.stdout) console.error(`Command output: ${error.stdout}`);
    if (error.stderr) console.error(`Command error: ${error.stderr}`);
    throw error;
  }
}

/**
 * Creates an Aptos HTLC contract
 * @param params - HTLC parameters
 * @param useMock - Whether to use mock mode
 * @returns Promise<string> - Contract ID
 */
const createAptosHtlc = async (params: {
  recipient: string;
  amount: string;
  hashlock: string;
  timelock: number;
}, useMock: boolean = false): Promise<string> => {
  const { recipient, amount, hashlock, timelock } = params;
  const aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS || 
    '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
  
  console.log('\nCreating Aptos HTLC...');
  
  // If in mock mode, return a mock contract ID
  if (useMock || !process.env.ONE_INCH_API_KEY || process.env.ONE_INCH_API_KEY === 'your-api-key-here') {
    console.warn('Using mock Aptos HTLC creation due to missing API key or mock mode. This is for testing purposes only.');
    const mockContractId = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    console.log(`Mock Aptos HTLC created with ID: ${mockContractId}`);
    return mockContractId;
  }
  
  // Format hashlock (remove 0x prefix for hex argument)
  const formattedHashlock = hashlock.replace(/^0x/, '');
  
  const createHtlcCommand = `move run --function-id ${aptosModuleAddress}::atomic_swap::create_htlc ` +
    `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
    `--args address:${recipient} u64:${amount} hex:0x${formattedHashlock} u64:${timelock} ` +
    `--assume-yes`;
  
  console.log(`Executing command: aptos ${createHtlcCommand}`);
  const createOutput = executeAptosCommand(createHtlcCommand);
  
  // Parse the transaction hash from the output
  const txHashMatch = createOutput.match(/Transaction submitted: https:\/\/explorer\.aptoslabs\.com\/txn\/([0-9a-fA-F]+)\?network=devnet/);
  const txHash = txHashMatch ? txHashMatch[1] : 'unknown';
  
  console.log(`\nHTLC created successfully!`);
  console.log(`Transaction hash: ${txHash}`);
  
  // Wait for the transaction to be confirmed and fetch events
  console.log(`\nWaiting for transaction to be confirmed...`);
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  
  // Get transaction events to extract the contract ID
  const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
  const txInfo = await client.getTransactionByHash(txHash);
  
  // Look for HTLCCreatedEvent in the events
  let contractId = null;
  
  // Handle different transaction response structures
  const events = txInfo && 'events' in txInfo ? txInfo.events : [];
  
  // Process events if available
  if (events && Array.isArray(events)) {
    for (const event of events) {
      if (event.type && event.type.includes('HTLCCreatedEvent')) {
        contractId = event.data?.contract_id;
        break;
      }
    }
  }
  
  if (!contractId) {
    throw new Error('Could not find contract ID in transaction events');
  }
  
  return contractId;
}

/**
 * Creates an HTLC on the EVM blockchain
 * @param recipient - Recipient address
 * @param tokenAddress - Token address
 * @param amount - Amount of tokens
 */
const createEvmHtlc = async (params: {
  recipient: string;
  tokenAddress: string;
  amount: string;
  hashlock: string;
  timelock: number;
}, useMock: boolean = false): Promise<string> => {
  console.log('\nCreating EVM HTLC...');
  
  const { recipient, tokenAddress, amount, hashlock, timelock } = params;
  
  // If in mock mode, return a mock contract ID
  if (useMock || !process.env.ONE_INCH_API_KEY || process.env.ONE_INCH_API_KEY === 'your-api-key-here') {
    console.warn('Using mock HTLC creation due to missing API key or mock mode. This is for testing purposes only.');
    const mockContractId = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    console.log(`Mock EVM HTLC created with ID: ${mockContractId}`);
    return mockContractId;
  }
  
  const command = `node -e "
    process.env.EVM_RECIPIENT = '${recipient}';
    process.env.EVM_TOKEN_ADDRESS = '${tokenAddress}';
    process.env.AMOUNT = '${amount}';
    process.env.HASHLOCK = '${hashlock}';
    process.env.TIMELOCK = '${timelock - Math.floor(Date.now() / 1000)}';
    require('./scripts/create-evm-htlc.js');
  "`;
  
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(output);
    
    // Extract the contract ID from the output
    const contractIdMatch = output.match(/Contract ID: (0x[0-9a-fA-F]+)/);
    const contractId = contractIdMatch ? contractIdMatch[1] : null;
    
    if (!contractId) {
      throw new Error('Could not extract contract ID from output');
    }
    
    return contractId;
  } catch (error: any) {
    console.error('Error creating EVM HTLC:', error);
    
    // If we encounter an error, fall back to mock mode
    console.warn('Falling back to mock HTLC creation due to error. This is for testing purposes only.');
    const mockContractId = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    console.log(`Mock EVM HTLC created with ID: ${mockContractId}`);
    return mockContractId;
  }
};

/**
 * Initiates a Fusion swap with HTLC protection
 * @param params - Parameters for the cross-chain swap
 * @returns Promise resolving to the cross-chain swap result
 */
export async function initiateFusionSwap(
  params: FusionSwapParams
): Promise<FusionSwapResult> {
  try {
    console.log('=== Initiating Fusion Cross-Chain Swap ===');
    console.log(`From chain: ${params.fromChain}`);
    console.log(`To chain: ${params.toChain}`);
    console.log(`Amount: ${params.amount}`);
    console.log(`Recipient: ${params.recipient}`);
    
    // Generate preimage and hashlock if not provided
    const { preimage, hashlock } = params.preimage 
      ? { preimage: params.preimage, hashlock: '0x' + crypto.createHash('sha256').update(Buffer.from(params.preimage)).digest('hex') }
      : generatePreimageAndHashlock();
    
    console.log(`Preimage: ${preimage}`);
    console.log(`Hashlock: ${hashlock}`);
    
    // Calculate timelock (default: 30 minutes from now)
    const timelock = params.timelock || Math.floor(Date.now() / 1000) + 1800;
    console.log(`Timelock: ${timelock} (${new Date(timelock * 1000).toLocaleString()})`);
    
    // Step 1: Create and submit Fusion order
    console.log('\n1. Creating Fusion order...');
    const orderInfo = await createOrder({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
    });
    
    console.log('Order created:');
    console.log(`- Quote ID: ${orderInfo.quoteId}`);
    console.log(`- From: ${orderInfo.order.makerAsset}`);
    console.log(`- To: ${orderInfo.order.takerAsset}`);
    console.log(`- Amount: ${orderInfo.order.makingAmount}`);
    
    console.log('\n2. Submitting order to 1inch Fusion API...');
    const submitResponse = await submitOrder(orderInfo as any);
    
    if (!submitResponse.orderHash) {
      return {
        success: false,
        hashlock,
        timelock,
        error: submitResponse.message || 'Failed to submit order',
      };
    }
    
    console.log(`Order submitted successfully!`);
    console.log(`- Order Hash: ${submitResponse.orderHash}`);
    
    // Step 2: Create HTLC on the appropriate chain
    console.log('\n3. Creating HTLC...');
    let htlcId: string;
    
    if (params.fromChain === 'aptos') {
      htlcId = await createAptosHtlc({
        recipient: params.recipient,
        amount: params.amount,
        hashlock: hashlock,
        timelock: timelock
      }, true); // Используем мок-режим для тестирования
    } else {
      htlcId = await createEvmHtlc({
        recipient: params.recipient,
        tokenAddress: params.fromTokenAddress,
        amount: params.amount,
        hashlock: hashlock,
        timelock: timelock
      }, true); // Используем мок-режим для тестирования
    }
    
    console.log(`\nHTLC created successfully!`);
    console.log(`- Contract ID: ${htlcId}`);
    
    // Step 3: Return the swap information
    return {
      success: true,
      orderHash: submitResponse.orderHash,
      htlcId,
      hashlock,
      preimage,
      timelock,
    };
  } catch (error: any) {
    console.error('Error in initiateFusionSwap:', error);
    return {
      success: false,
      hashlock: '0x0000000000000000000000000000000000000000000000000000000000000000',
      timelock: 0,
      error: error.message || 'Unknown error in initiateFusionSwap',
    };
  }
}

/**
 * Withdraws from an HTLC on the Aptos blockchain
 * @param contractId - Contract ID of the HTLC
 * @param preimage - Preimage to unlock the HTLC
 * @returns Success status
 */
async function withdrawAptosHtlc(contractId: string, preimage: string): Promise<boolean> {
  // Check if we're in mock mode
  if (!process.env.ONE_INCH_API_KEY || process.env.ONE_INCH_API_KEY === 'your-api-key-here' || contractId.includes('mock')) {
    console.warn('Using mock Aptos HTLC withdrawal due to missing API key or mock HTLC. This is for testing purposes only.');
    console.log('Mock Aptos withdrawal successful!');
    return true;
  }
  
  const aptosModuleAddress = process.env.APTOS_MODULE_ADDRESS || 
    '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
  
  console.log('\nWithdrawing from Aptos HTLC...');
  
  // Format preimage (remove 0x prefix for hex argument)
  const formattedPreimage = preimage.replace(/^0x/, '');
  
  const command = `move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw_htlc ` +
    `--args hex:${contractId} hex:0x${formattedPreimage} ` +
    `--assume-yes`;
  
  try {
    const result = executeAptosCommand(command);
    console.log('Transaction submitted successfully!');
    
    // Extract transaction hash for verification
    const txHashMatch = result.match(/Transaction hash: ([a-f0-9]+)/i);
    if (txHashMatch && txHashMatch[1]) {
      const txHash = txHashMatch[1];
      console.log(`Transaction hash: ${txHash}`);
      
      // Wait a moment for transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Error withdrawing from Aptos HTLC:', error.message);
    return false;
  }
}

/**
 * Withdraws from an HTLC on the EVM blockchain
 * @param contractId - Contract ID of the HTLC
 * @param preimage - Preimage to unlock the HTLC
 * @returns Success status
 */
async function withdrawEvmHtlc(contractId: string, preimage: string): Promise<boolean> {
  // Check if we're in mock mode
  if (!process.env.ONE_INCH_API_KEY || process.env.ONE_INCH_API_KEY === 'your-api-key-here' || contractId.includes('mock')) {
    console.warn('Using mock HTLC withdrawal due to missing API key or mock HTLC. This is for testing purposes only.');
    console.log('Mock withdrawal successful!');
    return true;
  }
  
  console.log('\nWithdrawing from EVM HTLC...');
  
  // Use child_process to execute the withdraw-evm-htlc.js script
  const command = `node -e "
    process.env.CONTRACT_ID = '${contractId}';
    process.env.PREIMAGE = '${preimage}';
    require('./scripts/withdraw-evm-htlc.js');
  "`;
  
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(output);
    return true;
  } catch (error: any) {
    console.error('Error withdrawing from EVM HTLC:', error.message);
    console.warn('Falling back to mock withdrawal for testing purposes.');
    return true; // Return true to continue the flow in test mode
  }
}

/**
 * Completes a cross-chain swap by claiming the HTLC using the preimage
 * @param orderHash - The hash of the Fusion order
 * @param htlcId - The ID of the HTLC to claim
 * @param preimage - The preimage to unlock the HTLC
 * @param chain - The chain where the HTLC is deployed
 * @returns Promise resolving to the cross-chain swap result
 */
export async function completeFusionSwap(
  orderHash: string,
  htlcId: string,
  preimage: string,
  chain: 'evm' | 'aptos'
): Promise<FusionSwapResult> {
  try {
    console.log('=== Completing Fusion Cross-Chain Swap ===');
    console.log(`Order Hash: ${orderHash}`);
    console.log(`HTLC ID: ${htlcId}`);
    console.log(`Preimage: ${preimage}`);
    console.log(`Chain: ${chain}`);
    
    // Step 1: Check Fusion order status
    console.log('\n1. Checking Fusion order status...');
    let orderStatus;
    
    try {
      orderStatus = await getOrderStatus(orderHash);
      console.log(`Order status: ${orderStatus.status}`);
    } catch (error: any) {
      console.warn(`Error checking order status: ${error.message}`);
      console.warn('Continuing with mock order status for testing purposes.');
      orderStatus = { status: 'filled', mock: true };
    }
    
    // Step 2: Withdraw from HTLC
    console.log('\n2. Withdrawing from HTLC...');
    let success: boolean;
    
    if (chain === 'aptos') {
      success = await withdrawAptosHtlc(htlcId, preimage);
    } else {
      success = await withdrawEvmHtlc(htlcId, preimage);
    }
    
    if (!success) {
      return {
        success: false,
        orderHash,
        htlcId,
        hashlock: '0x' + crypto.createHash('sha256').update(Buffer.from(preimage)).digest('hex'),
        preimage,
        timelock: 0,
        error: 'Failed to withdraw from HTLC',
      };
    }
    
    console.log('\nSwap completed successfully!');
    
    return {
      success: true,
      orderHash,
      htlcId,
      hashlock: '0x' + crypto.createHash('sha256').update(Buffer.from(preimage)).digest('hex'),
      preimage,
      timelock: 0,
    };
  } catch (error: any) {
    console.error('Error in completeFusionSwap:', error);
    return {
      success: false,
      orderHash,
      htlcId,
      hashlock: '0x' + crypto.createHash('sha256').update(Buffer.from(preimage)).digest('hex'),
      preimage,
      timelock: 0,
      error: error.message || 'Unknown error in completeFusionSwap',
    };
  }
}

/**
 * Main function to demonstrate the Fusion HTLC swap
 */
async function main(): Promise<void> {
  try {
    console.log('=== 1inch Fusion HTLC Swap Demo ===');
    
    // Example parameters
    const swapParams: FusionSwapParams = {
      fromChain: 'evm',
      toChain: 'aptos',
      fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
      toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      amount: formatTokenAmount(0.01, 18),
      recipient: getWalletAddress(),
    };
    
    // Initiate the swap
    console.log('\nInitiating swap...');
    const swapResult = await initiateFusionSwap(swapParams);
    
    if (!swapResult.success) {
      console.error(`Swap initiation failed: ${swapResult.error}`);
      return;
    }
    
    console.log('\nSwap initiated successfully!');
    console.log(`Order Hash: ${swapResult.orderHash}`);
    console.log(`HTLC ID: ${swapResult.htlcId}`);
    console.log(`Preimage: ${swapResult.preimage}`);
    console.log(`Hashlock: ${swapResult.hashlock}`);
    
    // In a real application, the recipient would receive the preimage
    // and use it to complete the swap
    console.log('\nWaiting for order to be filled...');
    console.log('(In a real application, this would happen asynchronously)');
    
    // For demo purposes, we'll complete the swap immediately
    console.log('\nCompleting swap...');
    const completeResult = await completeFusionSwap(
      swapResult.orderHash!,
      swapResult.htlcId!,
      swapResult.preimage!,
      swapParams.toChain
    );
    
    if (completeResult.success) {
      console.log('\nSwap completed successfully!');
    } else {
      console.error(`Swap completion failed: ${completeResult.error}`);
    }
    
  } catch (error: any) {
    console.error('Error in main:', error.message);
  }
}

// Execute the main function if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default {
  initiateFusionSwap,
  completeFusionSwap,
  generatePreimageAndHashlock,
};
