/**
 * 1inch Fusion order execution module
 * Provides functionality for submitting and monitoring Fusion orders
 */

import { FusionSDK } from '@1inch/fusion-sdk';
import { OrderInfo } from './create-order';

// Define custom types to match the SDK's actual structure
export interface FusionOrder {
  order: any;
  quoteId: string;
  [key: string]: any;
}

export interface OrderStatus {
  orderHash: string;
  [key: string]: any;
}

export interface OrderStatusResponse {
  orderHash: string;
  filledAmount?: string;
  settlement?: {
    tx: string;
    [key: string]: any;
  };
  [key: string]: any;
}
import { createFusionSdk } from './sdk-setup';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Response from submitting an order
 */
export interface SubmitOrderResponse {
  readonly orderHash: string;
  readonly status: string;
  readonly message?: string;
}

/**
 * Submits a Fusion order to the 1inch API
 * @param order - The order object from createOrder
 * @returns Promise resolving to the submission response
 */
export const submitOrder = async (
  order: OrderInfo
): Promise<SubmitOrderResponse> => {
  // Initialize Fusion SDK
  const sdk = createFusionSdk();

  // Check if SDK is properly initialized
  if (!sdk) {
    throw new Error('Failed to initialize Fusion SDK');
  }

  // Validate order object
  if (!order || !order.order) {
    return {
      orderHash: '',
      status: 'failed',
      message: 'Invalid order: order object is missing or malformed',
    };
  }

  // Validate signature
  if (!order.signature) {
    return {
      orderHash: '',
      status: 'failed',
      message: 'Invalid order: signature is required',
    };
  }

  // Validate quoteId
  if (!order.quoteId) {
    return {
      orderHash: '',
      status: 'failed',
      message: 'Invalid order: quoteId is required',
    };
  }

  try {
    // Submit the order with type assertion
    const response = await sdk.submitOrder(order.order as any, order.quoteId as string);
    
    return {
      orderHash: response.orderHash,
      status: 'submitted',
    };
  } catch (error: any) {
    console.error('Error submitting Fusion order:', error);
    
    return {
      orderHash: '',
      status: 'failed',
      message: error.message || 'Unknown error',
    };
  }
};

/**
 * Gets the status of a Fusion order
 * @param orderHash - The hash of the order to check
 * @returns Promise resolving to the order status
 */
export const getOrderStatus = async (
  orderHash: string
): Promise<OrderStatusResponse> => {
  // Initialize Fusion SDK
  const sdk = createFusionSdk();

  // Check if SDK is properly initialized
  if (!sdk) {
    throw new Error('Failed to initialize Fusion SDK');
  }

  // Validate order hash
  if (!orderHash || orderHash.trim() === '') {
    throw new Error('Invalid order hash: order hash is required');
  }

  // Validate format (should be a hex string starting with 0x)
  if (!orderHash.startsWith('0x') || orderHash.length !== 66) {
    throw new Error('Invalid order hash: hash format is invalid');
  }

  try {
    // Get the order status
    const status = await sdk.getOrderStatus(orderHash);
    
    // Cast to our custom OrderStatusResponse type
    return status as unknown as OrderStatusResponse;
  } catch (error) {
    console.error('Error getting order status:', error);
    throw error;
  }
};

/**
 * Gets all active orders for a maker address
 * @param makerAddress - The address of the maker
 * @returns Promise resolving to an array of active orders
 */
export const getActiveOrdersByMaker = async (
  makerAddress: string
): Promise<OrderStatus[]> => {
  // Initialize Fusion SDK
  const sdk = createFusionSdk();

  // Check if SDK is properly initialized
  if (!sdk) {
    throw new Error('Failed to initialize Fusion SDK');
  }

  // Validate maker address
  if (!makerAddress || makerAddress.trim() === '') {
    throw new Error('Maker address is required');
  }

  // Basic validation for Ethereum address format
  if (!makerAddress.startsWith('0x') || makerAddress.length !== 42) {
    throw new Error('Invalid maker address format');
  }

  try {
    // Get the orders with proper parameters
    const orders = await sdk.getOrdersByMaker({
      address: makerAddress,
      page: 1,
      limit: 50
    });
    
    // Handle case where orders or items might be undefined
    if (!orders || !orders.items) {
      return [];
    }
    
    // Cast to our custom OrderStatus type
    return orders.items as unknown as OrderStatus[];
  } catch (error) {
    console.error('Error getting active orders:', error);
    throw error;
  }
};

/**
 * Waits for an order to be filled or expired
 * @param orderHash - The hash of the order to monitor
 * @param pollIntervalMs - Polling interval in milliseconds
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns Promise resolving to the final order status
 */
export const waitForOrderCompletion = async (
  orderHash: string,
  pollIntervalMs: number = 5000,
  timeoutMs: number = 300000
): Promise<OrderStatusResponse> => {
  // Validate order hash
  if (!orderHash || orderHash.trim() === '') {
    throw new Error('Invalid order hash: order hash is required');
  }

  const startTime = Date.now();
  let lastError: Error | null = null;
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await getOrderStatus(orderHash);
      
      // Check if order is in a terminal state
      if (
        status.status === 'filled' || 
        status.status === 'cancelled' || 
        status.status === 'expired'
      ) {
        return status;
      }
      
      // Reset error if we got a successful response
      lastError = null;
    } catch (error: any) {
      console.warn(`Error polling order status: ${error.message}`);
      lastError = error;
      
      // Don't immediately retry on persistent errors
      if (error.message.includes('Invalid order hash')) {
        throw error;
      }
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  // If we reach here, we've timed out
  if (lastError) {
    throw new Error(`Order monitoring failed: ${lastError.message}`);
  } else {
    throw new Error(`Order monitoring timed out after ${timeoutMs}ms`);
  }
};

/**
 * Formats order status for display
 * @param status - The order status response
 * @returns A formatted string representation of the order status
 */
export const formatOrderStatus = (status: OrderStatusResponse): string => {
  const statusMap: Record<string, string> = {
    'pending': '⏳ Pending',
    'filled': '✅ Filled',
    'cancelled': '❌ Cancelled',
    'expired': '⏰ Expired',
  };
  
  const formattedStatus = statusMap[status.status] || status.status;
  
  return `Order ${status.orderHash.substring(0, 8)}...${status.orderHash.substring(58)}
Status: ${formattedStatus}
${status.filledAmount ? `Filled Amount: ${status.filledAmount}` : ''}
${status.settlement ? `Settlement TX: ${status.settlement.tx.substring(0, 8)}...` : ''}`;
};

export default {
  submitOrder,
  getOrderStatus,
  getActiveOrdersByMaker,
  waitForOrderCompletion,
  formatOrderStatus,
};
