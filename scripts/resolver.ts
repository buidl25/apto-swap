import { CrossChainRelayer, SwapOrder } from "./relayer";

class SwapResolver {
  private relayer: CrossChainRelayer;
  private liquidity: Map<string, bigint> = new Map();

  constructor(relayer: CrossChainRelayer) {
    this.relayer = relayer; 
    this.liquidity.set("0xYourTestEvmTokenAddress", BigInt(1000000 * 10**18));
    this.liquidity.set("0xYourAptosAccountAddress::test_aptos_token::TestAptosToken", BigInt(1000000 * 10**9));
  }

  async processSwapRequest(order: SwapOrder): Promise<boolean> {
    const hasLiquidity = await this.checkLiquidity(order);
    if (!hasLiquidity) return false;

    await this.reserveLiquidity(order);
    await this.createCounterHTLC(order);
    return true;
  }

  private async checkLiquidity(order: SwapOrder): Promise<boolean> {
    const available = this.liquidity.get(order.targetToken) || 0n;
    return available >= BigInt(order.targetAmount);
  }

  private async reserveLiquidity(order: SwapOrder): Promise<void> {
    const current = this.liquidity.get(order.targetToken) || 0n;
    this.liquidity.set(order.targetToken, current - BigInt(order.targetAmount));
  }

  private async createCounterHTLC(order: SwapOrder): Promise<void> {
    if (order.targetChain === "aptos") {
      await this.relayer.createAptosHTLC(order);
    } else {
      await this.relayer.createEthereumHTLC(order);
    }
  }
}

const resolver = new SwapResolver(require("./relayer").default);
export default resolver;