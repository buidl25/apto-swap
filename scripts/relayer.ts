import { ethers } from "ethers";
import { AptosClient, AptosAccount, HexString } from "aptos";
import crypto from "crypto";
require("dotenv").config();

interface SwapOrder {
  id: string;
  sender: string;
  recipient: string;
  sourceChain: "ethereum" | "aptos";
  targetChain: "ethereum" | "aptos";
  sourceToken: string;
  targetToken: string;
  amount: string;
  targetAmount: string;
  timelock: number;
  hashlock: string;
  secret?: string;
  status: "pending" | "locked" | "completed" | "refunded";
}

class CrossChainRelayer {
  private ethProvider: ethers.JsonRpcProvider;
  private aptosClient: AptosClient;
  private orders: Map<string, SwapOrder> = new Map();
  private ethContract: ethers.Contract;
  private ethSigner: ethers.Wallet;

  constructor() {
    this.ethProvider = new ethers.JsonRpcProvider(process.env.EVM_RPC_URL);
    this.ethSigner = new ethers.Wallet(process.env.EVM_PRIVATE_KEY!, this.ethProvider);
    this.aptosClient = new AptosClient(process.env.APTOS_RPC_URL!);
    this.ethContract = new ethers.Contract(
      "0xYourEthereumHTLCAddress",
      [
        "function createHTLC(address recipient, address token, uint256 amount, bytes32 hashlock, uint256 timelock) external returns (bytes32)",
        "function withdraw(bytes32 contractId, bytes32 preimage) external",
        "function refund(bytes32 contractId) external",
      ],
      this.ethSigner
    );
  }

  async createSwapOrder(
    sender: string,
    recipient: string,
    sourceChain: "ethereum" | "aptos",
    targetChain: "ethereum" | "aptos",
    sourceToken: string,
    targetToken: string,
    amount: string,
    targetAmount: string
  ): Promise<string> {
    const secret = crypto.randomBytes(32);
    const hashlock = ethers.keccak256(secret);
    const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 час

    const order: SwapOrder = {
      id: crypto.randomUUID(),
      sender,
      recipient,
      sourceChain,
      targetChain,
      sourceToken,
      targetToken,
      amount,
      targetAmount,
      timelock,
      hashlock,
      secret: secret.toString("hex"),
      status: "pending",
    };

    this.orders.set(order.id, order);
    return order.id;
  }

  async processSwapOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");

    if (order.sourceChain === "ethereum" && order.targetChain === "aptos") {
      await this.processEthereumToAptos(order);
    } else if (order.sourceChain === "aptos" && order.targetChain === "ethereum") {
      await this.processAptosToEthereum(order);
    }
  }

  private async processEthereumToAptos(order: SwapOrder): Promise<void> {
    try {
      await this.createEthereumHTLC(order);
      await this.createAptosHTLC(order);
      await this.revealSecret(order);
      order.status = "completed";
    } catch (error) {
      console.error("Swap failed:", error);
      order.status = "refunded";
      await this.refundOrder(order);
    }
  }

  private async processAptosToEthereum(order: SwapOrder): Promise<void> {
    try {
      await this.createAptosHTLC(order);
      await this.createEthereumHTLC(order);
      await this.revealSecret(order);
      order.status = "completed";
    } catch (error) {
      console.error("Swap failed:", error);
      order.status = "refunded";
      await this.refundOrder(order);
    }
  }

  private async createEthereumHTLC(order: SwapOrder): Promise<void> {
    const tx = await this.ethContract.createHTLC(
      order.recipient,
      order.sourceToken,
      order.amount,
      order.hashlock,
      order.timelock
    );
    await tx.wait();
    console.log("Ethereum HTLC created for order:", order.id);
  }

  private async createAptosHTLC(order: SwapOrder): Promise<void> {
    const account = new AptosAccount(HexString.ensure(process.env.APTOS_PRIVATE_KEY!));
    const payload = {
      type: "entry_function_payload",
      function: `0xYourAptosAccountAddress::atomic_swap::create_htlc`,
      type_arguments: [order.sourceToken],
      arguments: [order.recipient, order.amount, HexString.ensure(order.hashlock).toUint8Array(), order.timelock],
    };
    const txnRequest = await this.aptosClient.generateTransaction(account.address(), payload);
    const signedTxn = await this.aptosClient.signTransaction(account, txnRequest);
    await this.aptosClient.submitTransaction(signedTxn);
    console.log("Aptos HTLC created for order:", order.id);
  }

  private async revealSecret(order: SwapOrder): Promise<void> {
    if (order.sourceChain === "ethereum") {
      const account = new AptosAccount(HexString.ensure(process.env.APTOS_PRIVATE_KEY!));
      const payload = {
        type: "entry_function_payload",
        function: `0xYourAptosAccountAddress::atomic_swap::withdraw`,
        type_arguments: [order.targetToken],
        arguments: [order.id, HexString.ensure(order.secret!).toUint8Array()],
      };
      const txnRequest = await this.aptosClient.generateTransaction(account.address(), payload);
      const signedTxn = await this.aptosClient.signTransaction(account, txnRequest);
      await this.aptosClient.submitTransaction(signedTxn);
    } else {
      const tx = await this.ethContract.withdraw(order.id, "0x" + order.secret);
      await tx.wait();
    }
    console.log("Secret revealed for order:", order.id);
  }

  private async refundOrder(order: SwapOrder): Promise<void> {
    if (order.sourceChain === "ethereum") {
      const tx = await this.ethContract.refund(order.id);
      await tx.wait();
    } else {
      const account = new AptosAccount(HexString.ensure(process.env.APTOS_PRIVATE_KEY!));
      const payload = {
        type: "entry_function_payload",
        function: `0xYourAptosAccountAddress::atomic_swap::refund`,
        type_arguments: [order.sourceToken],
        arguments: [order.id],
      };
      const txnRequest = await this.aptosClient.generateTransaction(account.address(), payload);
      const signedTxn = await this.aptosClient.signTransaction(account, txnRequest);
      await this.aptosClient.submitTransaction(signedTxn);
    }
    console.log("Refunded order:", order.id);
  }
}

const relayer = new CrossChainRelayer();
export default relayer;