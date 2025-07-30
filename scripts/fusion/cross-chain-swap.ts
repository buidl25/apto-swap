/**
 * 1inch Fusion cross-chain swap integration
 * Connects Fusion swap functionality with HTLC-based atomic swaps
 */

import { OrderInfo } from './create-order';
import { OrderStatusResponse } from './execute-order';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { createOrder } from './create-order';
import { submitOrder, getOrderStatus, waitForOrderCompletion } from './execute-order';
import { createFusionSdk, getWalletAddress } from './sdk-setup';

dotenv.config();

/**
 * Parameters for a cross-chain Fusion swap
 */
export interface CrossChainSwapParams {
  readonly fromChain: 'evm' | 'aptos';
  readonly toChain: 'evm' | 'aptos';
  readonly fromTokenAddress: string;
  readonly toTokenAddress: string;
  readonly amount: string;
  readonly recipient: string;
  readonly timelock?: number;
  readonly preimage?: string;
  readonly privateKey?: string;
}

/**
 * Result of a cross-chain swap operation
 */
export interface CrossChainSwapResult {
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
 * Creates a hashlock from a preimage
 * @param preimage - The preimage as a hex string
 * @returns The hashlock as a hex string
 */
export const createHashlockFromPreimage = (preimage: string): string => {
  // Remove '0x' prefix if present
  const cleanPreimage = preimage.startsWith('0x') ? preimage.slice(2) : preimage;
  
  // Create SHA-256 hash of the preimage
  return '0x' + crypto.createHash('sha256').update(Buffer.from(cleanPreimage, 'hex')).digest('hex');
};

/**
 * Initiates a Fusion order with HTLC protection
 * @param params - Parameters for the cross-chain swap
 * @returns Promise resolving to the cross-chain swap result
 */
export const initiateFusionSwapWithHtlc = async (
  params: CrossChainSwapParams
): Promise<CrossChainSwapResult> => {
  try {
    // Generate preimage and hashlock if not provided
    const { preimage, hashlock } = params.preimage 
      ? { preimage: params.preimage, hashlock: createHashlockFromPreimage(params.preimage) }
      : generatePreimageAndHashlock();
    
    // Calculate timelock (default: 30 minutes from now)
    const timelock = params.timelock || Math.floor(Date.now() / 1000) + 1800;
    
    // Create the order
    const orderInfo = await createOrder({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      privateKey: params.privateKey,
    });
    
    // Use type assertion to ensure compatibility
    const submitResponse = await submitOrder(orderInfo as any);
    
    if (!submitResponse.orderHash) {
      return {
        success: false,
        hashlock,
        timelock,
        error: submitResponse.message || 'Failed to submit order',
      };
    }
    
    // TODO: Create HTLC on the appropriate chain based on params.fromChain
    // This would call the appropriate HTLC creation function
    // For now, we'll just return the order information
    
    return {
      success: true,
      orderHash: submitResponse.orderHash,
      hashlock,
      preimage,
      timelock,
    };
  } catch (error: any) {
    return {
      success: false,
      hashlock: '0x0000000000000000000000000000000000000000000000000000000000000000',
      timelock: 0,
      error: error.message || 'Unknown error in initiateFusionSwapWithHtlc',
    };
  }
};

/**
 * Completes a cross-chain swap by claiming the HTLC using the preimage
 * @param orderHash - The hash of the Fusion order
 * @param htlcId - The ID of the HTLC to claim
 * @param preimage - The preimage to unlock the HTLC
 * @param chain - The chain where the HTLC is deployed
 * @returns Promise resolving to the cross-chain swap result
 */
export const completeFusionSwap = async (
  orderHash: string,
  htlcId: string,
  preimage: string,
  chain: 'evm' | 'aptos'
): Promise<CrossChainSwapResult> => {
  try {
    // Check Fusion order status
    const orderStatus = await getOrderStatus(orderHash);
    
    if (orderStatus.status !== 'filled') {
      return {
        success: false,
        orderHash,
        htlcId,
        hashlock: createHashlockFromPreimage(preimage),
        preimage,
        timelock: 0,
        error: `Order is not filled. Current status: ${orderStatus.status}`,
      };
    }
    
    // TODO: Claim the HTLC on the appropriate chain
    // This would call the appropriate HTLC withdrawal function
    // For now, we'll just return the order status
    
    return {
      success: true,
      orderHash,
      htlcId,
      hashlock: createHashlockFromPreimage(preimage),
      preimage,
      timelock: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      orderHash,
      htlcId,
      hashlock: createHashlockFromPreimage(preimage),
      preimage,
      timelock: 0,
      error: error.message || 'Unknown error in completeFusionSwap',
    };
  }
};

/**
 * Monitors a Fusion order and HTLC status
 * @param orderHash - The hash of the Fusion order
 * @param htlcId - The ID of the HTLC
 * @param chain - The chain where the HTLC is deployed
 * @returns Promise resolving to the combined status
 */
export const monitorFusionSwapStatus = async (
  orderHash: string,
  htlcId: string,
  chain: 'evm' | 'aptos'
): Promise<{
  orderStatus: OrderStatusResponse;
  htlcStatus: any; // Type will depend on HTLC implementation
}> => {
  // Get Fusion order status
  const orderStatus = await getOrderStatus(orderHash);
  
  // TODO: Get HTLC status from the appropriate chain
  // This would call the appropriate HTLC status check function
  // For now, we'll just return a placeholder
  const htlcStatus = { id: htlcId, status: 'pending' };
  
  return {
    orderStatus: orderStatus as OrderStatusResponse,
    htlcStatus,
  };
};

export default {
  initiateFusionSwapWithHtlc,
  completeFusionSwap,
  monitorFusionSwapStatus,
  generatePreimageAndHashlock,
  createHashlockFromPreimage,
};
