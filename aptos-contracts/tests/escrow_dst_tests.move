#[test_only]
module cross_chain_swap::escrow_dst_tests {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use std::hash;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, FakeMoney};
    use aptos_framework::timestamp;
    use cross_chain_swap::escrow_dst;

    // Test account addresses
    const ADMIN_ADDRESS: address = @0x123;
    const MAKER_ADDRESS: address = @0x456;
    const TAKER_ADDRESS: address = @0x789;

    // Test constants
    const AMOUNT: u64 = 1000;
    const SAFETY_DEPOSIT: u64 = 100;
    const RESCUE_DELAY: u64 = 3600; // 1 hour
    const WITHDRAWAL_DELAY: u64 = 600; // 10 minutes
    const PUBLIC_WITHDRAWAL_DELAY: u64 = 1200; // 20 minutes
    const CANCELLATION_DELAY: u64 = 3600; // 1 hour

    // Test data
    const ORDER_HASH: vector<u8> = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const SECRET: vector<u8> = x"deadbeef";

    // Setup function to initialize test environment
    fun setup(): (signer, signer, signer) {
        // Create test accounts
        let admin = account::create_account_for_test(ADMIN_ADDRESS);
        let maker = account::create_account_for_test(MAKER_ADDRESS);
        let taker = account::create_account_for_test(TAKER_ADDRESS);

        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(&admin);
        timestamp::update_global_time_for_test(1000000);

        // Initialize escrow module
        escrow_dst::initialize(&admin, RESCUE_DELAY);

        // Register and mint FakeMoney for testing
        let coin_admin = account::create_account_for_test(@0x1);
        coin::register<FakeMoney>(&maker);
        coin::register<FakeMoney>(&taker);
        coin::register<FakeMoney>(&admin);

        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<FakeMoney>(
            &coin_admin,
            string::utf8(b"Fake Money"),
            string::utf8(b"FM"),
            8,
            false
        );

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_freeze_cap(freeze_cap);

        // Mint coins to taker for testing
        let coins = coin::mint<FakeMoney>(AMOUNT * 10, &mint_cap);
        coin::deposit(signer::address_of(&taker), coins);

        coin::destroy_mint_cap(mint_cap);

        (admin, maker, taker)
    }

    // Helper function to compute hashlock from secret
    fun compute_hashlock(secret: vector<u8>): vector<u8> {
        hash::sha3_256(secret)
    }

    #[test]
    fun test_initialize() {
        let admin = account::create_account_for_test(ADMIN_ADDRESS);
        timestamp::set_time_has_started_for_testing(&admin);
        
        escrow_dst::initialize(&admin, RESCUE_DELAY);
        // If no assertion fails, the test passes
    }

    #[test]
    fun test_create_escrow() {
        let (admin, maker, taker) = setup();
        let hashlock = compute_hashlock(SECRET);

        // Create escrow
        escrow_dst::create_escrow_dst<FakeMoney>(
            &taker,
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            AMOUNT,
            SAFETY_DEPOSIT,
            WITHDRAWAL_DELAY,
            PUBLIC_WITHDRAWAL_DELAY,
            CANCELLATION_DELAY
        );

        // Check taker's balance decreased
        assert!(coin::balance<FakeMoney>(signer::address_of(&taker)) == AMOUNT * 10 - AMOUNT, 0);
    }

    #[test]
    fun test_withdraw() {
        let (admin, maker, taker) = setup();
        let hashlock = compute_hashlock(SECRET);

        // Create escrow
        escrow_dst::create_escrow_dst<FakeMoney>(
            &taker,
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            AMOUNT,
            SAFETY_DEPOSIT,
            WITHDRAWAL_DELAY,
            PUBLIC_WITHDRAWAL_DELAY,
            CANCELLATION_DELAY
        );

        // Advance time past withdrawal delay
        timestamp::update_global_time_for_test(1000000 + WITHDRAWAL_DELAY + 1);

        // Get contract ID (simplified for testing)
        let current_time = timestamp::now_seconds();
        let timelocks = escrow_dst::create_timelocks(
            current_time - WITHDRAWAL_DELAY - 1,
            current_time,
            current_time + PUBLIC_WITHDRAWAL_DELAY - WITHDRAWAL_DELAY - 1,
            current_time + CANCELLATION_DELAY - WITHDRAWAL_DELAY - 1
        );
        
        let token_type = string::utf8(b"0x1::coin::FakeMoney");
        
        let immutables = escrow_dst::create_immutables(
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            token_type,
            AMOUNT,
            SAFETY_DEPOSIT,
            timelocks
        );
        
        let contract_id = escrow_dst::compute_contract_id(&immutables);

        // Withdraw funds
        escrow_dst::withdraw<FakeMoney>(
            &taker,
            contract_id,
            SECRET
        );

        // Check maker's balance increased
        assert!(coin::balance<FakeMoney>(signer::address_of(&maker)) == AMOUNT, 0);
    }

    #[test]
    fun test_public_withdraw() {
        let (admin, maker, taker) = setup();
        let hashlock = compute_hashlock(SECRET);

        // Create escrow
        escrow_dst::create_escrow_dst<FakeMoney>(
            &taker,
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            AMOUNT,
            SAFETY_DEPOSIT,
            WITHDRAWAL_DELAY,
            PUBLIC_WITHDRAWAL_DELAY,
            CANCELLATION_DELAY
        );

        // Advance time past public withdrawal delay
        timestamp::update_global_time_for_test(1000000 + PUBLIC_WITHDRAWAL_DELAY + 1);

        // Get contract ID (simplified for testing)
        let current_time = timestamp::now_seconds();
        let timelocks = escrow_dst::create_timelocks(
            current_time - PUBLIC_WITHDRAWAL_DELAY - 1,
            current_time - PUBLIC_WITHDRAWAL_DELAY + WITHDRAWAL_DELAY,
            current_time,
            current_time + CANCELLATION_DELAY - PUBLIC_WITHDRAWAL_DELAY - 1
        );
        
        let token_type = string::utf8(b"0x1::coin::FakeMoney");
        
        let immutables = escrow_dst::create_immutables(
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            token_type,
            AMOUNT,
            SAFETY_DEPOSIT,
            timelocks
        );
        
        let contract_id = escrow_dst::compute_contract_id(&immutables);

        // Create a third party account
        let third_party = account::create_account_for_test(@0x999);
        coin::register<FakeMoney>(&third_party);

        // Public withdraw by third party
        escrow_dst::public_withdraw<FakeMoney>(
            &third_party,
            contract_id,
            SECRET
        );

        // Check maker's balance increased
        assert!(coin::balance<FakeMoney>(signer::address_of(&maker)) == AMOUNT, 0);
    }

    #[test]
    fun test_cancel() {
        let (admin, maker, taker) = setup();
        let hashlock = compute_hashlock(SECRET);

        // Create escrow
        escrow_dst::create_escrow_dst<FakeMoney>(
            &taker,
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            AMOUNT,
            SAFETY_DEPOSIT,
            WITHDRAWAL_DELAY,
            PUBLIC_WITHDRAWAL_DELAY,
            CANCELLATION_DELAY
        );

        // Advance time past cancellation delay
        timestamp::update_global_time_for_test(1000000 + CANCELLATION_DELAY + 1);

        // Get contract ID (simplified for testing)
        let current_time = timestamp::now_seconds();
        let timelocks = escrow_dst::create_timelocks(
            current_time - CANCELLATION_DELAY - 1,
            current_time - CANCELLATION_DELAY + WITHDRAWAL_DELAY,
            current_time - CANCELLATION_DELAY + PUBLIC_WITHDRAWAL_DELAY,
            current_time
        );
        
        let token_type = string::utf8(b"0x1::coin::FakeMoney");
        
        let immutables = escrow_dst::create_immutables(
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            token_type,
            AMOUNT,
            SAFETY_DEPOSIT,
            timelocks
        );
        
        let contract_id = escrow_dst::compute_contract_id(&immutables);

        // Cancel escrow
        escrow_dst::cancel<FakeMoney>(
            &taker,
            contract_id
        );

        // Check taker's balance restored
        assert!(coin::balance<FakeMoney>(signer::address_of(&taker)) == AMOUNT * 10, 0);
    }

    #[test]
    fun test_rescue_funds() {
        let (admin, maker, taker) = setup();
        let hashlock = compute_hashlock(SECRET);

        // Create escrow
        escrow_dst::create_escrow_dst<FakeMoney>(
            &taker,
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            AMOUNT,
            SAFETY_DEPOSIT,
            WITHDRAWAL_DELAY,
            PUBLIC_WITHDRAWAL_DELAY,
            CANCELLATION_DELAY
        );

        // Advance time past rescue delay
        timestamp::update_global_time_for_test(1000000 + RESCUE_DELAY + 1);

        // Get contract ID (simplified for testing)
        let current_time = timestamp::now_seconds();
        let timelocks = escrow_dst::create_timelocks(
            current_time - RESCUE_DELAY - 1,
            current_time - RESCUE_DELAY + WITHDRAWAL_DELAY,
            current_time - RESCUE_DELAY + PUBLIC_WITHDRAWAL_DELAY,
            current_time - RESCUE_DELAY + CANCELLATION_DELAY
        );
        
        let token_type = string::utf8(b"0x1::coin::FakeMoney");
        
        let immutables = escrow_dst::create_immutables(
            ORDER_HASH,
            hashlock,
            signer::address_of(&maker),
            signer::address_of(&taker),
            token_type,
            AMOUNT,
            SAFETY_DEPOSIT,
            timelocks
        );
        
        let contract_id = escrow_dst::compute_contract_id(&immutables);

        // Rescue funds
        escrow_dst::rescue_funds<FakeMoney>(
            &taker,
            contract_id,
            AMOUNT
        );

        // Check taker's balance restored
        assert!(coin::balance<FakeMoney>(signer::address_of(&taker)) == AMOUNT * 10, 0);
    }
}
