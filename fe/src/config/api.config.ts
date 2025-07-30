/**
 * API configuration for different environments
 */
export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
}

/**
 * Configuration for different environments
 */
export interface EnvironmentConfig {
  readonly api: ApiConfig;
}

/**
 * Available environments
 */
export type Environment = 'development' | 'production';

/**
 * Configuration for all environments
 */
const config: Record<Environment, EnvironmentConfig> = {
  development: {
    api: {
      baseUrl: 'http://localhost:3346',
      timeout: 30000,
    },
  },
  production: {
    api: {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.crosschain-swap.com',
      timeout: 30000,
    },
  },
};

/**
 * Gets the current environment from environment variables
 * @returns The current environment
 */
export const getEnvironment = (): Environment => {
  return (process.env.NODE_ENV as Environment) || 'development';
};

/**
 * Gets the configuration for the current environment
 * @returns Configuration for the current environment
 */
export const getConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  return config[env];
};

/**
 * Gets the API configuration for the current environment
 * @returns API configuration
 */
export const getApiConfig = (): ApiConfig => {
  return getConfig().api;
};
