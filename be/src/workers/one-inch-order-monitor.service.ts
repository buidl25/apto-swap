import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, of } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { SwapStatus } from "@prisma/client";
import { catchError, delay, retry } from "rxjs/operators";

/**
 * Enum representing possible 1inch Fusion order statuses
 */
export enum FusionOrderStatus {
  PENDING = "pending",
  FILLED = "filled",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  INVALID = "invalid"
}

/**
 * Interface for order status response
 */
export interface OrderStatusResponse {
  orderHash: string;
  status: FusionOrderStatus;
  filledAmount?: string;
  remainingAmount?: string;
  timestamp?: number;
  error?: string;
}

@Injectable()
export class OneInchOrderMonitorService {
  private readonly logger = new Logger(OneInchOrderMonitorService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000; // 5 seconds
  private readonly pollingInterval = 30000; // 30 seconds
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService
  ) {
    this.apiUrl = this.configService.get<string>("ONE_INCH_API_URL") || "https://fusion.1inch.io";
    this.apiKey = this.configService.get<string>("ONE_INCH_API_KEY") || "";
  }

  /**
   * Start monitoring an order with continuous polling
   * @param orderHash - The hash of the order to monitor
   * @param swapId - The ID of the swap in the database
   */
  async startOrderMonitoring(orderHash: string, swapId: string): Promise<void> {
    this.logger.log(`Starting monitoring for 1inch order: ${orderHash}, swapId: ${swapId}`);
    
    // Stop any existing monitoring for this order
    this.stopOrderMonitoring(orderHash);
    
    // Start polling
    const intervalId = setInterval(async () => {
      try {
        const status = await this.getOrderStatus(orderHash);
        await this.handleOrderStatusUpdate(status, swapId);
        
        // If order is in a final state, stop monitoring
        if (this.isFinalStatus(status.status)) {
          this.logger.log(`Order ${orderHash} reached final status: ${status.status}. Stopping monitoring.`);
          this.stopOrderMonitoring(orderHash);
        }
      } catch (error) {
        this.logger.error(`Error monitoring order ${orderHash}:`, error);
      }
    }, this.pollingInterval);
    
    // Store the interval ID
    this.activeMonitoring.set(orderHash, intervalId);
  }

  /**
   * Stop monitoring a specific order
   * @param orderHash - The hash of the order to stop monitoring
   */
  stopOrderMonitoring(orderHash: string): void {
    const intervalId = this.activeMonitoring.get(orderHash);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeMonitoring.delete(orderHash);
      this.logger.log(`Stopped monitoring for order: ${orderHash}`);
    }
  }

  /**
   * Get the current status of an order from 1inch Fusion API
   * @param orderHash - The hash of the order to check
   * @returns The order status response
   */
  async getOrderStatus(orderHash: string): Promise<OrderStatusResponse> {
    this.logger.log(`Getting status for order: ${orderHash}`);
    
    // If no API key is available, use mock mode
    if (!this.apiKey) {
      this.logger.warn("No API key available, using mock mode");
      return this.getMockOrderStatus(orderHash);
    }
    
    try {
      const url = `${this.apiUrl}/orderbook/v1.0/orders/${orderHash}`;
      const headers = { Authorization: `Bearer ${this.apiKey}` };
      
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }).pipe(
          retry(this.maxRetries),
          catchError((error) => {
            this.logger.error(`Failed to get order status after ${this.maxRetries} retries:`, error);
            // If API fails after retries, fall back to mock mode
            return of({ data: this.getMockOrderStatus(orderHash) });
          })
        )
      );
      
      return this.parseOrderStatusResponse(orderHash, response.data);
    } catch (error) {
      this.logger.error(`Error getting order status for ${orderHash}:`, error);
      // Fall back to mock mode on error
      return this.getMockOrderStatus(orderHash);
    }
  }

  /**
   * Handle updates to order status
   * @param status - The current order status
   * @param swapId - The ID of the swap in the database
   */
  private async handleOrderStatusUpdate(status: OrderStatusResponse, swapId: string): Promise<void> {
    this.logger.log(`Handling status update for order ${status.orderHash}: ${status.status}`);
    
    let swapStatus: SwapStatus;
    
    switch (status.status) {
      case FusionOrderStatus.FILLED:
        swapStatus = SwapStatus.EVM_HTLC_CREATED; // Следующий шаг после заполнения ордера
        break;
      case FusionOrderStatus.CANCELLED:
        swapStatus = SwapStatus.FAILED;
        break;
      case FusionOrderStatus.EXPIRED:
        swapStatus = SwapStatus.FAILED;
        break;
      case FusionOrderStatus.INVALID:
        swapStatus = SwapStatus.FAILED;
        break;
      case FusionOrderStatus.PENDING:
      default:
        swapStatus = SwapStatus.PENDING;
        break;
    }
    
    // Update the swap status in the database
    try {
      await this.prismaService.swap.update({
        where: { id: swapId },
        data: {
          status: swapStatus,
          updatedAt: new Date()
          // Дополнительные детали можно сохранить в другие поля при необходимости
        }
      });
      
      this.logger.log(`Updated swap ${swapId} status to ${swapStatus}`);
    } catch (error) {
      this.logger.error(`Failed to update swap status in database:`, error);
    }
  }

  /**
   * Check if an order status is final (no more updates expected)
   * @param status - The order status to check
   * @returns True if the status is final, false otherwise
   */
  private isFinalStatus(status: FusionOrderStatus): boolean {
    return [
      FusionOrderStatus.FILLED,
      FusionOrderStatus.CANCELLED,
      FusionOrderStatus.EXPIRED,
      FusionOrderStatus.INVALID
    ].includes(status);
  }

  /**
   * Parse the raw response from the 1inch API
   * @param orderHash - The hash of the order
   * @param responseData - The raw response data
   * @returns Parsed order status response
   */
  private parseOrderStatusResponse(orderHash: string, responseData: any): OrderStatusResponse {
    try {
      // Adapt this to match the actual 1inch API response structure
      return {
        orderHash,
        status: responseData.status as FusionOrderStatus,
        filledAmount: responseData.filledAmount,
        remainingAmount: responseData.remainingAmount,
        timestamp: responseData.timestamp || Date.now()
      };
    } catch (error) {
      this.logger.error(`Error parsing order status response:`, error);
      return {
        orderHash,
        status: FusionOrderStatus.PENDING,
        error: 'Failed to parse response'
      };
    }
  }

  /**
   * Generate a mock order status for testing or when API is unavailable
   * @param orderHash - The hash of the order
   * @returns A mock order status response
   */
  private getMockOrderStatus(orderHash: string): OrderStatusResponse {
    // For testing, we'll cycle through different statuses based on time
    const statuses = Object.values(FusionOrderStatus);
    const randomIndex = Math.floor(Date.now() / 10000) % statuses.length;
    const status = statuses[randomIndex];
    
    this.logger.warn(`Using mock order status for ${orderHash}: ${status}`);
    
    return {
      orderHash,
      status,
      filledAmount: status === FusionOrderStatus.FILLED ? '1000000000000000000' : '0',
      remainingAmount: status === FusionOrderStatus.FILLED ? '0' : '1000000000000000000',
      timestamp: Date.now()
    };
  }
}
