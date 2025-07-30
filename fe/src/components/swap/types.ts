/**
 * Token information
 */
export interface Token {
  /**
   * Token symbol (e.g. ETH, USDC)
   */
  readonly symbol: string;
  
  /**
   * Token name (e.g. Ethereum, USD Coin)
   */
  readonly name: string;
  
  /**
   * Token logo URL
   */
  readonly logo?: string;
  
  /**
   * Token contract address
   */
  readonly address: string;
  
  /**
   * Token decimals
   */
  readonly decimals: number;
  
  /**
   * Token chain ID (for EVM tokens)
   */
  readonly chainId?: number;
}

/**
 * Swap direction
 */
export enum SwapDirection {
  /**
   * Swap from EVM to Aptos
   */
  EvmToAptos = 'EVM_TO_APTOS',
  
  /**
   * Swap from Aptos to EVM
   */
  AptosToEvm = 'APTOS_TO_EVM'
}

/**
 * Swap form props
 */
export interface SwapFormProps {
  /**
   * Available tokens for swap
   */
  readonly tokens: Token[];
  
  /**
   * Direction of swap
   */
  readonly direction: SwapDirection;
  
  /**
   * Function called when tokens are selected
   * @param fromToken - Selected from token
   * @param toToken - Selected to token
   */
  readonly onTokensSelected?: (fromToken: Token, toToken: Token) => void;
  
  /**
   * Function called when swap amount is entered
   * @param amount - Swap amount
   */
  readonly onAmountChanged?: (amount: string) => void;
  
  /**
   * Function called when swap is initiated
   */
  readonly onSwap?: () => void;
  
  /**
   * Current from token
   */
  readonly fromToken?: Token;
  
  /**
   * Current to token
   */
  readonly toToken?: Token;
  
  /**
   * Current swap amount
   */
  readonly amount?: string;
  
  /**
   * Current exchange rate
   */
  readonly exchangeRate?: string;
  
  /**
   * Swap fee
   */
  readonly fee?: string;
  
  /**
   * Minimum received amount
   */
  readonly minimumReceived?: string;
  
  /**
   * Is swap loading
   */
  readonly isLoading?: boolean;
}
