import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { EvmService } from "../evm/evm.service";
import { Prisma, Swap } from "@prisma/client";
import { SwapStatus } from "../types/prisma.types";

/**
 * Interface for preimage discovery event payload
 */
interface PreimageDiscoveredEvent {
  contractId: string;
  preimage: string;
  version: string;
}

/**
 * Interface for EVM withdrawal result
 */
interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Service for handling discovered preimages from Aptos HTLC events
 */
@Injectable()
export class AptosPreimageHandlerService {
  private readonly logger = new Logger(AptosPreimageHandlerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly evmService: EvmService,
  ) {}

  /**
   * Handle preimage discovery events from Aptos HTLC monitor
   */
  @OnEvent("aptos.preimage.discovered")
  async handlePreimageDiscovered(
    payload: PreimageDiscoveredEvent,
  ): Promise<void> {
    const { contractId, preimage } = payload;

    this.logger.log(
      `Handling discovered preimage for contract ${contractId}: ${preimage}`,
    );

    try {
      // Find the swap by Aptos contract ID
      const swap = await this.prismaService.swap.findFirst({
        where: {
          aptosHtlcAddress: contractId,
        },
      }) as Swap | null;

      if (!swap) {
        this.logger.warn(`No swap found for Aptos contract ID: ${contractId}`);
        return;
      }

      // Now we know swap is a valid Swap object
      const swapId = swap.id;
      this.logger.log(`Found swap with ID: ${swapId}`);

      // Update the swap with the discovered preimage
      await this.prismaService.swap.update({
        where: { id: swap.id },
        data: {
          preimage,
          // Using an intermediate status to track that preimage was found
          status: SwapStatus.PREIMAGE_REVEALED as unknown as Prisma.EnumSwapStatusFieldUpdateOperationsInput,
        },
      });

      // If there's an EVM contract ID, trigger withdrawal on EVM side
      const evmHtlcAddress = swap.evmHtlcAddress;
      if (evmHtlcAddress) {
        this.logger.log(
          `Attempting to withdraw from EVM HTLC with contract ID: ${evmHtlcAddress}`,
        );

        try {
          // Call EVM service to withdraw using the preimage
          const withdrawResult = await this.evmService.withdrawFromHtlc({
            htlcId: evmHtlcAddress,
            preimage,
          }) as WithdrawResult;

          if (withdrawResult && withdrawResult.success) {
            this.logger.log(
              `Successfully withdrew from EVM HTLC: ${withdrawResult.txHash}`,
            );

            // Update swap status to completed
            await this.prismaService.swap.update({
              where: { id: swapId },
              data: {
                status: SwapStatus.COMPLETED as unknown as Prisma.EnumSwapStatusFieldUpdateOperationsInput,
              },
            });
          }
        } catch (withdrawError: unknown) {
          // Handle withdrawal errors separately to continue with the main flow
          if (withdrawError instanceof Error) {
            this.logger.error(`EVM withdrawal error: ${withdrawError.message}`);
          } else {
            this.logger.error("Unknown EVM withdrawal error");
          }
        }
      } else {
        this.logger.log(
          `No EVM contract ID found for swap ${swapId}, skipping EVM withdrawal`,
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        `Error handling preimage discovery for contract ${contractId}`,
      );

      // If the error has a message property, log it for better debugging
      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
      } else if (error && typeof error === "object" && "message" in error) {
        const errorMessage = String(error.message);
        this.logger.error(`Error details: ${errorMessage}`);
      }
    }
  }
}
