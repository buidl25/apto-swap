import { apiClient } from './index';

/**
 * Interface for EVM -> Aptos swap creation request
 */
export interface CreateSwapEvmToAptosRequest {
  readonly evmSenderAddress: string;
  readonly aptosRecipientAddress: string;
  readonly evmTokenAddress: string;
  readonly aptosTokenType: string;
  readonly amount: string;
}

/**
 * Interface for swap creation response
 */
export interface CreateSwapResponse {
  readonly swapId: string;
  readonly status: string;
  readonly evmHtlcId?: string;
  readonly aptosHtlcId?: string;
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
  readonly evmHtlcId?: string;
  readonly aptosHtlcId?: string;
  readonly evmHtlcStatus?: string;
  readonly aptosHtlcStatus?: string;
  readonly preimage?: string;
  readonly hashlock: string;
  readonly timelock: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Service for working with EVM -> Aptos swap API
 */
export class SwapEvmToAptosApiService {
  private readonly baseUrl = '/swap-evm-to-aptos';

  /**
   * Initiates a swap from EVM to Aptos
   * @param request - Swap creation data
   * @returns Promise with created swap data
   */
  public async createSwap(request: CreateSwapEvmToAptosRequest): Promise<CreateSwapResponse> {
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
   * Completes the swap (withdraws funds from HTLC on Aptos)
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
   * @param address - Wallet address (EVM or Aptos)
   * @returns Promise with swap list
   */
  public async getSwapHistory(address: string): Promise<SwapStatus[]> {
    return apiClient.get<SwapStatus[]>(`${this.baseUrl}/history/${address}`);
  }
}

/**
 * Instance of the service for working with EVM -> Aptos swap API
 */
export const swapEvmToAptosApiService = new SwapEvmToAptosApiService();
