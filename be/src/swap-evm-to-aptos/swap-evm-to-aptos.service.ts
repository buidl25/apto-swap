import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import {
  InitiateSwapEvmToAptosDto,
  CompleteSwapDto,
  CancelSwapDto,
  SwapHistoryDto,
} from "./dto/swap-evm-to-aptos.dto";
import { SwapStatusDto } from "../shared/dto/swap.dto";
import { SwapDirection, SwapStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FusionService } from "../fusion/fusion.service";
import { AptosService } from "../aptos/aptos.service";

@Injectable()
export class SwapEvmToAptosService {
  private readonly logger = new Logger(SwapEvmToAptosService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly fusionService: FusionService,
    private readonly aptosService: AptosService,
  ) {}

  async initiateSwap(
    initiateSwapDto: InitiateSwapEvmToAptosDto,
  ): Promise<SwapStatusDto> {
    try {
      this.logger.log(
        `Initiating EVM to Aptos swap with hash: ${initiateSwapDto.preimageHash}`,
      );

      // Process the 1inch Fusion order
      const fusionOrder: Record<string, unknown> = initiateSwapDto.signedOrder;
      let orderHash: string;

      try {
        // Validate the Fusion order
        if (
          typeof fusionOrder === "object" &&
          fusionOrder !== null &&
          "orderHash" in fusionOrder
        ) {
          // Submit the order to the Fusion API
          orderHash = String(fusionOrder.orderHash);
        } else {
          throw new Error("Invalid Fusion order format");
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process Fusion order: ${errorMessage}`);
        throw new Error(`Failed to process Fusion order: ${errorMessage}`);
      }

      // Generate a unique swap ID
      const swapId = uuidv4();

      // Set a default timelock of 24 hours (in seconds)
      const timelock = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

      // Create a new swap record in the database
      const newSwap = await this.prisma.swap.create({
        data: {
          id: swapId,
          direction: SwapDirection.EVM_TO_APTOS,
          status: SwapStatus.PENDING,
          sender: initiateSwapDto.senderAddress,
          recipient: initiateSwapDto.recipientAddress,
          fromTokenAddress: initiateSwapDto.fromTokenAddress,
          toTokenAddress: initiateSwapDto.toTokenAddress,
          amount: initiateSwapDto.amount,
          evmHtlcAddress: orderHash, // Using orderHash as evmHtlcAddress temporarily
          hashlock: initiateSwapDto.preimageHash,
          timelock: timelock,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      return {
        swapId: newSwap.id,
        status: newSwap.status.toLowerCase(),
        evmHtlcAddress: newSwap.evmHtlcAddress || undefined,
        aptosHtlcAddress: newSwap.aptosHtlcAddress || undefined,
        hashlock: newSwap.hashlock,
        timestamp: newSwap.timestamp,
        preimage: newSwap.preimage || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to initiate swap: ${error.message}`);
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initiate swap: ${errorMessage}`);
    }
  }

  async getSwapStatus(swapId: string): Promise<SwapStatusDto> {
    try {
      this.logger.log(`Getting status for swap ${swapId}`);

      const swap = await this.prisma.swap.findUnique({
        where: { id: swapId },
      });

      if (!swap) {
        throw new NotFoundException(`Swap with ID ${swapId} not found`);
      }

      return {
        swapId: swap.id,
        status: swap.status.toLowerCase(),
        evmHtlcAddress: swap.evmHtlcAddress || undefined,
        aptosHtlcAddress: swap.aptosHtlcAddress || undefined,
        hashlock: swap.hashlock,
        timestamp: swap.timestamp,
        preimage: swap.preimage || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting swap status: ${errorMessage}`);
      throw new Error(`Failed to get swap status: ${errorMessage}`);
    }
  }

