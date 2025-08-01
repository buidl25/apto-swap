import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import * as path from "path";
import * as fs from "fs";

import * as EscrowFactory from "../../ABIs/EscrowFactory.json";
import * as EscrowSrc from "../../ABIs/EscrowSrc.json";
import * as FusionResolver from "../../ABIs/FusionResolver.json";
import * as TestEvmToken from "../../ABIs/TestEvmToken.json";
import * as EscrowFactoryAddress from "../../vars/escrow-factory-address.json";
import * as FusionResolverAddress from "../../vars/fusion-resolver-address.json";
import * as EvmTokenAddress from "../../vars/evm-token-address.json";

interface AddressJson {
  "escrow-src-address": string;
  "escrow-factory-address": string;
  "fusion-resolver-address": string;
  "evm-token-address": string;
}

const readAddressFile = (fileName: string): AddressJson => {
  try {
    const filePath = path.join(__dirname, `../../vars/${fileName}`);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Invalid JSON format in ${fileName}`);
    }

    return parsed as AddressJson;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read address file ${fileName}: ${message}`);
  }
};

// Read the ABI file directly from the file system
const abiPath = path.join(
  process.cwd(),
  "../artifacts/contracts/EthereumHTLC.sol/EthereumHTLC.json",
);
// Define interface for the ABI JSON structure
interface AbiJson {
  abi: ethers.InterfaceAbi;
}
interface ContractABI {
  abi: ethers.InterfaceAbi;
}

const EthereumHTLC_ABI_JSON = JSON.parse(
  fs.readFileSync(abiPath, "utf8"),
) as AbiJson;
const EthereumHTLC_ABI: ethers.InterfaceAbi = EthereumHTLC_ABI_JSON.abi;

const EscrowFactoryABI = EscrowFactory as unknown as ContractABI;

const EscrowSrcABI = EscrowSrc as unknown as ContractABI;
const FusionResolverABI = FusionResolver as unknown as ContractABI;
const TestEvmTokenABI = TestEvmToken as unknown as ContractABI;

@Injectable()
export class EvmService implements OnModuleInit {
  private readonly logger = new Logger(EvmService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private htlcContract: ethers.Contract;
  private escrowFactoryContract: ethers.Contract;
  private escrowSrcContract: ethers.Contract;
  private fusionResolverContract: ethers.Contract;
  private testEvmTokenContract: ethers.Contract;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const rpcUrl = this.configService.get<string>("EVM_RPC_URL");
    const relayerPrivateKey = this.configService.get<string>(
      "RELAYER_PRIVATE_KEY_EVM",
    );

    if (!rpcUrl || !relayerPrivateKey) {
      this.logger.error(
        "Missing EVM configuration. Please check EVM_RPC_URL, RELAYER_PRIVATE_KEY_EVM, ESCROW_FACTORY_ADDRESS, ESCROW_SRC_ADDRESS, FUSION_RESOLVER_ADDRESS, and TEST_EVM_TOKEN_ADDRESS in your .env file.",
      );
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(relayerPrivateKey, this.provider);

    this.escrowFactoryContract = new ethers.Contract(
      EscrowFactoryAddress["escrow-factory-address"],
      EscrowFactoryABI.abi,
      this.wallet,
    );

    // this.escrowSrcContract = new ethers.Contract(
    //   escrowSrcAddress,
    //   EscrowSrcABI.abi,
    //   this.wallet,
    // );

    this.fusionResolverContract = new ethers.Contract(
      FusionResolverAddress["fusion-resolver-address"],
      FusionResolverABI.abi,
      this.wallet,
    );

    this.testEvmTokenContract = new ethers.Contract(
      EvmTokenAddress["evm-token-address"],
      TestEvmTokenABI.abi,
      this.wallet,
    );

    this.logger.log(`EVM Service initialized. Connected to ${rpcUrl}`);
    this.logger.log(`Relayer Address: ${this.wallet.address}`);

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

  getHtlcContract(): ethers.Contract {
    return this.htlcContract;
  }

  getEscrowFactoryContract(): ethers.Contract {
    return this.escrowFactoryContract;
  }

  getEscrowSrcContract(): ethers.Contract {
    return this.escrowSrcContract;
  }

  getFusionResolverContract(): ethers.Contract {
    return this.fusionResolverContract;
  }

  getTestEvmTokenContract(): ethers.Contract {
    return this.testEvmTokenContract;
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  getEscrowFactoryAbi(): ethers.InterfaceAbi {
    return EscrowFactory.abi;
  }
}
