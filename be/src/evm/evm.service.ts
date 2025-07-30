import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
// Import the ABI directly using path.join for cross-platform compatibility
import * as path from "path";
import * as fs from "fs";

// Read the ABI file directly from the file system
const abiPath = path.join(
  process.cwd(),
  "../artifacts/contracts/EthereumHTLC.sol/EthereumHTLC.json",
);
// Define interface for the ABI JSON structure
interface AbiJson {
  abi: ethers.InterfaceAbi;
}
const EthereumHTLC_ABI_JSON = JSON.parse(
  fs.readFileSync(abiPath, "utf8"),
) as AbiJson;
const EthereumHTLC_ABI: ethers.InterfaceAbi = EthereumHTLC_ABI_JSON.abi;

@Injectable()
export class EvmService implements OnModuleInit {
  private readonly logger = new Logger(EvmService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private htlcContract: ethers.Contract;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const rpcUrl = this.configService.get<string>("EVM_RPC_URL");
    const relayerPrivateKey = this.configService.get<string>(
      "RELAYER_PRIVATE_KEY_EVM",
    );
    const htlcContractAddress = this.configService.get<string>(
      "EVM_HTLC_CONTRACT_ADDRESS",
    ); // TODO: Get this from a more robust source

    if (!rpcUrl || !relayerPrivateKey || !htlcContractAddress) {
      this.logger.error(
        "Missing EVM configuration. Please check EVM_RPC_URL, RELAYER_PRIVATE_KEY_EVM, and EVM_HTLC_CONTRACT_ADDRESS in your .env file.",
      );
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(relayerPrivateKey, this.provider);

    this.htlcContract = new ethers.Contract(
      htlcContractAddress,
      EthereumHTLC_ABI,
      this.wallet,
    );

    this.logger.log(`EVM Service initialized. Connected to ${rpcUrl}`);
    this.logger.log(`HTLC Contract Address: ${htlcContractAddress}`);
    this.logger.log(`Relayer Address: ${this.wallet.address}`);

    this.htlcContract.on(
      "HTLCCreated",
      (
        contractId,
        sender,
        recipient,
        token,
        amount,
        hashlock,
        timelock,
        event,
      ) => {
        this.logger.log("HTLCCreated Event Received:");
        this.logger.log(`  Contract ID: ${contractId}`);
        this.logger.log(`  Sender: ${sender}`);
        this.logger.log(`  Recipient: ${recipient}`);
        this.logger.log(`  Token: ${token}`);
        this.logger.log(`  Amount: ${amount.toString()}`);
        this.logger.log(`  Hashlock: ${hashlock}`);
        this.logger.log(`  Timelock: ${timelock.toString()}`);
        this.logger.log(`  Transaction Hash: ${event.log.transactionHash}`);
        // TODO: Pass this event data to the SwapOrchestratorService
      },
    );

    this.logger.log("Listening for HTLCCreated events...");
  }

  async withdraw(
    contractId: string,
    preimage: string,
  ): Promise<ethers.TransactionResponse> {
    this.logger.log(
      `Attempting to withdraw EVM HTLC for contract ID: ${contractId}`,
    );
    try {
      const tx = await this.htlcContract.withdraw(contractId, preimage);
      this.logger.log(`Withdrawal transaction sent. Hash: ${tx.hash}`);
      await tx.wait();
      this.logger.log(
        `Withdrawal transaction confirmed for contract ID: ${contractId}`,
      );
      return tx;
    } catch (error) {
      this.logger.error(
        `Failed to withdraw EVM HTLC for contract ID ${contractId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Starts the EVM node
   * @returns Information about the started node
   */
  async startEvmNode(): Promise<{
    status: string;
    nodeInfo: Record<string, any>;
  }> {
    this.logger.log("Starting EVM node");
    // Implementation would depend on how you're managing your EVM node
    return {
      status: "success",
      nodeInfo: {
        url: this.configService.get<string>("EVM_RPC_URL"),
        chainId: await this.provider
          .getNetwork()
          .then((network) => network.chainId),
        blockNumber: await this.provider.getBlockNumber(),
      },
    };
  }

  /**
   * Deploys an ERC20 token for testing
   * @returns Deployment information
   */
  async deployEvmToken(): Promise<{
    status: string;
    tokenAddress: string;
    txHash: string;
  }> {
    this.logger.log("Deploying EVM token");
    // Implementation would deploy a token contract
    return {
      status: "success",
      tokenAddress: "0x0000000000000000000000000000000000000000", // Placeholder
      txHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
    };
  }

  /**
   * Deploys the HTLC contract
   * @returns Deployment information
   */
  async deployEvmHtlc(): Promise<{
    status: string;
    htlcAddress: string;
    txHash: string;
  }> {
    this.logger.log("Deploying EVM HTLC");
    // Implementation would deploy the HTLC contract
    return {
      status: "success",
      htlcAddress: "0x0000000000000000000000000000000000000000", // Placeholder
      txHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
    };
  }

  /**
   * Creates a new HTLC instance
   * @returns Creation information
   */
  async createEvmHtlc(): Promise<{
    status: string;
    htlcId: string;
    txHash: string;
  }> {
    this.logger.log("Creating EVM HTLC instance");
    // Implementation would create a new HTLC instance
    return {
      status: "success",
      htlcId:
        "0x0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
      txHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
    };
  }

  /**
   * Checks the balance of an address
   * @returns Balance information
   */
  async checkEvmBalance(): Promise<{ address: string; balance: string }> {
    this.logger.log("Checking EVM balance");
    const balance = await this.provider.getBalance(this.wallet.address);
    return {
      address: this.wallet.address,
      balance: balance.toString(),
    };
  }

  /**
   * Withdraws funds from an HTLC
   * @param params Parameters for withdrawal
   * @returns Withdrawal information
   */
  async withdrawEvmHtlc(params: {
    contractId: string;
    preimage: string;
  }): Promise<{
    success: boolean;
    htlcId: string;
    txHash: string;
    error?: string;
  }> {
    const { contractId, preimage } = params;
    this.logger.log(
      `Withdrawing from EVM HTLC with contract ID: ${contractId}`,
    );

    try {
      const tx = await this.withdraw(contractId, preimage);
      return {
        success: true,
        htlcId: contractId,
        txHash: tx.hash,
      };
    } catch (error: any) {
      this.logger.error(`Failed to withdraw from EVM HTLC: ${error.message}`);
      return {
        success: false,
        htlcId: contractId,
        txHash: "",
        error: error.message,
      };
    }
  }

  /**
   * Alias for withdrawEvmHtlc for compatibility with AptosPreimageHandlerService
   * @param params Parameters for withdrawal
   * @returns Withdrawal information
   */
  async withdrawFromHtlc(params: {
    htlcId: string;
    preimage: string;
  }): Promise<{ success: boolean; txHash: string; error?: string }> {
    const { htlcId, preimage } = params;
    const result = await this.withdrawEvmHtlc({ contractId: htlcId, preimage });
    return {
      success: result.success,
      txHash: result.txHash,
      error: result.error,
    };
  }

  /**
   * Deploys the Fusion resolver contract
   * @returns Deployment information
   */
  async deployFusionResolver(): Promise<{
    status: string;
    resolverAddress: string;
    txHash: string;
  }> {
    this.logger.log("Deploying Fusion resolver");
    // Implementation would deploy the resolver contract
    return {
      status: "success",
      resolverAddress: "0x0000000000000000000000000000000000000000", // Placeholder
      txHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
    };
  }

  /**
   * Interacts with the Fusion resolver
   * @returns Interaction information
   */
  async interactWithResolver(): Promise<{
    status: string;
    result: Record<string, any>;
  }> {
    this.logger.log("Interacting with Fusion resolver");
    // Implementation would interact with the resolver
    return {
      status: "success",
      result: {
        operation: "example",
        success: true,
      },
    };
  }
}
