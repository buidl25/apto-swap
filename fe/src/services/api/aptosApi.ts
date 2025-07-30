import { apiClient } from './index';

/**
 * Interface for token balance data
 */
export interface AptosTokenBalance {
  readonly tokenType: string;
  readonly symbol: string;
  readonly balance: string;
  readonly decimals: number;
}

/**
 * Interface for token information
 */
export interface AptosTokenInfo {
  readonly tokenType: string;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly logoUrl?: string;
}

/**
 * Service for working with Aptos API
 */
export class AptosApiService {
  private readonly baseUrl = '/aptos';

  /**
   * Gets token balance for the specified address
   * @param address - Wallet address
   * @param tokenType - Token type
   * @returns Promise with balance data
   */
  public async getTokenBalance(address: string, tokenType: string): Promise<AptosTokenBalance> {
    return apiClient.get<AptosTokenBalance>(`${this.baseUrl}/balance/${address}/${encodeURIComponent(tokenType)}`);
  }

  /**
   * Gets list of available tokens
   * @returns Promise with token list
   */
  public async getAvailableTokens(): Promise<AptosTokenInfo[]> {
    return apiClient.get<AptosTokenInfo[]>(`${this.baseUrl}/tokens`);
  }

  /**
   * Registers token for the specified address
   * @param address - Wallet address
   * @param tokenType - Token type
   * @returns Promise with registration result
   */
  public async registerToken(address: string, tokenType: string): Promise<{ success: boolean; txHash?: string }> {
    return apiClient.post<{ success: boolean; txHash?: string }>(`${this.baseUrl}/register-token`, {
      address,
      tokenType,
    });
  }

  /**
   * Initializes HTLC module for the specified address
   * @param address - Wallet address
   * @returns Promise with initialization result
   */
  public async initializeHtlc(address: string): Promise<{ success: boolean; txHash?: string }> {
    return apiClient.post<{ success: boolean; txHash?: string }>(`${this.baseUrl}/initialize-htlc`, {
      address,
    });
  }
}

/**
 * Instance of the service for working with Aptos API
 */
export const aptosApiService = new AptosApiService();
