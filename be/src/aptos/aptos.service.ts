import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AptosClient, AptosAccount, HexString } from "aptos";
import { AptosHtlcMonitorService } from "../workers/aptos-htlc-monitor.service";
interface PublicEntryFunctionPayload {
  function: string;
  type_arguments: string[];
  arguments: any[];
}

@Injectable()
export class AptosService implements OnModuleInit {
  private readonly logger = new Logger(AptosService.name);
  private aptosClient: AptosClient;
  private relayerAccount: AptosAccount;
  private moduleAddress: string;
  private eventPollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 30000; // 30 seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly aptosHtlcMonitorService: AptosHtlcMonitorService,
  ) { }

  async onModuleInit() {
    await this.setupAptosConnection();
    // We don't need to start our own event listener anymore
    // as AptosHtlcMonitorService handles this
    // this.startEventListener();

    // Subscribe to preimage discovery events
    // this.eventEmitter.on("aptos.preimage.discovered", (payload) => {
    //   this.logger.log(
    //     `AptosService received preimage discovery event: ${JSON.stringify(payload)}`,
    //   );
    //   // Here you can add additional logic if needed when a preimage is discovered
    // });
  }

  async getAptosAddress(): Promise<{ address: string }> {
    this.logger.log("Getting Aptos address");
    return { address: this.relayerAccount.address().hex() };
  }

  registerAptosToken(): Promise<{ success: boolean; txHash: string }> {
    this.logger.log("Registering Aptos token");
    return Promise.resolve({ success: true, txHash: "sample_tx_hash" });
  }

  setupAptosToken(): Promise<{ success: boolean; txHash: string }> {
    this.logger.log("Setting up Aptos token");
    return Promise.resolve({ success: true, txHash: "sample_tx_hash" });
  }

  mintAptosTokens(): Promise<{
    success: boolean;
    amount: string;
    txHash: string;
  }> {
    this.logger.log("Minting Aptos tokens");
    return Promise.resolve({
      success: true,
      amount: "1000",
      txHash: "sample_tx_hash",
    });
  }

  checkAptosBalance(): Promise<{ balance: string }> {
    this.logger.log("Checking Aptos balance");
    return Promise.resolve({ balance: "1000" });
  }

  checkAptosRecipientBalance(): Promise<{ balance: string }> {
    this.logger.log("Checking Aptos recipient balance");
    return Promise.resolve({ balance: "500" });
  }

  listAptosHtlcs(): Promise<{
    htlcs: Array<{ id: string; amount: string; status: string }>;
  }> {
    this.logger.log("Listing Aptos HTLCs");
    return Promise.resolve({
      htlcs: [
        { id: "htlc_1", amount: "100", status: "active" },
        { id: "htlc_2", amount: "200", status: "completed" },
      ],
    });
  }

  checkAptosHtlcContracts(): Promise<{
    contracts: Array<{ address: string; name: string }>;
  }> {
    this.logger.log("Checking Aptos HTLC contracts");
    return Promise.resolve({
      contracts: [
        { address: "contract_address_1", name: "HTLC Contract 1" },
        { address: "contract_address_2", name: "HTLC Contract 2" },
      ],
    });
  }

  async createEscrow({
    orderHash,
    hashlock,
    maker,
    recipient,
    aptosAmount,
    safetyDeposit,
    dstWithdrawalDelay,
    dstPublicWithdrawalDelay,
    dstCancellationDelay,
  }) {
    this.logger.log("Creating Aptos escrow");
    const moduleAddress =
      this.moduleAddress || process.env.APTOS_MODULE_ADDRESS;

    try {
      // Convert arguments to proper types
      const orderHashBytes = HexString.ensure(orderHash).toUint8Array();
      const hashlockBytes = HexString.ensure(hashlock).toUint8Array();
      const amountNum = BigInt(aptosAmount);

      const payload: PublicEntryFunctionPayload = {
        function: `${moduleAddress}::escrow_factory::create_dst_escrow`,
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [
          Array.from(orderHashBytes), // Convert to number[] for BCS serialization
          Array.from(hashlockBytes),
          maker,
          recipient,
          amountNum.toString(), // Convert BigInt to string
          safetyDeposit,
          dstWithdrawalDelay,
          dstPublicWithdrawalDelay,
          dstCancellationDelay,
        ],
      };

      const result = await this.submitTransaction(payload);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create escrow: ${error}`);
      throw error;
    }
  }

  async createAptosHtlc(params: {
    recipient: string;
    amount: string;
    hashlock: string;
    timelock: number;
  }): Promise<{
    success: boolean;
    htlcId: string;
    txHash: string;
  }> {
    this.logger.log("Creating Aptos HTLC");
    const { recipient, amount, hashlock, timelock } = params;

    try {
      // Ensure hashlock is properly formatted (without 0x prefix for the payload)
      const hashlockHex = hashlock.startsWith("0x")
        ? hashlock.slice(2)
        : hashlock;

      // Create the transaction payload
      const payload: PublicEntryFunctionPayload = {
        function: `${this.moduleAddress}::atomic_swap::create_htlc`,
        type_arguments: [
          `${this.moduleAddress}::test_aptos_token::TestAptosToken`,
        ],
        arguments: [recipient, amount, `0x${hashlockHex}`, timelock.toString()],
      };

      this.logger.log(`Creating HTLC with payload: ${JSON.stringify(payload)}`);

      // Build and submit the transaction
      const rawTx = await this.aptosClient.generateTransaction(
        this.relayerAccount.address(),
        payload,
      );

      const signedTx = await this.aptosClient.signTransaction(
        this.relayerAccount,
        rawTx,
      );

      const txResult = await this.aptosClient.submitTransaction(signedTx);

      // Wait for transaction to be confirmed
      await this.aptosClient.waitForTransaction(txResult.hash);

      // Generate the contract ID
      const contractId = "";
      //this.generateContractId(
      //   this.relayerAccount.address().hex(),
      //   recipient,
      //   amount,
      //   hashlock,
      //   timelock,
      // );

      this.logger.log(`HTLC created successfully with ID: ${contractId}`);

      return {
        success: true,
        htlcId: contractId,
        txHash: txResult.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to create Aptos HTLC: ${error.message}`);
      throw error;
    }
  }
  private async setupAptosConnection() {
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
      this.logger.error(`Failed to setup Aptos connection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a contract ID from HTLC parameters
   */
  // private generateContractId(
  //   sender: string,
  //   recipient: string,
  //   amount: string,
  //   hashlock: string,
  //   timelock: number,
  // ): string {
  //   // Convert all parameters to Buffer
  //   const senderBuf = Buffer.from(sender.replace("0x", ""), "hex");
  //   const recipientBuf = Buffer.from(recipient.replace("0x", ""), "hex");

  //   // Convert amount to 8-byte little-endian buffer
  //   const amountNum = BigInt(amount);
  //   const amountBuf = Buffer.alloc(8);
  //   amountBuf.writeBigUInt64LE(amountNum);

  //   // Convert hashlock to buffer
  //   const hashlockBuf = Buffer.from(hashlock.replace("0x", ""), "hex");

  //   // Convert timelock to 8-byte little-endian buffer
  //   const timelockNum = BigInt(timelock);
  //   const timelockBuf = Buffer.alloc(8);
  //   timelockBuf.writeBigUInt64LE(timelockNum);

  //   // Concatenate all buffers in the correct order
  //   const data = Buffer.concat([
  //     senderBuf,
  //     recipientBuf,
  //     amountBuf,
  //     hashlockBuf,
  //     timelockBuf,
  //   ]);

  //   // Hash with SHA3-256
  //   const hash = crypto.createHash("sha3-256").update(data).digest("hex");

  //   return `0x${hash}`;
  // }

  async withdrawAptosHtlc(params: {
    contractId: string;
    preimage: string;
  }): Promise<{ success: boolean; txHash: string }> {
    this.logger.log("Withdrawing from Aptos HTLC");
    const { contractId, preimage } = params;

    try {
      // Create the transaction payload
      const payload: PublicEntryFunctionPayload = {
        function: `${this.moduleAddress}::atomic_swap::withdraw`,
        type_arguments: [
          `${this.moduleAddress}::test_aptos_token::TestAptosToken`,
        ],
        arguments: [contractId, preimage],
      };

      this.logger.log(
        `Withdrawing from HTLC with payload: ${JSON.stringify(payload)}`,
      );

      // Build and submit the transaction
      const rawTx = await this.aptosClient.generateTransaction(
        this.relayerAccount.address(),
        payload,
      );

      const signedTx = await this.aptosClient.signTransaction(
        this.relayerAccount,
        rawTx,
      );

      const txResult = await this.aptosClient.submitTransaction(signedTx);

      // Wait for transaction to be confirmed
      await this.aptosClient.waitForTransaction(txResult.hash);

      this.logger.log(`HTLC withdrawn successfully: ${txResult.hash}`);

      return {
        success: true,
        txHash: txResult.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to withdraw from Aptos HTLC: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refunds an Aptos HTLC contract after timelock expiration
   * @param params - Contract parameters
   * @returns Success status and transaction hash
   */
  async refundAptosHtlc(params: {
    contractId: string;
  }): Promise<{ success: boolean; txHash: string }> {
    const { contractId } = params;
    this.logger.log(`Refunding Aptos HTLC with contract ID: ${contractId}`);

    try {
      // Prepare the transaction payload for refund
      const payload: PublicEntryFunctionPayload = {
        function: `${this.moduleAddress}::atomic_swap::refund`,
        type_arguments: [
          `${this.moduleAddress}::test_aptos_token::TestAptosToken`,
        ],
        arguments: [contractId],
      };

      // Create and sign the transaction
      const rawTx = await this.aptosClient.generateTransaction(
        this.relayerAccount.address(),
        payload,
      );

      const signedTx = await this.aptosClient.signTransaction(
        this.relayerAccount,
        rawTx,
      );

      // Submit the transaction
      const txResult = await this.aptosClient.submitTransaction(signedTx);

      // Wait for the transaction to be confirmed
      await this.aptosClient.waitForTransaction(txResult.hash);

      this.logger.log(`Successfully refunded Aptos HTLC: ${txResult.hash}`);
      return { success: true, txHash: txResult.hash };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to refund Aptos HTLC: ${errorMessage}`);
      throw new Error(`Failed to refund Aptos HTLC: ${errorMessage}`);
    }
  }

  async checkAptosHtlcEvents(): Promise<{
    events: Array<{ type: string; data: Record<string, unknown> }>;
  }> {
    this.logger.log("Checking Aptos HTLC events");

    try {
      // Fetch HTLCCreatedEvents
      const createdEvents = await this.aptosClient.getEventsByEventHandle(
        this.moduleAddress,
        `${this.moduleAddress}::atomic_swap::HTLCStore`,
        "created_events",
        { limit: 100 },
      );

      // Fetch HTLCWithdrawnEvents
      const withdrawnEvents = await this.aptosClient.getEventsByEventHandle(
        this.moduleAddress,
        `${this.moduleAddress}::atomic_swap::HTLCStore`,
        "withdrawn_events",
        { limit: 100 },
      );

      // Fetch HTLCRefundedEvents
      const refundedEvents = await this.aptosClient.getEventsByEventHandle(
        this.moduleAddress,
        `${this.moduleAddress}::atomic_swap::HTLCStore`,
        "refunded_events",
        { limit: 100 },
      );

      // Format and combine all events
      const formattedEvents = [
        ...createdEvents.map((event) => ({
          type: "htlc_created",
          data: event.data,
        })),
        ...withdrawnEvents.map((event) => ({
          type: "htlc_withdrawn",
          data: event.data,
        })),
        ...refundedEvents.map((event) => ({
          type: "htlc_refunded",
          data: event.data,
        })),
      ];

      this.logger.log(`Found ${formattedEvents.length} HTLC events`);

      return {
        events: formattedEvents,
      };
    } catch (error) {
      this.logger.error(`Failed to check Aptos HTLC events: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the status of the HTLC event monitoring service
   */
  getMonitoringStatus(): { isActive: boolean; lastProcessedVersion: number } {
    return this.aptosHtlcMonitorService.getMonitoringStatus();
  }

  /**
   * Manually trigger a check for withdrawn events
   * This is useful for testing or when immediate checking is needed
   */
  async checkForWithdrawnEvents(): Promise<{ checked: boolean }> {
    try {
      // Use the monitor service to check for events
      await this.aptosHtlcMonitorService.checkWithdrawnEvents();
      return { checked: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to check for withdrawn events: ${error.message}`,
      );
      return { checked: false };
    }
  }

  initializeAptosHtlc(): Promise<{ success: boolean; txHash: string }> {
    this.logger.log("Initializing Aptos HTLC");
    return Promise.resolve({ success: true, txHash: "sample_tx_hash" });
  }

  /**
   * Generic method to submit transactions to Aptos blockchain
   * @param payload - The transaction payload
   * @returns Success status and transaction hash
   */
  async submitTransaction(
    payload: PublicEntryFunctionPayload,
  ): Promise<{ success: boolean; txHash: string }> {
    this.logger.log(
      `Submitting transaction with payload: ${JSON.stringify(payload)}`,
    );

    try {
      // Generate the transaction
      const rawTx = await this.aptosClient.generateTransaction(
        this.relayerAccount.address(),
        payload,
      );

      // Sign the transaction
      const signedTx = await this.aptosClient.signTransaction(
        this.relayerAccount,
        rawTx,
      );

      // Submit the transaction
      const txResult = await this.aptosClient.submitTransaction(signedTx);

      // Wait for transaction to be confirmed
      await this.aptosClient.waitForTransaction(txResult.hash);

      this.logger.log(`Transaction submitted successfully: ${txResult.hash}`);

      return {
        success: true,
        txHash: txResult.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to submit transaction: ${error.message}`);
      throw error;
    }
  }
}
