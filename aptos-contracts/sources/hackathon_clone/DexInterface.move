module cross_chain_swap::dex_interface {
    use std::signer;
    use std::string::String;
    use std::error;
    use aptos_framework::coin::{Self, Coin};
    use aptos_std::type_info;

    /// Error codes
    const E_INSUFFICIENT_AMOUNT: u64 = 1;
    const E_SLIPPAGE_TOO_HIGH: u64 = 2;
    const E_DEX_CALL_FAILED: u64 = 3;

    /// Structure for storing swap data
    struct SwapData has copy, drop, store {
        token_in_type: String,
        token_out_type: String,
        amount_in: u64,
        min_amount_out: u64,
        dex_name: String,
    }

    /// Execute swap through DEX
    /// In a real implementation, this would call functions of a specific DEX on Aptos
    /// For example, PancakeSwap, Thala, or Liquidswap
    public fun swap<TokenIn, TokenOut>(
        account: &signer,
        amount_in: u64,
        min_amount_out: u64
    ): Coin<TokenOut> {
        let sender = signer::address_of(account);
        
        // Check that user has enough tokens
        assert!(coin::balance<TokenIn>(sender) >= amount_in, error::invalid_argument(E_INSUFFICIENT_AMOUNT));
        
        // Here would be a call to DEX functions
        // For example, we just convert tokens at a fixed 1:1 rate
        // In a real implementation, this would call functions of a specific DEX
        
        let coins_in = coin::withdraw<TokenIn>(account, amount_in);
        
        // Assume we get the same amount of output tokens (1:1 rate)
        let amount_out = amount_in;
        
        // Check that the received amount is not less than the minimum
        assert!(amount_out >= min_amount_out, error::invalid_state(E_SLIPPAGE_TOO_HIGH));
        
        // In a real implementation, this would convert coins_in to coins_out through DEX
        // For now, we'll destroy the input coins and create new output tokens
        coin::destroy_zero(coins_in);
        
        // Create output tokens
        let coins_out = coin::withdraw<TokenOut>(account, amount_out);
        
        coins_out
    }

    /// Get exchange rate between tokens
    public fun get_exchange_rate<TokenIn, TokenOut>(): u64 {
        // In a real implementation, this would query the DEX for the current rate
        // For example, we return a fixed 1:1 rate
        1
    }

    /// Create swap data
    public fun create_swap_data<TokenIn, TokenOut>(
        amount_in: u64,
        min_amount_out: u64,
        dex_name: String
    ): SwapData {
        SwapData {
            token_in_type: type_info::type_name<TokenIn>(),
            token_out_type: type_info::type_name<TokenOut>(),
            amount_in,
            min_amount_out,
            dex_name,
        }
    }
}
