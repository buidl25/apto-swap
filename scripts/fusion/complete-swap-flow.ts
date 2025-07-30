/**
 * Complete Cross-Chain Swap Flow with 1inch Fusion and HTLC
 * 
 * This script demonstrates the complete flow of a cross-chain swap using
 * 1inch Fusion for token swaps and HTLC for atomic cross-chain security.
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { createFusionSdk, getWalletAddress } from './sdk-setup';
import { createOrder, formatTokenAmount } from './create-order';
import { submitOrder, getOrderStatus, waitForOrderCompletion } from './execute-order';
import { initiateFusionSwap, completeFusionSwap, generatePreimageAndHashlock } from './fusion-htlc-swap';

// Load environment variables
dotenv.config();

/**
 * Swap direction types
 */
export type SwapDirection = 'evm-to-aptos' | 'aptos-to-evm';

/**
 * Parameters for a complete cross-chain swap
 */
export interface CompleteSwapParams {
  readonly direction: SwapDirection;
  readonly fromTokenAddress: string;
  readonly toTokenAddress: string;
  readonly amount: string | number;
  readonly decimals: number;
  readonly recipient?: string;
  readonly timelock?: number;
}

/**
 * Result of a complete cross-chain swap
 */
export interface CompleteSwapResult {
  readonly success: boolean;
  readonly direction: SwapDirection;
  readonly orderHash?: string;
  readonly htlcId?: string;
  readonly preimage?: string;
  readonly hashlock?: string;
  readonly timelock?: number;
  readonly error?: string;
}

/**
 * Executes a complete cross-chain swap with 1inch Fusion and HTLC
 * @param params - Parameters for the cross-chain swap
 * @returns Promise resolving to the cross-chain swap result
 */
export async function executeCompleteSwap(
  params: CompleteSwapParams
): Promise<CompleteSwapResult> {
  try {
    console.log('=== Executing Complete Cross-Chain Swap ===');
    console.log(`Direction: ${params.direction}`);
    console.log(`From Token: ${params.fromTokenAddress}`);
    console.log(`To Token: ${params.toTokenAddress}`);
    console.log(`Amount: ${params.amount} (${params.decimals} decimals)`);
    
    // Format amount with correct decimals
    const formattedAmount = formatTokenAmount(params.amount, params.decimals);
    
    // Determine source and destination chains
    const fromChain = params.direction.startsWith('evm') ? 'evm' : 'aptos';
    const toChain = params.direction.endsWith('aptos') ? 'aptos' : 'evm';
    
    // Get wallet address if recipient not specified
    const recipient = params.recipient || getWalletAddress();
    console.log(`Recipient: ${recipient}`);
    
    // Step 1: Generate preimage and hashlock
    console.log('\n1. Generating preimage and hashlock...');
    const { preimage, hashlock } = generatePreimageAndHashlock();
    console.log(`Preimage: ${preimage}`);
    console.log(`Hashlock: ${hashlock}`);
    
    // Step 2: Calculate timelock (default: 30 minutes from now)
    const timelock = params.timelock || Math.floor(Date.now() / 1000) + 1800;
    console.log(`Timelock: ${timelock} (${new Date(timelock * 1000).toLocaleString()})`);
    
    // Step 3: Initiate the swap
    console.log('\n2. Initiating swap...');
    const swapResult = await initiateFusionSwap({
      fromChain,
      toChain,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: formattedAmount,
      recipient,
      timelock,
      preimage,
    });
    
    if (!swapResult.success) {
      return {
        success: false,
        direction: params.direction,
        error: swapResult.error || 'Failed to initiate swap',
      };
    }
    
    console.log('\nSwap initiated successfully!');
    console.log(`Order Hash: ${swapResult.orderHash}`);
    console.log(`HTLC ID: ${swapResult.htlcId}`);
    
    // Step 4: Wait for the Fusion order to be filled
    console.log('\n3. Waiting for Fusion order to be filled...');
    if (swapResult.orderHash) {
      try {
        const orderStatus = await waitForOrderCompletion(swapResult.orderHash, 60000); // 1 minute timeout
        console.log(`Order status: ${orderStatus.status}`);
        
        if (orderStatus.status !== 'filled') {
          console.log('Order not filled yet. In a production environment, this would be monitored asynchronously.');
        }
      } catch (error: any) {
        console.warn(`Warning: ${error.message}`);
        console.log('Continuing with the flow despite order status check failure.');
      }
    }
    
    // Step 5: Complete the swap by claiming the HTLC
    console.log('\n4. Completing swap by claiming HTLC...');
    const completeResult = await completeFusionSwap(
      swapResult.orderHash!,
      swapResult.htlcId!,
      swapResult.preimage!,
      toChain as 'evm' | 'aptos'
    );
    
    if (!completeResult.success) {
      return {
        success: false,
        direction: params.direction,
        orderHash: swapResult.orderHash,
        htlcId: swapResult.htlcId,
        preimage: swapResult.preimage,
        hashlock: swapResult.hashlock,
        timelock: swapResult.timelock,
        error: completeResult.error || 'Failed to complete swap',
      };
    }
    
    console.log('\n✅ Swap completed successfully!');
    
    return {
      success: true,
      direction: params.direction,
      orderHash: swapResult.orderHash,
      htlcId: swapResult.htlcId,
      preimage: swapResult.preimage,
      hashlock: swapResult.hashlock,
      timelock: swapResult.timelock,
    };
  } catch (error: any) {
    console.error('Error in executeCompleteSwap:', error);
    return {
      success: false,
      direction: params.direction,
      error: error.message || 'Unknown error in executeCompleteSwap',
    };
  }
}

/**
 * Main function to demonstrate the complete swap flow
 */
async function main(): Promise<void> {
  try {
    console.log('=== 1inch Fusion HTLC Complete Swap Flow Demo ===');
    
    // Example parameters for EVM to Aptos swap
    const swapParams: CompleteSwapParams = {
      direction: 'evm-to-aptos',
      // Using WETH instead of native ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)
      // because 1inch Fusion API requires native currency to be wrapped first
      fromTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
      toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      amount: 0.01,
      decimals: 18,
    };
    
    // Execute the complete swap
    const result = await executeCompleteSwap(swapParams);
    
    if (result.success) {
      console.log('\n🎉 Complete swap flow executed successfully!');
      console.log('=== Swap Details ===');
      console.log(`Direction: ${result.direction}`);
      console.log(`Order Hash: ${result.orderHash}`);
      console.log(`HTLC ID: ${result.htlcId}`);
      console.log(`Preimage: ${result.preimage}`);
      console.log(`Hashlock: ${result.hashlock}`);
      console.log(`Timelock: ${new Date(result.timelock! * 1000).toLocaleString()}`);
    } else {
      console.error(`❌ Complete swap flow failed: ${result.error}`);
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
  executeCompleteSwap,
};
