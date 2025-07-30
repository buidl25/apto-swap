import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { AptosService } from "../aptos/aptos.service";
import { Swap, SwapDirection, SwapStatus } from "@prisma/client";

/**
 * Interface for preimage discovery event payload
 */
interface PreimageDiscoveredEvent {
  contractId: string;
  preimage: string;
  transactionHash: string;
}

/**
 * Interface for Aptos withdrawal result
 */
interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Service for handling discovered preimages from EVM HTLC events
 */
@Injectable()
export class EvmPreimageHandlerService {
  private readonly logger = new Logger(EvmPreimageHandlerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly aptosService: AptosService,
  ) { }

  /**
   * Handle preimage discovery events from EVM HTLC monitor
   */
  @OnEvent("evm.preimage.discovered")
  async handlePreimageDiscovered(
    payload: PreimageDiscoveredEvent,
  ): Promise<void> {
    const { contractId, preimage, transactionHash } = payload;

    this.logger.log(
      `Handling discovered preimage for contract ${contractId}: ${preimage}`,
    );

    try {
      // Find swap with this contract ID
      const swap = await this.prismaService.swap.findFirst({
        where: {
          evmHtlcAddress: contractId,
          status: "EVM_HTLC_CREATED", // Use string literal since SwapStatus enum might not have this value
          direction: SwapDirection.EVM_TO_APTOS,
        },
      });

      if (!swap) {
        this.logger.warn(
          `No active swap found with EVM HTLC address ${contractId}`,
        );
        return;
      }

      this.logger.log(
        `Found swap ${swap.id} for EVM HTLC ${contractId}, attempting to withdraw on Aptos`,
      );

      // Update swap with preimage
      // await this.prismaService.swap.update({
      //   where: { id: swap.id },
      //   data: {
      //     preimage: preimage,
      //     evmHtlcWithdrawTxHash: transactionHash,
      //   },
      // });

      // If there's an Aptos HTLC address, withdraw there using the preimage
      if (swap.aptosHtlcAddress) {
        await this.withdrawOnAptos(swap, preimage);
      } else {
        this.logger.warn(
          `Swap ${swap.id} has no Aptos HTLC address to withdraw from`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error handling preimage discovery: ${errorMessage}`);
    }
  }

  /**
   * Withdraw from Aptos HTLC using discovered preimage
   */
  private async withdrawOnAptos(swap: Swap, preimage: string): Promise<void> {
    try {
      this.logger.log(
        `Attempting to withdraw from Aptos HTLC ${swap.aptosHtlcAddress} using preimage ${preimage}`,
      );

      // Call Aptos service to withdraw using preimage
      // const result = await this.aptosService.withdrawHtlc(
      //   swap.aptosHtlcAddress as string,
      //   preimage
      // );

      // if (result.success) {
      //   this.logger.log(
      //     `Successfully withdrawn from Aptos HTLC ${swap.aptosHtlcAddress}, tx: ${result.txHash}`
      //   );

      //   // Update swap status
      //   await this.prismaService.swap.update({
      //     where: { id: swap.id },
      //     data: {
      //       status: "COMPLETED", // Use string literal instead of enum
      //       aptosHtlcWithdrawTxHash: result.txHash,
      //       completedAt: new Date().getTime(), // Convert to timestamp number
      //     },
      //  });
      // } else {
      //   this.logger.error(
      //     `Failed to withdraw from Aptos HTLC: ${result.error}`
      //   );

      //   // Update swap with error
      //   await this.prismaService.swap.update({
      //     where: { id: swap.id },
      //     data: {
      //       errorMessage: `Failed to withdraw from Aptos HTLC: ${result.error}`, // Use errorMessage field instead of error
      //     },
      //   });
      // }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error withdrawing from Aptos HTLC: ${errorMessage}`);

      // Update swap with error
      await this.prismaService.swap.update({
        where: { id: swap.id },
        data: {
          status: SwapStatus.FAILED,
          // Store error details in logs instead of trying to use a non-existent errorMessage field
        },
      });
    }
  }
}
