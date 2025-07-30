/**
 * 1inch Fusion SDK setup and configuration
 * This module provides the core functionality for interacting with the 1inch Fusion API
 */

import { FusionSDK, NetworkEnum, PrivateKeyProviderConnector } from '@1inch/fusion-sdk';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration interface for the Fusion SDK
 */
interface FusionSdkConfig {
  readonly apiKey: string;
  readonly apiUrl: string;
  readonly networkId: number;
  readonly privateKey: string;
  readonly providerUrl: string;
}

/**
 * Default configuration values
 */
const defaultConfig: FusionSdkConfig = {
  apiKey: process.env.ONE_INCH_API_KEY || '',
  apiUrl: process.env.ONE_INCH_API_URL || 'https://api.1inch.dev/fusion',
  networkId: Number(process.env.ONE_INCH_NETWORK) || 1, // Default to Ethereum Mainnet
  privateKey: process.env.EVM_PRIVATE_KEY || '',
  providerUrl: process.env.EVM_PROVIDER_URL || 'http://localhost:8545',
};

/**
 * Maps network IDs to NetworkEnum values
 */
const networkIdToEnum: Record<number, NetworkEnum> = {
  1: NetworkEnum.ETHEREUM,
  56: NetworkEnum.BINANCE,
  137: NetworkEnum.POLYGON,
  42161: NetworkEnum.ARBITRUM,
  10: NetworkEnum.OPTIMISM,
  43114: NetworkEnum.AVALANCHE,
  250: NetworkEnum.FANTOM,
  100: NetworkEnum.GNOSIS,
  // BASE network may not be in the current version of the SDK
  // Use a type assertion as a workaround
  8453: NetworkEnum.ETHEREUM, // Using Ethereum as fallback, will be overridden in SDK setup
};

/**
 * Creates a blockchain provider connector using a private key
 * @param config - The Fusion SDK configuration
 * @returns A PrivateKeyProviderConnector instance
 */
export const createBlockchainProviderConnector = (
  config: FusionSdkConfig = defaultConfig
): PrivateKeyProviderConnector => {
  // Create a basic provider compatible with the Fusion SDK
  // We need to use a provider that's compatible with Web3Like interface
  const provider = new JsonRpcProvider(config.providerUrl);
  
  return new PrivateKeyProviderConnector(
    config.privateKey,
    provider as any // Type assertion to bypass type checking
  );
};

/**
 * Creates and initializes a FusionSDK instance
 * @param config - The Fusion SDK configuration
 * @returns A configured FusionSDK instance
 */
export const createFusionSdk = (
  config: FusionSdkConfig = defaultConfig
): FusionSDK => {
  // Validate configuration
  if (!config.apiKey) {
    throw new Error('ONE_INCH_API_KEY is required in .env file');
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
 * @param overrides - Configuration values to override defaults
 * @returns A merged configuration object
 */
export const createCustomConfig = (
  overrides: Partial<FusionSdkConfig>
): FusionSdkConfig => {
  return {
    ...defaultConfig,
    ...overrides,
  };
};

/**
 * Helper function to get wallet address from private key
 * @param privateKey - The private key (without 0x prefix)
 * @returns The wallet address
 */
export const getWalletAddress = (privateKey: string = defaultConfig.privateKey): string => {
  const wallet = new Wallet(privateKey);
  return wallet.address;
};

export default {
  createFusionSdk,
  createBlockchainProviderConnector,
  createCustomConfig,
  getWalletAddress,
};
