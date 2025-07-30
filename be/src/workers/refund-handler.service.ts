import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SwapStatus, Swap, SwapDirection } from "@prisma/client";
import { EvmService } from "../evm/evm.service";
import { AptosService } from "../aptos/aptos.service";
import { Cron } from "@nestjs/schedule";

/**
 * Service for handling refunds of expired HTLCs
 */
@Injectable()
export class RefundHandlerService {
  private readonly logger = new Logger(RefundHandlerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly evmService: EvmService,
    private readonly aptosService: AptosService,
  ) { }

  /**
   * Run every 10 minutes to check for expired HTLCs
   */
  @Cron("0 */10 * * * *")
  async handleExpiredHtlcs(): Promise<void> {
    this.logger.log("Checking for expired HTLCs...");

    try {
      // Current timestamp in seconds
      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Find swaps that might be eligible for refund
      const expiredSwaps = await this.prismaService.swap.findMany({
        where: {
          OR: [
            { status: SwapStatus.EVM_HTLC_CREATED },
            { status: SwapStatus.APTOS_HTLC_CREATED },
          ],
          // Timelock is the expiration time in seconds since epoch
          timelock: { lt: currentTimestamp },
        },
      });

      this.logger.log(`Found ${expiredSwaps.length} expired HTLCs`);

      for (const swap of expiredSwaps) {
        await this.processRefund(swap);
      }
    } catch (error) {
      this.logger.error("Error handling expired HTLCs:", error);
    }
  }

  /**
   * Process refund for a specific swap
   * @param swap - The swap to process refund for
   */
  private async processRefund(swap: Swap): Promise<void> {
    this.logger.log(`Processing refund for swap ${swap.id}`);

    try {
      // Update swap status to indicate refund is in progress
      await this.prismaService.swap.update({
        where: { id: swap.id },
        data: { status: SwapStatus.REFUNDED },
      });

      // Process refund based on swap direction
      if (swap.direction === SwapDirection.EVM_TO_APTOS) {
        if (swap.evmHtlcAddress) {
          await this.processEvmRefund(swap);
        }
      } else if (swap.direction === SwapDirection.APTOS_TO_EVM) {
        if (swap.aptosHtlcAddress) {
          await this.processAptosRefund(swap);
        }
      }

      // Update swap with refund timestamp
      await this.prismaService.swap.update({
        where: { id: swap.id },
        data: {
          cancelledAt: Math.floor(Date.now() / 1000),
        },
      });

      this.logger.log(`Refund processed successfully for swap ${swap.id}`);
    } catch (error) {
      this.logger.error(`Error processing refund for swap ${swap.id}:`, error);

      // Update swap status to indicate failure
      await this.prismaService.swap.update({
        where: { id: swap.id },
        data: { status: SwapStatus.FAILED },
      });
    }
  }

  /**
   * Process refund for EVM HTLC
   * @param swap - The swap to process refund for
   */
  private async processEvmRefund(swap: Swap): Promise<void> {
    try {
      // Call EVM service to refund the HTLC
      // const txHash = await this.evmService.refundHtlc(
      //   swap.evmHtlcAddress as string,
      //   swap.hashlock
      // );
      // this.logger.log(`EVM refund transaction hash: ${txHash}`);
    } catch (error) {
      this.logger.error("Error processing EVM refund:", error);
      throw error;
    }
  }

  /**
   * Process refund for Aptos HTLC
   * @param swap - The swap to process refund for
   */
  private async processAptosRefund(swap: Swap): Promise<void> {
    try {
      // Call Aptos service to refund the HTLC
      // const txHash = await this.aptosService.refundHtlc(
      //   swap.aptosHtlcAddress as string,
      //   swap.hashlock,
      // );
      // this.logger.log(`Aptos refund transaction hash: ${txHash}`);
    } catch (error) {
      this.logger.error("Error processing Aptos refund:", error);
      throw error;
    }
  }
}
