#[test_only]
module cross_chain_swap::dex_interface_tests {
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::account;
    use aptos_framework::coin::{Self, FakeMoney, FakeMoney2};
    use cross_chain_swap::dex_interface;

    // Test account addresses
    const USER_ADDRESS: address = @0x123;

    // Test constants
    const AMOUNT_IN: u64 = 1000;
    const MIN_AMOUNT_OUT: u64 = 900;

    // Setup function to initialize test environment
    fun setup(): signer {
        // Create test account
        let user = account::create_account_for_test(USER_ADDRESS);

        // Register and mint FakeMoney for testing
        let coin_admin = account::create_account_for_test(@0x1);
        coin::register<FakeMoney>(&user);
        coin::register<FakeMoney2>(&user);

        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<FakeMoney>(
            &coin_admin,
            string::utf8(b"Fake Money"),
            string::utf8(b"FM"),
            8,
            false
        );

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_freeze_cap(freeze_cap);

        // Mint coins to user for testing
        let coins = coin::mint<FakeMoney>(AMOUNT_IN * 10, &mint_cap);
        coin::deposit(signer::address_of(&user), coins);

        coin::destroy_mint_cap(mint_cap);

        // Initialize FakeMoney2 for swap testing
        let (burn_cap2, freeze_cap2, mint_cap2) = coin::initialize<FakeMoney2>(
            &coin_admin,
            string::utf8(b"Fake Money 2"),
            string::utf8(b"FM2"),
            8,
            false
        );

        coin::destroy_burn_cap(burn_cap2);
        coin::destroy_freeze_cap(freeze_cap2);
        
        // Mint some FakeMoney2 to user to simulate swap
        let coins2 = coin::mint<FakeMoney2>(AMOUNT_IN * 10, &mint_cap2);
        coin::deposit(signer::address_of(&user), coins2);
        
        coin::destroy_mint_cap(mint_cap2);

        user
    }

    #[test]
    fun test_swap() {
        let user = setup();

        // Check initial balances
        assert!(coin::balance<FakeMoney>(signer::address_of(&user)) == AMOUNT_IN * 10, 0);
        assert!(coin::balance<FakeMoney2>(signer::address_of(&user)) == AMOUNT_IN * 10, 0);

        // Perform swap
        // Note: In the real implementation, this would call a DEX
        // For testing, we're just simulating the swap with our mock implementation
        let coins_out = dex_interface::swap<FakeMoney, FakeMoney2>(
            &user,
            AMOUNT_IN,
            MIN_AMOUNT_OUT
        );

        // Deposit output coins to user
        coin::deposit(signer::address_of(&user), coins_out);

        // Check final balances
        // FakeMoney should decrease by AMOUNT_IN
        assert!(coin::balance<FakeMoney>(signer::address_of(&user)) == AMOUNT_IN * 10 - AMOUNT_IN, 0);
        
        // FakeMoney2 should increase by AMOUNT_IN (1:1 exchange rate in mock)
        assert!(coin::balance<FakeMoney2>(signer::address_of(&user)) == AMOUNT_IN * 10 + AMOUNT_IN, 0);
    }

    #[test]
    fun test_get_exchange_rate() {
        // Get exchange rate
        let rate = dex_interface::get_exchange_rate<FakeMoney, FakeMoney2>();
        
        // Check that rate is 1 (mock implementation)
        assert!(rate == 1, 0);
    }

    #[test]
    fun test_create_swap_data() {
        // Create swap data
        let dex_name = string::utf8(b"MockDEX");
        let swap_data = dex_interface::create_swap_data<FakeMoney, FakeMoney2>(
            AMOUNT_IN,
            MIN_AMOUNT_OUT,
            dex_name
        );
        
        // No direct way to verify the swap data in tests without exposing internal state
        // If no assertion fails, the test passes
    }

    #[test_only]
    // Define FakeMoney2 for testing different token types
    struct FakeMoney2 {}
}
