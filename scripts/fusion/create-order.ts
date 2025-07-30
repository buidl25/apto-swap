/**
 * 1inch Fusion order creation module
 * Provides functionality for creating and signing Fusion orders
 */

import { FusionSDK } from '@1inch/fusion-sdk';
// Import types from SDK - use a more general path that should work
import type { PreparedOrder } from '@1inch/fusion-sdk';

// Define our own OrderInfo type that's compatible with what we need
export interface OrderInfo {
  orderHash?: string;
  signature?: string;
  extension?: any;
  [key: string]: any; // Allow additional properties
}
// Define AuctionSalt and AuctionSuffix types based on SDK usage
export interface AuctionSalt {
  readonly deadline: number;
  readonly auctionStartTime: number;
  readonly initialRateBump: number;
  readonly duration: number;
}

export interface AuctionSuffix {
  readonly points: string[];
  readonly whitelist: string[];
}
import { createFusionSdk, getWalletAddress } from './sdk-setup';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Parameters for creating a Fusion order
 */
export interface CreateOrderParams {
  readonly fromTokenAddress: string;
  readonly toTokenAddress: string;
  readonly amount: string;
  readonly recipient?: string;
  readonly walletAddress?: string;
  readonly privateKey?: string;
  readonly slippagePercentage?: number;
  readonly auctionDuration?: number;
  readonly auctionStartTime?: number;
  readonly resolverAddress?: string;
  readonly resolverCalldata?: string;
  readonly decimals?: number;
}

/**
 * Default parameters for order creation
 */
const defaultOrderParams: Partial<CreateOrderParams> = {
  walletAddress: undefined, // Will be derived from private key if not provided
  privateKey: process.env.EVM_PRIVATE_KEY,
  slippagePercentage: 1, // 1% slippage by default
  auctionDuration: 180, // 3 minutes by default
  auctionStartTime: Math.floor(Date.now() / 1000), // Current timestamp
};

/**
 * Creates a Fusion order with the specified parameters
 * @param params - Order creation parameters
 * @returns Promise resolving to the created order info
 */
export const createOrder = async (
  params: CreateOrderParams
): Promise<OrderInfo> => {
  // Validate required parameters
  if (!params.fromTokenAddress) {
    throw new Error('fromTokenAddress is required');
  }
  
  if (!params.toTokenAddress) {
    throw new Error('toTokenAddress is required');
  }
  
  if (params.amount === undefined || params.amount === null) {
    throw new Error('amount is required');
  }
  
  // Merge with default parameters
  const mergedParams = {
    ...defaultOrderParams,
    ...params,
  };

  // Derive wallet address from private key if not provided
  const walletAddress = mergedParams.walletAddress || 
    (mergedParams.privateKey ? getWalletAddress(mergedParams.privateKey) : undefined);
  
  if (!walletAddress) {
    throw new Error('Wallet address is required either directly or via private key');
  }

  // Initialize Fusion SDK
  const sdk = createFusionSdk();

  // Check if SDK is properly initialized
  if (!sdk) {
    throw new Error('Failed to initialize Fusion SDK');
  }

  // Create order parameters
  const orderParams: any = {
    fromTokenAddress: mergedParams.fromTokenAddress,
    toTokenAddress: mergedParams.toTokenAddress,
    amount: mergedParams.amount,
    walletAddress,
    slippagePercentage: mergedParams.slippagePercentage,
    source: 'cross-chain-swap',
  };

  // Add optional parameters if provided
  if (mergedParams.recipient) {
    orderParams.recipient = mergedParams.recipient;
  }
  
  if (mergedParams.resolverAddress) {
    orderParams.resolverAddress = mergedParams.resolverAddress;
  }
  
  if (mergedParams.resolverCalldata) {
    orderParams.resolverCalldata = mergedParams.resolverCalldata;
  }

  try {
    // Create the order
    const order = await sdk.createOrder(orderParams);
    
    // Cast the prepared order to our OrderInfo type
    return order as unknown as OrderInfo;
  } catch (error) {
    console.error('Error creating Fusion order:', error);
    throw error;
  }
};

/**
 * Creates a custom auction salt for a Fusion order
 * @param duration - Auction duration in seconds
 * @param startTime - Auction start time in seconds (unix timestamp)
 * @returns AuctionSalt object
 */
export const createCustomAuctionSalt = (
  duration: number = defaultOrderParams.auctionDuration!,
  startTime: number = defaultOrderParams.auctionStartTime!
): AuctionSalt => {
  // Create auction salt object directly
  const salt: AuctionSalt = {
    duration: duration,
    auctionStartTime: startTime,
    initialRateBump: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600 * 24 * 7, // 7 days
  };

  return salt;
};

/**
 * Calculates the auction end time for a given order
 * @param order - The order info returned from createOrder
 * @returns The auction end time as a unix timestamp
 */
export const getAuctionEndTime = (order: OrderInfo): number => {
  const salt = order.order.salt;
  const auctionStartTime = parseInt(salt.slice(-16, -8), 16);
  const duration = parseInt(salt.slice(-8), 16);
  
  return auctionStartTime + duration;
};

/**
 * Formats a token amount with proper decimals
 * @param amount - The amount as a number or string
 * @param decimals - The number of decimals for the token
 * @returns The formatted amount as a string
 */
export const formatTokenAmount = (amount: number | string, decimals: number): string => {
  // Handle zero amount case explicitly
  if (amount === 0 || amount === '0') {
    return '0';
  }
  
  try {
    const amountBN = BigInt(
      typeof amount === 'string' ? 
        // Handle string with decimal point
        amount.includes('.') ? 
          BigInt(Math.floor(parseFloat(amount) * 10**decimals)).toString() : 
          amount
        : Math.floor(amount * 10**decimals).toString()
    );
    return amountBN.toString();
  } catch (error) {
    console.error('Error formatting token amount:', error);
    throw new Error(`Invalid amount format: ${amount}`);
  }
};

export default {
  createOrder,
  createCustomAuctionSalt,
  getAuctionEndTime,
  formatTokenAmount,
};
