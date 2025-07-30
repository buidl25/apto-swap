/**
 * Environment variables configuration
 */

/**
 * Environment variables interface
 */
export interface EnvConfig {
  readonly apiUrl: string;
  readonly evmChainId: number;
  readonly evmNetworkName: string;
  readonly aptosNetworkName: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
}

/**
 * Gets environment variables with proper fallbacks
 * @returns Environment configuration
 */
export const getEnvConfig = (): EnvConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;

  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3346',
    evmChainId: parseInt(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || '11155111', 10), // Sepolia testnet by default
    evmNetworkName: process.env.NEXT_PUBLIC_EVM_NETWORK_NAME || 'Sepolia',
    aptosNetworkName: process.env.NEXT_PUBLIC_APTOS_NETWORK_NAME || 'Testnet',
    isProduction,
    isDevelopment,
  };
};

/**
 * Environment configuration singleton
 */
export const env = getEnvConfig();
