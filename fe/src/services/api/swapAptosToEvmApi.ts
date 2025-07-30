import { apiClient } from './index';

/**
 * Interface for Aptos -> EVM swap creation request
 */
export interface CreateSwapAptosToEvmRequest {
  readonly aptosSenderAddress: string;
  readonly evmRecipientAddress: string;
  readonly aptosTokenType: string;
  readonly evmTokenAddress: string;
  readonly amount: string;
}

/**
 * Interface for swap creation response
 */
export interface CreateSwapResponse {
  readonly swapId: string;
  readonly status: string;
  readonly aptosHtlcId?: string;
  readonly evmHtlcId?: string;
  readonly preimage?: string;
  readonly hashlock: string;
  readonly timelock: number;
}

/**
 * Interface for swap status
 */
export interface SwapStatus {
  readonly swapId: string;
  readonly status: string;
  readonly aptosHtlcId?: string;
  readonly evmHtlcId?: string;
  readonly aptosHtlcStatus?: string;
  readonly evmHtlcStatus?: string;
  readonly preimage?: string;
  readonly hashlock: string;
  readonly timelock: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Service for working with Aptos -> EVM swap API
 */
export class SwapAptosToEvmApiService {
  private readonly baseUrl = '/swap-aptos-to-evm';

  /**
   * Initiates a swap from Aptos to EVM
   * @param request - Swap creation data
   * @returns Promise with created swap data
   */
  public async createSwap(request: CreateSwapAptosToEvmRequest): Promise<CreateSwapResponse> {
    return apiClient.post<CreateSwapResponse>(`${this.baseUrl}/create`, request);
  }

  /**
   * Gets swap status by its ID
   * @param swapId - Swap ID
   * @returns Promise with swap status data
   */
  public async getSwapStatus(swapId: string): Promise<SwapStatus> {
    return apiClient.get<SwapStatus>(`${this.baseUrl}/status/${swapId}`);
  }

  /**
   * Completes the swap (withdraws funds from HTLC on EVM)
   * @param swapId - Swap ID
   * @returns Promise with operation result
   */
  public async completeSwap(swapId: string): Promise<{ success: boolean; txHash?: string }> {
    return apiClient.post<{ success: boolean; txHash?: string }>(`${this.baseUrl}/complete/${swapId}`);
  }

  /**
   * Cancels the swap (returns funds to the sender)
   * @param swapId - Swap ID
   * @returns Promise with operation result
   */
  public async cancelSwap(swapId: string): Promise<{ success: boolean; txHash?: string }> {
    return apiClient.post<{ success: boolean; txHash?: string }>(`${this.baseUrl}/cancel/${swapId}`);
  }

  /**
   * Gets swap history for the specified address
   * @param address - Wallet address (Aptos or EVM)
   * @returns Promise with swap list
   */
  public async getSwapHistory(address: string): Promise<SwapStatus[]> {
    return apiClient.get<SwapStatus[]>(`${this.baseUrl}/history/${address}`);
  }
}

/**
 * Instance of the service for working with Aptos -> EVM swap API
 */
export const swapAptosToEvmApiService = new SwapAptosToEvmApiService();
