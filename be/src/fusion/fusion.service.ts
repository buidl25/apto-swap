import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import {
  FusionSwapParamsDto,
  FusionSwapResultDto,
  MonitorSwapParamsDto,
  CompleteSwapParamsDto,
  CompleteSwapResultDto,
  MonitorOrderStatusDto,
  OrderStatusDto,
} from "./dto/fusion-swap.dto";
import { SwapStatusDto } from "../shared/dto/swap.dto";

@Injectable()
export class FusionService {
  private readonly logger = new Logger(FusionService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    const apiUrl = this.configService.get<string>("ONE_INCH_API_URL");
    const apiKey = this.configService.get<string>("ONE_INCH_API_KEY");
    
    if (!apiUrl || !apiKey) {
      throw new Error("ONE_INCH_API_URL and ONE_INCH_API_KEY must be defined in the environment");
    }
    
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async submitOrder(signedOrder: any): Promise<any> {
    this.logger.log("Submitting order to 1inch Fusion");
    const url = `${this.apiUrl}/orderbook/v1.0/orders`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, signedOrder, { headers })
      );
      this.logger.log("Order submitted successfully", response.data);
      return response.data;
    } catch (error) {
      this.logger.error("Error submitting order to 1inch Fusion", error);
      throw error;
    }
  }

  /**
   * Initiates a Fusion HTLC cross-chain swap
   * @param params - Parameters for the cross-chain swap
   * @returns Promise resolving to the cross-chain swap result
   */
  async initiateFusionSwap(
    params: FusionSwapParamsDto
  ): Promise<FusionSwapResultDto> {
    this.logger.log(
      `Initiating Fusion HTLC swap from ${params.fromChain} to ${params.toChain}`
    );

    // Stub implementation
    return Promise.resolve({
      success: true,
      orderHash: "0x" + "5".repeat(64),
      htlcId: "0x" + "6".repeat(40),
      hashlock: "0x" + "7".repeat(64),
      preimage: "0x" + "8".repeat(64),
      timelock: params.timelock || 1800,
    });
  }

  /**
   * Completes a cross-chain swap by claiming the HTLC using the preimage
   * @param orderHash - The hash of the Fusion order
   * @param htlcId - The ID of the HTLC to claim
   * @param preimage - The preimage to unlock the HTLC
   * @param chain - The chain where the HTLC is deployed
   * @returns Promise resolving to the cross-chain swap result
   */
  async completeFusionSwap(
    orderHash: string,
    htlcId: string,
    preimage: string,
    chain: "evm" | "aptos"
  ): Promise<FusionSwapResultDto> {
    this.logger.log(
      `Completing Fusion HTLC swap for order ${orderHash} on ${chain}`
    );

    // Stub implementation
    return Promise.resolve({
      success: true,
      orderHash,
      htlcId,
      hashlock: "0x" + "7".repeat(64),
      preimage,
      timelock: 1800,
    });
  }

  /**
   * Monitors the status of a cross-chain swap
   * @param params - Parameters for monitoring the swap
   * @returns Promise resolving to an array of swap statuses over time
   */
  async monitorSwap(params: MonitorSwapParamsDto): Promise<SwapStatusDto[]> {
    this.logger.log(
      `Monitoring swap for HTLC ${params.htlcId} on ${params.chain}`
    );

    // Stub implementation
    const currentTime = Date.now();
    return Promise.resolve([
      {
        swapId: params.htlcId,
        status: "pending",
        orderStatus: params.orderHash
          ? {
              status: "filled",
              filledAmount: "1000000000000000000",
              settlement: { tx: "0x" + "9".repeat(64) },
            }
          : undefined,
        htlcStatus: {
          exists: true,
          sender: "0x" + "a".repeat(40),
          recipient: "0x" + "b".repeat(40),
          amount: "1000000000000000000",
          hashlock: "0x" + "7".repeat(64),
          timelock: Math.floor(currentTime / 1000) + 1800,
          withdrawn: false,
          refunded: false,
        },
        timestamp: currentTime - 60000,
        hashlock: "0x" + "7".repeat(64),
      },
      {
        swapId: params.htlcId,
        status: "completed",
        orderStatus: params.orderHash
          ? {
              status: "filled",
              filledAmount: "1000000000000000000",
              settlement: { tx: "0x" + "9".repeat(64) },
            }
          : undefined,
        htlcStatus: {
          exists: true,
          sender: "0x" + "a".repeat(40),
          recipient: "0x" + "b".repeat(40),
          amount: "1000000000000000000",
          hashlock: "0x" + "7".repeat(64),
          timelock: Math.floor(currentTime / 1000) + 1800,
          withdrawn: true,
          refunded: false,
        },
        timestamp: currentTime,
        hashlock: "0x" + "7".repeat(64),
      },
    ]);
  }

  /**
   * Gets the current status of a cross-chain swap
   * @param htlcId - The ID of the HTLC
   * @param chain - The chain where the HTLC is deployed
   * @returns Promise resolving to the current swap status
   */
  async getSwapStatus(
    htlcId: string,
    chain: "evm" | "aptos"
  ): Promise<SwapStatusDto> {
    this.logger.log(`Getting swap status for HTLC ${htlcId} on ${chain}`);

    // Stub implementation
    const currentTime = Date.now();
    return Promise.resolve({
      swapId: htlcId,
      status: "pending",
      orderStatus: undefined,
      htlcStatus: {
        exists: true,
        sender: "0x" + "a".repeat(40),
        recipient: "0x" + "b".repeat(40),
        amount: "1000000000000000000",
        hashlock: "0x" + "7".repeat(64),
        timelock: Math.floor(currentTime / 1000) + 1800,
        withdrawn: false,
        refunded: false,
      },
      timestamp: currentTime,
      hashlock: "0x" + "7".repeat(64),
    });
  }

  /**
   * Monitors the status of a Fusion order
   * @param params - Parameters for monitoring the order
   * @returns Promise resolving to the order status
   */
  async monitorOrderStatus(
    params: MonitorOrderStatusDto
  ): Promise<OrderStatusDto> {
    this.logger.log(
      `Monitoring order status for hash ${params.orderHash} on chain ${params.chainId}`
    );
    const url = `${this.apiUrl}/orderbook/v1.0/${params.chainId}/orders/${params.orderHash}`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers })
      );
      this.logger.log("Order status received", response.data);
      return response.data;
    } catch (error) {
      this.logger.error("Error getting order status from 1inch Fusion", error);
      throw error;
    }
  }

  /**
   * Executes a complete cross-chain swap flow
   * @param params - Parameters for the complete swap flow
   * @returns Promise resolving to the complete swap result
   */
  async completeSwapFlow(
    params: CompleteSwapParamsDto
  ): Promise<CompleteSwapResultDto> {
    this.logger.log(`Executing complete swap flow for ${params.direction}`);

    // Stub implementation
    return Promise.resolve({
      success: true,
      direction: params.direction,
      orderHash: "0x" + "5".repeat(64),
      htlcId: "0x" + "6".repeat(40),
      preimage: "0x" + "8".repeat(64),
      hashlock: "0x" + "7".repeat(64),
      timelock: params.timelock || 1800,
    });
  }
}
