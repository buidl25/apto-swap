import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AptosClient, AptosAccount, HexString } from "aptos";
import { EventEmitter2 } from "@nestjs/event-emitter";

/**
 * Interface for Aptos event
 */
interface AptosEvent {
  version: string;
  data: Record<string, any>;
  [key: string]: any;
}

/**
 * Interface for Aptos HTLC withdrawn event data
 */
interface AptosHtlcWithdrawnEvent extends AptosEvent {
  data: {
    contract_id: string;
    preimage: string;
    [key: string]: any;
  };
}

/**
 * Interface for preimage discovery event payload
 */
interface PreimageDiscoveredEvent {
  contractId: string;
  preimage: string;
  version: string;
}

/**
 * Service for monitoring Aptos HTLC events and detecting preimage revelations
 */
@Injectable()
export class AptosHtlcMonitorService implements OnModuleInit {
  private readonly logger = new Logger(AptosHtlcMonitorService.name);
  private aptosClient: AptosClient;
  private relayerAccount: AptosAccount;
  private moduleAddress: string;
  private eventPollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 30000; // 30 seconds
  private lastProcessedVersion = 0;
  private isActive = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async onModuleInit(): Promise<void> {
    await this.setupAptosConnection();
    this.startEventListener();
  }

  /**
   * Set up connection to Aptos network
   */

  private async setupAptosConnection(): Promise<void> {
    try {
      const aptosRpcUrl =
        this.configService.get<string>("APTOS_RPC_URL") ||
        "https://fullnode.devnet.aptoslabs.com/v1";

      const privateKey = this.configService.get<string>(
        "RELAYER_PRIVATE_KEY_APTOS",
      );

      this.moduleAddress =
        this.configService.get<string>("APTOS_MODULE_ADDRESS") ||
        "0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128";

      if (!privateKey) {
        throw new Error(
          "RELAYER_PRIVATE_KEY_APTOS must be defined in the environment",
        );
      }

      this.aptosClient = new AptosClient(aptosRpcUrl);
      this.relayerAccount = new AptosAccount(
        HexString.ensure(privateKey).toUint8Array(),
      );

      this.logger.log(`Aptos connection established to ${aptosRpcUrl}`);
      this.logger.log(
        `Relayer address: ${this.relayerAccount.address().hex()}`,
      );
      this.logger.log(`Module address: ${this.moduleAddress}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to setup Aptos connection: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Start event listener to track HTLC events on Aptos
   * This will periodically check for new withdrawn events to extract preimages
   */

  private startEventListener(): void {
    this.logger.log("Starting Aptos HTLC event listener");

    // Clear any existing interval
    if (this.eventPollingInterval) {
      clearInterval(this.eventPollingInterval);
    }

    // Set up polling interval
    this.eventPollingInterval = setInterval(() => {
      // Using void to ignore the promise without awaiting it
      // This is safe because we're handling errors inside checkWithdrawnEvents
      void this.checkWithdrawnEvents().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Error in event polling interval: ${errorMessage}`);
      });
    }, this.POLLING_INTERVAL);

    this.isActive = true;
  }

  /**
   * Stop event listener
   */
  stopEventListener(): void {
    if (this.eventPollingInterval) {
      clearInterval(this.eventPollingInterval);
      this.eventPollingInterval = null;
      this.logger.log("Stopped Aptos HTLC event listener");
      this.isActive = false;
    }
  }

  /**
   * Check for withdrawn HTLC events and extract preimages
   */

  async checkWithdrawnEvents(): Promise<void> {
    try {
      this.logger.debug("Checking for Aptos HTLC withdrawn events");

      // // Fetch withdrawn events to look for revealed preimages
      // const rawEvents = await this.aptosClient.getEventsByEventHandle(
      //   this.moduleAddress,
      //   `${this.moduleAddress}::atomic_swap::HTLCStore`,
      //   'withdrawn_events',
      //   { limit: 20 }, // Limit to recent events
      // );

      // // Convert raw events to AptosEvent type with proper structure
      // const withdrawnEvents = rawEvents.map(event => ({
      //   version: event.version?.toString() || '0',
      //   data: event.data || {},
      // })) as AptosEvent[];

      // // Sort events by version to process in order
      // const sortedEvents = withdrawnEvents
      //   .filter((event) => parseInt(event.version) > this.lastProcessedVersion)
      //   .sort((a, b) => parseInt(a.version) - parseInt(b.version));

      // if (sortedEvents.length > 0) {
      //   this.logger.log(`Found ${sortedEvents.length} new withdrawn events to process`);
      // }

      // // Process withdrawn events to extract preimages
      // for (const event of sortedEvents) {
      //   const typedEvent = event as AptosHtlcWithdrawnEvent;
      //   if (typedEvent.data && typedEvent.data.preimage) {
      //     const contractId = typedEvent.data.contract_id;
      //     const preimage = typedEvent.data.preimage;
      //     const version = typedEvent.version;

      //     this.logger.log(`Found preimage for contract ${contractId}: ${preimage}`);

      //     // Emit event for other services to handle
      //     this.eventEmitter.emit('aptos.preimage.discovered', {
      //       contractId,
      //       preimage,
      //       version,
      //     } as PreimageDiscoveredEvent);

      //     // Update last processed version
      //     this.lastProcessedVersion = parseInt(version);
      //   }
      // }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error checking Aptos HTLC events: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get the current monitoring status
   */
  getMonitoringStatus(): { isActive: boolean; lastProcessedVersion: number } {
    return {
      isActive: this.eventPollingInterval !== null,
      lastProcessedVersion: this.lastProcessedVersion,
    };
  }

  /**
   * Start monitoring a specific HTLC contract
   * @param swapId - ID of the swap to monitor
   * @param htlcAddress - Address of the HTLC contract to monitor
   */

  async startMonitoring(swapId: string, htlcAddress: string): Promise<void> {
    this.logger.log(
      `Starting monitoring for HTLC ${htlcAddress} for swap ${swapId}`,
    );

    // Make sure the event listener is running
    if (!this.isActive) {
      await this.setupAptosConnection();
      this.startEventListener();
    }

    // Immediately check for events in case we missed something while the service was down
    try {
      await this.checkWithdrawnEvents();
      this.logger.log(`Initial check completed for HTLC ${htlcAddress}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error during initial check for HTLC ${htlcAddress}: ${errorMessage}`,
      );
    }
  }
}
