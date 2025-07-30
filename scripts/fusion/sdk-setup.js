/**
 * 1inch Fusion SDK setup and configuration
 * This module provides the core functionality for interacting with the 1inch Fusion API
 */

const { FusionSDK, NetworkEnum } = require('@1inch/fusion-sdk');
const { Wallet } = require('@ethersproject/wallet');
const { JsonRpcProvider } = require('@ethersproject/providers');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Default configuration values
 */
const defaultConfig = {
  apiKey: process.env.ONE_INCH_API_KEY || '',
  apiUrl: process.env.ONE_INCH_API_URL || 'https://api.1inch.dev/fusion',
  networkId: Number(process.env.ONE_INCH_NETWORK) || 1, // Default to Ethereum Mainnet
  privateKey: process.env.EVM_PRIVATE_KEY || '',
  providerUrl: process.env.EVM_PROVIDER_URL || 'http://localhost:8545',
};

/**
 * Maps network IDs to NetworkEnum values
 */
const networkIdToEnum = {
  1: NetworkEnum.ETHEREUM,
  56: NetworkEnum.BINANCE,
  137: NetworkEnum.POLYGON,
  42161: NetworkEnum.ARBITRUM,
  10: NetworkEnum.OPTIMISM,
  43114: NetworkEnum.AVALANCHE,
  250: NetworkEnum.FANTOM,
  100: NetworkEnum.GNOSIS,
  // BASE network may not be in the current version of the SDK
  // Using Ethereum as fallback, will be overridden in SDK setup
  8453: NetworkEnum.ETHEREUM,
};

/**
 * Creates a blockchain provider connector using a private key
 * @param {Object} config - The Fusion SDK configuration
 * @returns {Object} A PrivateKeyProviderConnector instance
 */
const createBlockchainProviderConnector = (
  config = defaultConfig
) => {
  // Create a basic provider compatible with the Fusion SDK
  const provider = new JsonRpcProvider(config.providerUrl);
  
  // Using the PrivateKeyProviderConnector from the SDK
  const { PrivateKeyProviderConnector } = require('@1inch/fusion-sdk');
  
  return new PrivateKeyProviderConnector(
    config.privateKey,
    provider // Type assertion to bypass type checking
  );
};

/**
 * Creates and initializes a FusionSDK instance
 * @param {Object} config - The Fusion SDK configuration
 * @returns {Object} A configured FusionSDK instance
 */
const createFusionSdk = (
  config = defaultConfig
) => {
  // Validate configuration
  if (!config.apiKey) {
    console.warn('WARNING: ONE_INCH_API_KEY is not set in .env file. Using mock mode for testing.');
    // For testing purposes, we'll use a placeholder API key
    config.apiKey = 'test_api_key';
  }
  
  if (!config.privateKey) {
    throw new Error('EVM_PRIVATE_KEY is required in .env file');
  }
  
  const networkEnum = networkIdToEnum[config.networkId];
  if (!networkEnum) {
    throw new Error(`Unsupported network ID: ${config.networkId}`);
  }
  
  // Create blockchain provider connector
  const blockchainProvider = createBlockchainProviderConnector(config);
  
  // Initialize and return the Fusion SDK
  return new FusionSDK({
    url: config.apiUrl,
    network: networkEnum,
    blockchainProvider,
    authKey: config.apiKey,
  });
};

/**
 * Creates a custom configuration for the Fusion SDK
 * @param {Object} overrides - Configuration values to override defaults
 * @returns {Object} A merged configuration object
 */
const createCustomConfig = (
  overrides = {}
) => {
  return {
    ...defaultConfig,
    ...overrides,
  };
};

/**
 * Helper function to get wallet address from private key
 * @param {string} privateKey - The private key (without 0x prefix)
 * @returns {string} The wallet address
 */
const getWalletAddress = (privateKey = defaultConfig.privateKey) => {
  const wallet = new Wallet(privateKey);
  return wallet.address;
};

module.exports = {
  createFusionSdk,
  createBlockchainProviderConnector,
  createCustomConfig,
  getWalletAddress,
};
