import { apiClient } from './index';

/**
 * Interface for token balance data
 */
export interface TokenBalance {
  readonly address: string;
  readonly symbol: string;
  readonly balance: string;
  readonly decimals: number;
}

/**
 * Interface for token information
 */
export interface TokenInfo {
  readonly address: string;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly logoUrl?: string;
}

/**
 * Service for working with EVM API
 */
export class EvmApiService {
  private readonly baseUrl = '/evm';

  /**
   * Gets token balance for the specified address
   * @param address - Wallet address
   * @param tokenAddress - Token address
   * @returns Promise with balance data
   */
  public async getTokenBalance(address: string, tokenAddress: string): Promise<TokenBalance> {
    return apiClient.get<TokenBalance>(`${this.baseUrl}/balance/${address}/${tokenAddress}`);
  }

  /**
   * Gets list of available tokens
   * @returns Promise with token list
   */
  public async getAvailableTokens(): Promise<TokenInfo[]> {
    return apiClient.get<TokenInfo[]>(`${this.baseUrl}/tokens`);
  }

  /**
   * Gets information about the EVM node
   * @returns Promise with node information
   */
  public async getNodeInfo(): Promise<{ chainId: number; networkName: string }> {
    return apiClient.get<{ chainId: number; networkName: string }>(`${this.baseUrl}/node-info`);
  }

  /**
   * Deploys HTLC contract
   * @returns Promise with contract address
   */
  public async deployHtlcContract(): Promise<{ address: string }> {
    return apiClient.post<{ address: string }>(`${this.baseUrl}/deploy-htlc`);
  }
}

/**
 * Instance of the service for working with EVM API
 */
export const evmApiService = new EvmApiService();
