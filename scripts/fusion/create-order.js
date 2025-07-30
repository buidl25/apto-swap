/**
 * 1inch Fusion order creation module
 * Provides functionality for creating and signing Fusion orders
 */

const { createFusionSdk, getWalletAddress } = require('./sdk-setup');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Default parameters for order creation
 */
const defaultOrderParams = {
  walletAddress: undefined, // Will be derived from private key if not provided
  privateKey: process.env.EVM_PRIVATE_KEY,
  slippagePercentage: 1, // 1% slippage by default
  auctionDuration: 180, // 3 minutes by default
  auctionStartTime: Math.floor(Date.now() / 1000), // Current timestamp
};

/**
 * Creates a Fusion order with the specified parameters
 * @param {Object} params - Order creation parameters
 * @returns {Promise<Object>} Promise resolving to the created order info
 */
const createOrder = async (params) => {
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
  const orderParams = {
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
    return order;
  } catch (error) {
    console.error('Error creating Fusion order:', error);
    
    // If we're in mock mode (using placeholder API key), return a mock order
    if (error.message && (
      error.message.includes('API key') || 
      error.message.includes('Unauthorized') || 
      error.message.includes('Auth error')
    )) {
      console.warn('Using mock order due to API key issues. This is for testing purposes only.');
      return createMockOrder(orderParams);
    }
    
    throw error;
  }
};

/**
 * Creates a custom auction salt for a Fusion order
 * @param {number} duration - Auction duration in seconds
 * @param {number} startTime - Auction start time in seconds (unix timestamp)
 * @returns {Object} AuctionSalt object
 */
const createCustomAuctionSalt = (
  duration = defaultOrderParams.auctionDuration,
  startTime = defaultOrderParams.auctionStartTime
) => {
  // Create auction salt object directly
  const salt = {
    duration: duration,
    auctionStartTime: startTime,
    initialRateBump: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600 * 24 * 7, // 7 days
  };

  return salt;
};

/**
 * Calculates the auction end time for a given order
 * @param {Object} order - The order info returned from createOrder
 * @returns {number} The auction end time as a unix timestamp
 */
const getAuctionEndTime = (order) => {
  const salt = order.order.salt;
  const auctionStartTime = parseInt(salt.slice(-16, -8), 16);
  const duration = parseInt(salt.slice(-8), 16);
  
  return auctionStartTime + duration;
};

/**
 * Formats a token amount with proper decimals
 * @param {number|string} amount - The amount as a number or string
 * @param {number} decimals - The number of decimals for the token
 * @returns {string} The formatted amount as a string
 */
const formatTokenAmount = (amount, decimals) => {
  // Handle zero amount case explicitly
  if (amount === 0 || amount === '0') {
    return '0';
  }
  
  try {
    let amountBN;
    if (typeof amount === 'string') {
      // Handle string with decimal point
      if (amount.includes('.')) {
        amountBN = BigInt(Math.floor(parseFloat(amount) * 10**decimals).toString());
      } else {
        amountBN = BigInt(amount);
      }
    } else {
      amountBN = BigInt(Math.floor(amount * 10**decimals).toString());
    }
    return amountBN.toString();
  } catch (error) {
    console.error('Error formatting token amount:', error);
    throw new Error(`Invalid amount format: ${amount}`);
  }
};

/**
 * Creates a mock order for testing purposes
 * @param {Object} params - Order parameters
 * @returns {Object} A mock order object with all required properties for the flow
 */
const createMockOrder = (params) => {
  const mockOrderHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  const mockSignature = '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  const mockQuoteId = `mock-quote-${Date.now()}`;
  
  // Create the order object with all required properties
  const mockOrder = {
    order: {
      salt: '0x' + Math.floor(Date.now() / 1000).toString(16).padStart(16, '0') + 
            Number(params.auctionDuration || 180).toString(16).padStart(8, '0'),
      makerAsset: params.fromTokenAddress,
      takerAsset: params.toTokenAddress,
      makingAmount: params.amount,
      takingAmount: params.amount, // In a real scenario, this would be calculated based on exchange rate
      maker: params.walletAddress
    },
    orderHash: mockOrderHash,
    signature: mockSignature,
    quoteId: mockQuoteId,
    mock: true, // Flag to indicate this is a mock order
    
    // Add build method that's expected by the SDK
    build: function() {
      return this.order;
    },
    
    auctionStartTime: Math.floor(Date.now() / 1000),
    auctionEndTime: Math.floor(Date.now() / 1000) + (params.auctionDuration || 180)
  };
  
  // Debug output
  console.log('Created mock order:', JSON.stringify(mockOrder, null, 2));
  
  return mockOrder;
};

module.exports = {
  createOrder,
  createCustomAuctionSalt,
  getAuctionEndTime,
  formatTokenAmount,
  createMockOrder, // Export for testing
};
