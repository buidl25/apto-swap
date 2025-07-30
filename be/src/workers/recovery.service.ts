import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Swap, SwapStatus, SwapDirection } from "@prisma/client";
import { OneInchOrderMonitorService } from "./one-inch-order-monitor.service";
import { AptosHtlcMonitorService } from "./aptos-htlc-monitor.service";
import { EvmHtlcMonitorService } from "./evm-htlc-monitor.service";

/**
 * Service for recovering and resuming processes after server restart
 */
@Injectable()
export class RecoveryService implements OnModuleInit {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly oneInchOrderMonitorService: OneInchOrderMonitorService,
    private readonly aptosHtlcMonitorService: AptosHtlcMonitorService,
    private readonly evmHtlcMonitorService: EvmHtlcMonitorService,
  ) { }

  /**
   * Initialize recovery process when module starts
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("Starting recovery process...");
    await this.recoverActiveSwaps();
  }

  /**
   * Recover active swaps that were in progress when the server was stopped
   */
  async recoverActiveSwaps(): Promise<void> {
    try {
      // Find all swaps that are in an active state
      const activeSwaps = await this.prismaService.swap.findMany({
        where: {
          status: {
            in: [
              SwapStatus.PENDING,
              SwapStatus.EVM_HTLC_CREATED,
              SwapStatus.APTOS_HTLC_CREATED,
            ],
          },
        },
      });

      this.logger.log(`Found ${activeSwaps.length} active swaps to recover`);

      // Process each active swap
      for (const swap of activeSwaps) {
        await this.recoverSwap(swap);
      }

      this.logger.log("Recovery process completed");
    } catch (error) {
      this.logger.error("Error during recovery process:", error);
    }
  }

  /**
   * Recover a specific swap
   * @param swap - The swap to recover
   */
  private async recoverSwap(swap: Swap): Promise<void> {
    this.logger.log(`Recovering swap ${swap.id} with status ${swap.status}`);

    try {
      // switch (swap.status) {
      //   case SwapStatus.PENDING:
      //     // For pending swaps, check if there's an order hash and restart monitoring
      //     if (swap.orderHash) {
      //       this.logger.log(`Restarting order monitoring for swap ${swap.id}`);
      //       await this.oneInchOrderMonitorService.startOrderMonitoring(swap.orderHash, swap.id);
      //     }
      //     break;
      //   case SwapStatus.EVM_HTLC_CREATED:
      //     // For EVM HTLC created, monitor for preimage reveal
      //     if (swap.direction === SwapDirection.EVM_TO_APTOS && swap.evmHtlcAddress) {
      //       this.logger.log(`Restarting EVM HTLC monitoring for swap ${swap.id}`);
      //       await this.evmHtlcMonitorService.startMonitoring(swap.id, swap.evmHtlcAddress);
      //     }
      //     break;
      //   case SwapStatus.APTOS_HTLC_CREATED:
      //     // For Aptos HTLC created, monitor for preimage reveal
      //     if (swap.aptosHtlcAddress) {
      //       this.logger.log(`Restarting preimage monitoring for swap ${swap.id}`);
      //       await this.aptosHtlcMonitorService.startMonitoring(swap.id, swap.aptosHtlcAddress);
      //     }
      //     break;
      //   default:
      //     this.logger.log(`No recovery action needed for swap ${swap.id} with status ${swap.status}`);
      //     break;
      // }
    } catch (error) {
      this.logger.error(`Error recovering swap ${swap.id}:`, error);

      // Update swap status to indicate recovery failure
      await this.prismaService.swap.update({
        where: { id: swap.id },
        data: {
          status: SwapStatus.FAILED,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Handle stuck transactions by checking their status and retrying if necessary
   */
  async handleStuckTransactions(): Promise<void> {
    try {
      const threshold = new Date();
      threshold.setMinutes(threshold.getMinutes() - 30); // 30 minutes ago

      // Find swaps that haven't been updated in the last 30 minutes
      const stuckSwaps = await this.prismaService.swap.findMany({
        where: {
          status: {
            in: [
              SwapStatus.PENDING,
              SwapStatus.EVM_HTLC_CREATED,
              SwapStatus.APTOS_HTLC_CREATED,
            ],
          },
          updatedAt: {
            lt: threshold,
          },
        },
      });

      this.logger.log(`Found ${stuckSwaps.length} potentially stuck swaps`);

      for (const swap of stuckSwaps) {
        await this.handleStuckSwap(swap);
      }
    } catch (error) {
      this.logger.error("Error handling stuck transactions:", error);
    }
  }

  /**
   * Handle a specific stuck swap
   * @param swap - The stuck swap to handle
   */
  private async handleStuckSwap(swap: Swap): Promise<void> {
    this.logger.log(
      `Handling stuck swap ${swap.id} with status ${swap.status}`,
    );

    try {
      // Check if the swap has timed out
      const currentTimestamp = Math.floor(Date.now() / 1000);

      if (swap.timelock < currentTimestamp) {
        this.logger.log(`Swap ${swap.id} has timed out, marking for refund`);

        // Mark the swap for refund
        await this.prismaService.swap.update({
          where: { id: swap.id },
          data: {
            status: SwapStatus.REFUNDED,
            updatedAt: new Date(),
          },
        });

        return;
      }

      // If not timed out, restart the appropriate monitoring process
      // switch (swap.status) {
      //   case SwapStatus.PENDING:
      //     if (swap.orderHash) {
      //       this.logger.log(
      //         `Restarting order monitoring for stuck swap ${swap.id}`,
      //       );
      //       await this.oneInchOrderMonitorService.startOrderMonitoring(
      //         swap.orderHash,
      //         swap.id,
      //       );
      //     }
      //     break;

      //   case SwapStatus.EVM_HTLC_CREATED:
      //   case SwapStatus.APTOS_HTLC_CREATED:
      //     // Restart appropriate monitoring based on swap direction
      //     this.logger.log(
      //       `Restarting HTLC monitoring for stuck swap ${swap.id}`,
      //     );
      //     if (swap.aptosHtlcAddress) {
      //       await this.aptosHtlcMonitorService.startMonitoring(
      //         swap.id,
      //         swap.aptosHtlcAddress,
      //       );
      //     }
      //     if (swap.evmHtlcAddress) {
      //       await this.evmHtlcMonitorService.startMonitoring(
      //         swap.id,
      //         swap.evmHtlcAddress,
      //       );
      //     }
      //     break;
      // }

      // Update the swap to indicate recovery attempt
      await this.prismaService.swap.update({
        where: { id: swap.id },
        data: {
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error handling stuck swap ${swap.id}:`, error);
    }
  }
}