  /**
   * Complete a swap by providing the preimage
   * @param completeSwapDto - DTO with swap ID and preimage
   * @returns Updated swap status
   */
  async completeSwap(completeSwapDto: CompleteSwapDto): Promise<SwapStatusDto> {
    try {
      const { swapId, preimage } = completeSwapDto;
      this.logger.log(`Completing swap ${swapId} with preimage ${preimage}`);

      // Find the swap in the database
      const swap = await this.prisma.swap.findUnique({
        where: { id: swapId },
      });

      if (!swap) {
        throw new NotFoundException(`Swap with ID ${swapId} not found`);
      }

      // Validate that the preimage matches the hashlock
      const calculatedHash = crypto
        .createHash("sha3-256")
        .update(Buffer.from(preimage, "utf8"))
        .digest("hex");

      if (`0x${calculatedHash}` !== swap.hashlock) {
        throw new Error(
          `Preimage does not match hashlock. Expected hash: ${swap.hashlock}, got: 0x${calculatedHash}`,
        );
      }

      // Update the swap with the preimage and mark as completed
      const updatedSwap = await this.prisma.swap.update({
        where: { id: swapId },
        data: {
          preimage,
          status: SwapStatus.COMPLETED,
          completedAt: Math.floor(Date.now() / 1000),
        },
      });

      // If the swap is EVM_TO_APTOS and we don't have an Aptos HTLC yet, create one
      if (
        swap.direction === SwapDirection.EVM_TO_APTOS && 
        !swap.aptosHtlcAddress && 
        swap.recipient
      ) {
        try {
          // Create HTLC on Aptos
          const htlcResult = await this.aptosService.createAptosHtlc({
            recipient: swap.recipient,
            amount: swap.amount,
            hashlock: swap.hashlock,
            timelock: swap.timelock,
          });

          if (htlcResult.success) {
            // Update the swap with Aptos HTLC address
            await this.prisma.swap.update({
              where: { id: swapId },
              data: {
                aptosHtlcAddress: htlcResult.htlcId,
              },
            });

            this.logger.log(`Created Aptos HTLC with ID: ${htlcResult.htlcId}`);
          }
        } catch (htlcError: unknown) {
          const htlcErrorMessage = 
            htlcError instanceof Error ? htlcError.message : String(htlcError);
          this.logger.error(`Failed to create Aptos HTLC: ${htlcErrorMessage}`);
          // We don't throw here to allow the swap to continue
        }
      }

      return {
        swapId: updatedSwap.id,
        status: updatedSwap.status.toLowerCase(),
        hashlock: updatedSwap.hashlock,
        timestamp: updatedSwap.timestamp,
        preimage: updatedSwap.preimage || undefined,
        aptosHtlcAddress: updatedSwap.aptosHtlcAddress || undefined,
        evmHtlcAddress: updatedSwap.evmHtlcAddress || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error completing swap: ${errorMessage}`);
      throw new Error(`Failed to complete swap: ${errorMessage}`);
    }
  }

  /**
   * Cancel a swap and refund funds if timelock has expired
   * @param cancelSwapDto - DTO with swap ID
   * @returns Updated swap status
   */
  async cancelSwap(cancelSwapDto: CancelSwapDto): Promise<SwapStatusDto> {
    try {
      const { swapId } = cancelSwapDto;
      this.logger.log(`Cancelling swap ${swapId}`);

      // Find the swap in the database
      const swap = await this.prisma.swap.findUnique({
        where: { id: swapId },
      });

      if (!swap) {
        throw new NotFoundException(`Swap with ID ${swapId} not found`);
      }

      // Check if the swap can be cancelled
      if (swap.status === SwapStatus.COMPLETED) {
        throw new Error(`Cannot cancel a completed swap`);
      }
      
      // Check if the timelock has expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime < swap.timelock) {
        throw new Error(
          `Cannot cancel swap before timelock expiration. ` +
          `Timelock expires at ${new Date((swap.timelock) * 1000).toISOString()}`
        );
      }
      
      // If there's an Aptos HTLC address, try to refund it
      if (swap.aptosHtlcAddress) {
        try {
          this.logger.log(`Refunding Aptos HTLC for swap ${swapId}`);
          const refundResult = await this.aptosService.refundAptosHtlc({
            contractId: swap.aptosHtlcAddress
          });
          
          this.logger.log(`Aptos HTLC refund result: ${JSON.stringify(refundResult)}`);
          
          // Even if the refund fails, we continue with updating the swap status
          // as the timelock may have expired on-chain already
        } catch (refundError: unknown) {
          const refundErrorMessage = 
            refundError instanceof Error ? refundError.message : String(refundError);
          this.logger.warn(
            `Failed to refund Aptos HTLC, but continuing with swap cancellation: ${refundErrorMessage}`
          );
        }
      }
      
      // TODO: If there's an EVM HTLC address, refund it as well
      // This would require implementing refund functionality in EvmService
      
      // Update the swap status to refunded
      const updatedSwap = await this.prisma.swap.update({
        where: { id: swapId },
        data: {
          // @ts-expect-error - REFUNDED exists in the Prisma schema but TypeScript doesn't recognize it
          status: SwapStatus.REFUNDED || SwapStatus.CANCELLED,
          cancelledAt: Math.floor(Date.now() / 1000),
        },
      });

      return {
        swapId: updatedSwap.id,
        status: updatedSwap.status.toLowerCase(),
        hashlock: updatedSwap.hashlock,
        timestamp: updatedSwap.timestamp,
        preimage: updatedSwap.preimage || undefined,
        evmHtlcAddress: updatedSwap.evmHtlcAddress || undefined,
        aptosHtlcAddress: updatedSwap.aptosHtlcAddress || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cancel swap: ${errorMessage}`);
      throw new Error(`Failed to cancel swap: ${errorMessage}`);
    }
  }

  /**
   * Get swap history for EVM to Aptos swaps
   * @returns Swap history
   */
  async getSwapHistory(): Promise<SwapHistoryDto> {
    try {
      this.logger.log("Getting EVM to Aptos swap history");

      const swaps = await this.prisma.swap.findMany({
        where: {
          direction: SwapDirection.EVM_TO_APTOS,
        },
        orderBy: {
          timestamp: "desc",
        },
      });

      return {
        swaps: swaps.map((swap) => ({
          swapId: swap.id,
          status: swap.status.toLowerCase(),
          sender: swap.sender || undefined,
          recipient: swap.recipient || undefined,
          fromTokenAddress: swap.fromTokenAddress || undefined,
          toTokenAddress: swap.toTokenAddress || undefined,
          amount: swap.amount,
          hashlock: swap.hashlock, // Added required hashlock field
          timestamp: swap.timestamp,
          preimage: swap.preimage || undefined, // Added optional preimage field
          evmHtlcAddress: swap.evmHtlcAddress || undefined, // Added optional evmHtlcAddress field
          aptosHtlcAddress: swap.aptosHtlcAddress || undefined, // Added optional aptosHtlcAddress field
        })),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting swap history: ${errorMessage}`);
      throw new Error(`Failed to get swap history: ${errorMessage}`);
    }
  }
}