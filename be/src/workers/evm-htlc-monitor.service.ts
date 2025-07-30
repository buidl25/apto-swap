import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { EvmService } from "../evm/evm.service";
import { ethers, Contract, EventLog, JsonRpcProvider, Filter } from "ethers";

/**
 * Interface for preimage discovery event payload
 */
interface PreimageDiscoveredEvent {
  contractId: string;
  preimage: string;
  transactionHash: string;
}

/**
 * Type guard to check if an object is an EventLog with args
 */
function isEventLogWithArgs(
  event: unknown,
): event is EventLog & { args: readonly unknown[] } {
  return (
    Boolean(event) &&
    typeof event === "object" &&
    "args" in event! &&
    Array.isArray((event as { args?: unknown[] }).args)
  );
}

/**
 * Service for monitoring EVM HTLC events and detecting preimage revelations
 */
@Injectable()
export class EvmHtlcMonitorService implements OnModuleInit {
  private readonly logger = new Logger(EvmHtlcMonitorService.name);
  private provider: JsonRpcProvider | null = null;
  private readonly htlcAbi: readonly string[] = [
    "event Withdrawn(bytes32 indexed contractId, bytes32 preimage)",
  ];
  private eventPollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 30000; // 30 seconds
  private isActive = false;
  private monitoredContracts: Map<
    string,
    { swapId: string; lastBlock: number }
  > = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly evmService: EvmService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Empty constructor
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.setupEvmConnection();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to initialize EVM connection: ${errorMessage}`);
    }
  }

  /**
   * Set up connection to EVM network
   */
  private async setupEvmConnection(): Promise<void> {
    try {
      const evmRpcUrl =
        this.configService.get<string>("EVM_RPC_URL") ||
        "https://sepolia.infura.io/v3/your-api-key";

      // Create a new provider with the RPC URL
      const provider = new JsonRpcProvider(evmRpcUrl);

      // Test the connection by getting the current block number
      await provider.getBlockNumber();

      // Assign to class property after successful connection
      this.provider = provider;

      this.logger.log(`EVM connection established to ${evmRpcUrl}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to connect to EVM network: ${errorMessage}`);
      throw new Error(`Failed to connect to EVM network: ${errorMessage}`);
    }
  }

  /**
   * Start monitoring a specific HTLC contract
   * @param swapId - ID of the swap to monitor
   * @param htlcAddress - Address of the HTLC contract to monitor
   */
  async startMonitoring(swapId: string, htlcAddress: string): Promise<void> {
    try {
      this.logger.log(
        `Starting monitoring for EVM HTLC ${htlcAddress} for swap ${swapId}`,
      );

      if (!this.provider) {
        await this.setupEvmConnection();
      }

      // Get current block number to start monitoring from
      const provider = this.provider;
      if (!provider) {
        throw new Error("Provider not initialized");
      }

      const currentBlock = await provider.getBlockNumber();

      // Add to monitored contracts
      this.monitoredContracts.set(htlcAddress, {
        swapId,
        lastBlock: currentBlock - 10, // Start a few blocks back to catch recent events
      });

      // Start polling if not already active
      if (!this.isActive) {
        this.startEventPolling();
      }

      // Immediately check for events
      await this.checkEventsForContract(htlcAddress);

      this.logger.log(`Initial check completed for HTLC ${htlcAddress}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Error during initial check for HTLC ${htlcAddress}: ${errorMessage}`,
      );
      throw new Error(
        `Error during initial check for HTLC ${htlcAddress}: ${errorMessage}`,
      );
    }
  }

  /**
   * Stop monitoring a specific HTLC contract
   * @param htlcAddress - Address of the HTLC contract to stop monitoring
   */
  async stopMonitoring(htlcAddress: string): Promise<void> {
    try {
      if (this.monitoredContracts.has(htlcAddress)) {
        this.monitoredContracts.delete(htlcAddress);
        this.logger.log(`Stopped monitoring HTLC ${htlcAddress}`);

        // If no more contracts to monitor, stop polling
        if (this.monitoredContracts.size === 0) {
          this.stopEventPolling();
        }
      }

      // Adding an await to satisfy the async method requirement
      await Promise.resolve();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Error stopping monitoring for HTLC ${htlcAddress}: ${errorMessage}`,
      );
      // Rethrow as a proper Error object to ensure type safety
      throw new Error(
        `Error stopping monitoring for HTLC ${htlcAddress}: ${errorMessage}`,
      );
    }
  }

  /**
   * Start event polling to track HTLC events on EVM
   * This will periodically check for new withdrawn events to extract preimages
   */
  private startEventPolling(): void {
    if (this.isActive) {
      return;
    }

    this.logger.log("Starting EVM HTLC event polling");
    this.isActive = true;

    // Set up interval to check for events
    this.eventPollingInterval = setInterval(async () => {
      try {
        await this.checkWithdrawnEvents();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Error in event polling: ${errorMessage}`);
      }
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop event polling
   */
  private stopEventPolling(): void {
    if (this.eventPollingInterval) {
      clearInterval(this.eventPollingInterval);
      this.eventPollingInterval = null;
      this.logger.log("Stopped EVM HTLC event polling");
      this.isActive = false;
    }
  }

  /**
   * Check for withdrawn HTLC events and extract preimages
   */
  private async checkWithdrawnEvents(): Promise<void> {
    if (this.monitoredContracts.size === 0) {
      return;
    }

    try {
      this.logger.log("Checking for EVM HTLC withdrawn events");

      // Get current block number
      const provider = this.provider;
      if (!provider) {
        throw new Error("Provider not initialized");
      }

      const currentBlock = await provider.getBlockNumber();

      // Check events for each monitored contract
      // Convert entries to array to avoid TypeScript downlevelIteration issues
      const entries = Array.from(this.monitoredContracts.entries());
      for (let i = 0; i < entries.length; i++) {
        const [htlcAddress, { lastBlock }] = entries[i];
        await this.checkEventsForContract(htlcAddress, lastBlock, currentBlock);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Error checking withdrawn events: ${errorMessage}`);
      // Don't rethrow here to keep the polling loop running
    }
  }

  /**
   * Check events for a specific contract
   * @param htlcAddress - Address of the HTLC contract to check
   * @param fromBlock - Optional block to start checking from
   * @param toBlock - Optional block to check until
   */
  private async checkEventsForContract(
    htlcAddress: string,
    fromBlock?: number,
    toBlock?: number,
  ): Promise<void> {
    try {
      const contractInfo = this.monitoredContracts.get(htlcAddress);
      if (!contractInfo) {
        return;
      }

      const provider = this.provider;
      if (!provider) {
        throw new Error("Provider not initialized");
      }

      // Use provided blocks or get from contract info
      const startBlock = fromBlock ?? contractInfo.lastBlock;
      const endBlock = toBlock ?? (await provider.getBlockNumber());

      // Create contract interface for events
      const contract = new Contract(htlcAddress, this.htlcAbi, provider);

      // Get withdrawn events
      // const filter = contract.filters.Withdrawn() as Filter;
      // const events = (await contract.queryFilter(
      //   filter,
      //   startBlock,
      //   endBlock,
      // )) as EventLog[];

      // if (events.length > 0) {
      //   this.logger.log(
      //     `Found ${events.length} withdrawn events for contract ${htlcAddress}`,
      //   );
      // }

      // // Process events
      // for (const event of events) {
      //   // Use type guard to ensure event has args
      //   if (isEventLogWithArgs(event)) {
      //     const contractId = event.args[0]; // First argument is contractId
      //     const preimage = event.args[1]; // Second argument is preimage

      //     if (contractId && preimage) {
      //       // Convert bytes to hex string using ethers v6 syntax
      //       const preimageHex = ethers.hexlify(preimage as Uint8Array);
      //       const contractIdHex = ethers.hexlify(contractId as Uint8Array);

      //       this.logger.log(
      //         `Found preimage for contract ${contractIdHex}: ${preimageHex}`,
      //       );

      //       // Emit event for other services to handle
      //       this.eventEmitter.emit("evm.preimage.discovered", {
      //         contractId: contractIdHex,
      //         preimage: preimageHex,
      //         transactionHash: event.transactionHash,
      //       } as PreimageDiscoveredEvent);
      //     }
      // }
      //   }

      // Update last processed block
      //   this.monitoredContracts.set(htlcAddress, {
      //   swapId: contractInfo.swapId,
      //   lastBlock: endBlock,
      // });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Error checking events for HTLC ${htlcAddress}: ${errorMessage}`,
      );
      // Rethrow as a proper Error object to ensure type safety
      throw new Error(
        `Error checking events for HTLC ${htlcAddress}: ${errorMessage}`,
      );
    }
  }

  /**
   * Get the current monitoring status
   * @returns Object containing active status and list of monitored contract addresses
   */
  getMonitoringStatus(): { isActive: boolean; monitoredContracts: string[] } {
    return {
      isActive: this.isActive,
      monitoredContracts: Array.from(this.monitoredContracts.keys()),
    };
  }
}
