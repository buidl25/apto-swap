import * as crypto from "crypto";
import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import type { InterfaceAbi } from "ethers";
import { PrismaService } from "src/prisma/prisma.service";
import { FusionService } from "src/fusion/fusion.service";
import { AptosService } from "src/aptos/aptos.service";
import { EvmService } from "src/evm/evm.service";

import {
  InitiateSwapEvmToAptosDto,
  CompleteSwapDto,
  CancelSwapDto,
  SwapHistoryDto,
  EscrowEvmDto,
  EscrowAptosDto,
} from "./dto/swap-evm-to-aptos.dto";
import { SwapStatusDto } from "../shared/dto/swap.dto";
import { SwapDirection, SwapStatus } from "@prisma/client";
import { SwapStatusEnum } from "./dto/swap.enum";
import { DbService } from "prisma/src/db.service";

interface Event {
  event: string;
  args?: any[];
}

@Injectable()
export class SwapEvmToAptosService {
  private readonly logger = new Logger(SwapEvmToAptosService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dbService: DbService,
    private readonly fusionService: FusionService,
    private readonly aptosService: AptosService,
    private readonly evmService: EvmService,
  ) { }

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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process Fusion order: ${errorMessage}`);
        throw new Error(`Failed to process Fusion order: ${errorMessage}`);
      }

      // Generate a unique swap ID
      const swapId = crypto.randomUUID();

      // Set a default timelock of 24 hours (in seconds)
      const timelock = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

      // Create a new swap record in the database
      const newSwap = await this.dbService.swap.create({
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initiate swap: ${errorMessage}`);
    }
  }

  async runTestEscrowAptos(escrowAptosDto: EscrowAptosDto): Promise<any> {
    try {
      this.logger.log(
        `Running test swap with status: ${escrowAptosDto.status}`,
      );

      // switch (escrowAptosDto.status) {
      //   case SwapStatusEnum.HTLC_APTOS_CREATE: {
      this.logger.log("Creating test Aptos escrow");

      // Convert amount to Aptos units (8 decimals)
      //const aptosAmount = BigInt(escrowAptosDto.amount) * BigInt(10 ** 8);

      // Generate order hash if not provided
      const orderHash =
        escrowAptosDto.hashlock ||
        `0x${crypto.randomBytes(32).toString("hex")}`;

      // Set default delays
      const dstWithdrawalDelay = escrowAptosDto.timelock;
      console.log(
        "🚀 ~ SwapEvmToAptosService ~ runTestEscrowAptos ~ dstWithdrawalDelay:",
        dstWithdrawalDelay,
      );
      const dstPublicWithdrawalDelay = Number(escrowAptosDto.timelock) + 600; // +10 mins
      const dstCancellationDelay = escrowAptosDto.timelock;

      try {
        const payload = {
          recipient: escrowAptosDto.recipientAddress,
          amount: escrowAptosDto.amount,
          hashlock: escrowAptosDto.hashlock,
          timelock: Math.floor(Date.now() / 1000) + Number(dstWithdrawalDelay),
          orderHash: escrowAptosDto.hashlock,
          maker: escrowAptosDto.recipientAddress,
          aptosAmount: escrowAptosDto.amount,
          safetyDeposit: escrowAptosDto.amount,
          dstWithdrawalDelay: dstWithdrawalDelay,
          dstPublicWithdrawalDelay: dstPublicWithdrawalDelay,
          dstCancellationDelay: dstCancellationDelay,
        };
        console.log(
          "🚀 ~ SwapEvmToAptosService ~ runTestEscrowAptos ~ payload:",
          payload,
        );

        const tx = await this.aptosService.createEscrow(payload);

        // Create database record
        const data = {
          direction: SwapDirection.EVM_TO_APTOS,
          status: SwapStatus.APTOS_HTLC_CREATED,
          sender: escrowAptosDto.recipientAddress,
          recipient: escrowAptosDto.recipientAddress,
          fromTokenAddress: escrowAptosDto.tokenAddress,
          amount: escrowAptosDto.amount,
          hashlock: escrowAptosDto.hashlock,
          timelock: Number(escrowAptosDto.timelock),
          timestamp: Math.floor(Date.now() / 1000),
          orderHash: tx.txHash,
        };

        const escrow = await this.dbService.createAptosEscrow(data);

        return {
          success: true,
          message: "Test Aptos escrow created successfully",
          escrowId: escrow?.id,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to create Aptos escrow: ${errorMessage}`);
        throw new Error(`Failed to create Aptos escrow: ${errorMessage}`);
      }
      //   }
      //   default:
      //     return { success: false, message: "Unsupported test status" };
      // }
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to run test swap: ${error.message}`);
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to run test swap: ${errorMessage}`);
    }
  }

  async runTestEscrowEvm(testSwapDto: EscrowEvmDto) {
    try {
      this.logger.log(`Running test swap with status: ${testSwapDto.status}`);

      switch (testSwapDto.status) {
        case SwapStatusEnum.ORDER_PLACED:
          this.logger.log("Simulating order placement");
          return { success: true, message: "Order placed successfully" };

        case SwapStatusEnum.HTLC_EVM_CREATE:
          try {
            // Get required parameters with proper types
            const recipientAddress: string =
              testSwapDto.recipientAddress ||
              this.configService.get<string>("EVM_RECIPIENT_ADDRESS") ||
              "";
            const amount: string =
              testSwapDto.amount ||
              this.configService.get<string>("AMOUNT", "10") ||
              "0.05";
            const timelock: string =
              testSwapDto.timelock ||
              this.configService.get<string>("TIMELOCK", "3600"); // 1 hour default
            const hashlock: string =
              testSwapDto.hashlock ||
              "0x1234567890123456789012345678901234567890123456789012345678901234";
            const tokenAddress: string =
              testSwapDto.tokenAddress ||
              this.configService.get<string>("EVM_TOKEN_ADDRESS") ||
              "";

            if (!recipientAddress || !hashlock || !tokenAddress) {
              throw new Error(
                "Missing required parameters for escrow creation",
              );
            }

            this.logger.log(
              `Creating escrow with parameters:\n` +
              `- Recipient: ${recipientAddress}\n` +
              `- Amount: ${amount}\n` +
              `- Timelock: ${timelock} seconds\n` +
              `- Hashlock: ${hashlock}\n` +
              `- Token: ${tokenAddress}`,
            );

            // Get typed EscrowFactory contract
            const escrowFactory = this.evmService.getEscrowFactoryContract();

            // Convert addresses to BigInt as required by contract
            const makerBigInt = BigInt(recipientAddress);
            const takerBigInt = BigInt(this.evmService.getWalletAddress());
            const tokenBigInt = BigInt(tokenAddress);
            const amountWei = BigInt(ethers.parseUnits(amount));

            // Create a unique order hash
            const orderHash = ethers.keccak256(
              ethers.toUtf8Bytes(`${Date.now()}`),
            );

            // Prepare timelocks array with 8 elements (contract expects uint256[8])
            const now = Math.floor(Date.now() / 1000);
            const timelocks = [
              now, // start time
              now + parseInt(timelock), // end time
              0,
              0,
              0,
              0,
              0,
              0, // padding with zeros
            ];

            const immutables = {
              maker: makerBigInt,
              taker: takerBigInt,
              token: tokenBigInt,
              amount: amountWei,
              secretHash: hashlock,
              timelocks: {
                values: timelocks,
              },
              safetyDeposit: 0,
              orderHash: orderHash,
            };

            // Log the complete immutables structure
            console.log(
              "Escrow deployment parameters:",
              JSON.stringify(
                {
                  ...immutables,
                  maker: immutables.maker.toString(),
                  taker: immutables.taker.toString(),
                  token: immutables.token.toString(),
                  amount: immutables.amount.toString(),
                  secretHash: immutables.secretHash,
                  timelocks: immutables.timelocks.values.map((v) =>
                    v.toString(),
                  ),
                },
                null,
                2,
              ),
            );

            console.log("Deploying escrow via factory...");
            const maxRetries = 3;
            let retryCount = 0;
            let tx: ethers.ContractTransactionResponse | undefined;

            while (retryCount < maxRetries) {
              try {
                console.log(
                  `Attempt ${retryCount + 1}/${maxRetries} to deploy escrow...`,
                );
                tx = await escrowFactory.deploy(immutables);
                console.log("Deploy transaction sent successfully!");
                break;
              } catch (error: unknown) {
                retryCount++;
                if (retryCount >= maxRetries) {
                  throw error;
                }
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * retryCount),
                );
              }
            }

            if (!tx) {
              throw new Error("Transaction failed after retries");
            }

            console.log("Waiting for transaction confirmation...");
            const receipt =
              (await tx.wait()) as ethers.ContractTransactionReceipt;
            console.log("Transaction receipt:", receipt);

            if (!receipt) {
              throw new Error("Transaction receipt not available");
            }

            const transactionHash = receipt.hash;

            // Parse logs using contract interface with proper type assertion
            const escrowFactoryInterface = new ethers.Interface(
              this.evmService.getEscrowFactoryAbi(),
            );

            for (const log of receipt.logs) {
              try {
                const parsedLog = escrowFactoryInterface.parseLog(log);
                if (parsedLog?.name === "EscrowDeployed") {
                  const escrowAddress = parsedLog.args[0];
                  if (typeof escrowAddress !== "string") {
                    throw new Error("Invalid escrow address format");
                  }

                  // Save to database
                  await this.dbService.createEvmEscrow({
                    evmHtlcAddress: escrowAddress,
                    direction: SwapDirection.EVM_TO_APTOS,
                    status: SwapStatus.PENDING,
                    sender: recipientAddress,
                    fromTokenAddress: tokenAddress,
                    amount: amount,
                    hashlock: hashlock,
                    timelock: Number(timelock),
                    timestamp: Math.floor(Date.now() / 1000),
                    orderHash: transactionHash,
                  });

                  this.logger.log(`Escrow deployed at: ${escrowAddress}`);
                  return {
                    success: true,
                    message: "Escrow created successfully",
                    escrowAddress,
                  };
                }
              } catch (error: unknown) {
                this.logger.debug(
                  "Skipping log that couldn't be parsed:",
                  error instanceof Error ? error.message : String(error),
                );
                continue;
              }
            }

            throw new Error("Deployed event not found in transaction logs");
          } catch (error: unknown) {
            this.logger.error(
              "Escrow creation failed",
              error instanceof Error ? error : new Error(String(error)),
            );
            throw new InternalServerErrorException("Escrow creation failed");
          }

        case SwapStatusEnum.HTLC_APTOS_CREATE:
          this.logger.log("Simulating escrow funding");
          return { success: true, message: "Escrow funded successfully" };

        case SwapStatusEnum.HTLC_EVM_COMPLETED:
          this.logger.log("Simulating swap completion");
          return { success: true, message: "Swap completed successfully" };

        case SwapStatusEnum.CANCELLED:
          this.logger.log("Simulating swap cancellation");
          return { success: true, message: "Swap cancelled successfully" };

        default:
          return { success: false, message: "Unsupported test status" };
      }
    } catch (error) {
      this.logger.error("Test swap failed", error);
      throw new InternalServerErrorException("Test swap failed");
    }
  }

  async getSwapStatus(swapId: string): Promise<SwapStatusDto> {
    try {
      this.logger.log(`Getting status for swap ${swapId}`);

      const swap = await this.dbService.findSwapById(swapId);

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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
      const swap = await this.dbService.findSwapById(swapId);

      if (!swap) {
        throw new NotFoundException(`Swap with ID ${swapId} not found`);
      }

      // Validate that the preimage matches the hashlock
      const calculatedHash = ethers.keccak256(ethers.toUtf8Bytes(preimage));

      if (calculatedHash !== swap.hashlock) {
        throw new Error(
          `Preimage does not match hashlock. Expected hash: ${swap.hashlock}, got: ${calculatedHash}`,
        );
      }

      // Update the swap with the preimage and mark as completed
      const updatedSwap = await this.dbService.updateSwap({
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
          const htlcResult = null;
          // await this.aptosService.createEscrow(
          //  {
          //    swap.orderHash ?? "",
          //   swap.hashlock ?? "",
          //   swap.recipient,
          //   swap.amount,
          //   "0",
          //   swap.timelock?.toString() ?? "0",
          //   "0",
          //   "0",
          //   swap.sender,}
          // );

          if (htlcResult) {
            // Update the swap with Aptos HTLC address
            // await this.dbService.updateSwap({
            //   where: { id: swapId },
            //   data: {
            //     aptosHtlcAddress: htlcResult.txHash,
            //   },
            // });
            // this.logger.log(`Created Aptos HTLC with ID: ${htlcResult.txHash}`);
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
      const swap = await this.dbService.findSwapById(swapId);

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
          `Timelock expires at ${new Date(swap.timelock * 1000).toISOString()}`,
        );
      }

      // If there's an Aptos HTLC address, try to refund it
      if (swap.aptosHtlcAddress) {
        try {
          this.logger.log(`Refunding Aptos HTLC for swap ${swapId}`);
          const refundResult = await this.aptosService.refundAptosHtlc({
            contractId: swap.aptosHtlcAddress,
          });

          this.logger.log(
            `Aptos HTLC refund result: ${JSON.stringify(refundResult)}`,
          );

          // Even if the refund fails, we continue with updating the swap status
          // as the timelock may have expired on-chain already
        } catch (refundError: unknown) {
          const refundErrorMessage =
            refundError instanceof Error
              ? refundError.message
              : String(refundError);
          this.logger.warn(
            `Failed to refund Aptos HTLC, but continuing with swap cancellation: ${refundErrorMessage}`,
          );
        }
      }

      // TODO: If there's an EVM HTLC address, refund it as well
      // This would require implementing refund functionality in EvmService

      // Update the swap status to refunded
      const updatedSwap = await this.dbService.updateSwap({
        where: { id: swapId },
        data: {
          status: SwapStatus.REFUNDED,
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

      const swaps = await this.dbService.findSwaps({
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
