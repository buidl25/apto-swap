module test_aptos_token::atomic_swap {
    use std::signer;
    use std::vector;
    use std::hash;
    use std::bcs;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::account;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};

    struct HTLCData has store {
        sender: address,
        recipient: address,
        amount: u64,
        hashlock: vector<u8>,
        timelock: u64,
        withdrawn: bool,
        refunded: bool,
    }

    struct HTLCStore has key {
        contracts: Table<vector<u8>, HTLCData>,
        created_events: event::EventHandle<HTLCCreatedEvent>,
        withdrawn_events: event::EventHandle<HTLCWithdrawnEvent>,
        refunded_events: event::EventHandle<HTLCRefundedEvent>,
    }

    struct HTLCCreatedEvent has drop, store {
        contract_id: vector<u8>,
        sender: address,
        recipient: address,
        amount: u64,
        hashlock: vector<u8>,
        timelock: u64,
    }

    struct HTLCWithdrawnEvent has drop, store {
        contract_id: vector<u8>,
        preimage: vector<u8>,
    }

    struct HTLCRefundedEvent has drop, store {
        contract_id: vector<u8>,
    }

    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_CONTRACT_EXISTS: u64 = 3;
    const E_CONTRACT_NOT_EXISTS: u64 = 4;
    const E_TIMELOCK_EXPIRED: u64 = 5;
    const E_TIMELOCK_NOT_EXPIRED: u64 = 6;
    const E_INVALID_PREIMAGE: u64 = 7;
    const E_ALREADY_WITHDRAWN: u64 = 8;
    const E_ALREADY_REFUNDED: u64 = 9;
    const E_UNAUTHORIZED: u64 = 10;

    public entry fun initialize(account: &signer) {
        let sender = signer::address_of(account);
        assert!(!exists<HTLCStore>(sender), E_ALREADY_INITIALIZED);

        move_to(account, HTLCStore {
            contracts: table::new(),
            created_events: account::new_event_handle<HTLCCreatedEvent>(account),
            withdrawn_events: account::new_event_handle<HTLCWithdrawnEvent>(account),
            refunded_events: account::new_event_handle<HTLCRefundedEvent>(account),
        });
    }

    public entry fun create_htlc<CoinType>(
        sender: &signer,
        recipient: address,
        amount: u64,
        hashlock: vector<u8>,
        timelock: u64
    ) acquires HTLCStore {
        let sender_addr = signer::address_of(sender);
        // Use module owner's address instead of sender's address
        let module_addr = @test_aptos_token;
        assert!(exists<HTLCStore>(module_addr), E_NOT_INITIALIZED);

        let current_time = timestamp::now_seconds();
        assert!(timelock > current_time, E_TIMELOCK_EXPIRED);

        let contract_id = generate_contract_id(sender_addr, recipient, amount, hashlock, timelock);

        let htlc_store = borrow_global_mut<HTLCStore>(module_addr);
        assert!(!table::contains(&htlc_store.contracts, contract_id), E_CONTRACT_EXISTS);

        let coins = coin::withdraw<CoinType>(sender, amount);
        coin::deposit(sender_addr, coins);

        let htlc_data = HTLCData {
            sender: sender_addr,
            recipient,
            amount,
            hashlock,
            timelock,
            withdrawn: false,
            refunded: false,
        };

        table::add(&mut htlc_store.contracts, contract_id, htlc_data);

        event::emit_event(&mut htlc_store.created_events, HTLCCreatedEvent {
            contract_id,
            sender: sender_addr,
            recipient,
            amount,
            hashlock,
            timelock,
        });
    }

    public entry fun withdraw<CoinType>(
        recipient: &signer,
        contract_id: vector<u8>,
        preimage: vector<u8>
    ) acquires HTLCStore {
        // Use module owner's address instead of @0x1
        let module_addr = @test_aptos_token;
        let htlc_store = borrow_global_mut<HTLCStore>(module_addr);
        assert!(table::contains(&htlc_store.contracts, contract_id), E_CONTRACT_NOT_EXISTS);

        let htlc_data = table::borrow_mut(&mut htlc_store.contracts, contract_id);
        assert!(!htlc_data.withdrawn, E_ALREADY_WITHDRAWN);
        assert!(!htlc_data.refunded, E_ALREADY_REFUNDED);
        assert!(timestamp::now_seconds() <= htlc_data.timelock, E_TIMELOCK_EXPIRED);
        assert!(hash::sha3_256(preimage) == htlc_data.hashlock, E_INVALID_PREIMAGE);
        assert!(signer::address_of(recipient) == htlc_data.recipient, E_UNAUTHORIZED);

        htlc_data.withdrawn = true;
        let coins = coin::withdraw<CoinType>(recipient, htlc_data.amount);
        coin::deposit(htlc_data.recipient, coins);

        event::emit_event(&mut htlc_store.withdrawn_events, HTLCWithdrawnEvent {
            contract_id,
            preimage,
        });
    }

    public entry fun refund<CoinType>(
        sender: &signer,
        contract_id: vector<u8>
    ) acquires HTLCStore {
        let sender_addr = signer::address_of(sender);
        // Use module owner's address instead of sender's address
        let module_addr = @test_aptos_token;
        let htlc_store = borrow_global_mut<HTLCStore>(module_addr);
        assert!(table::contains(&htlc_store.contracts, contract_id), E_CONTRACT_NOT_EXISTS);

        let htlc_data = table::borrow_mut(&mut htlc_store.contracts, contract_id);
        assert!(!htlc_data.withdrawn, E_ALREADY_WITHDRAWN);
        assert!(!htlc_data.refunded, E_ALREADY_REFUNDED);
        assert!(htlc_data.sender == sender_addr, E_UNAUTHORIZED);
        assert!(timestamp::now_seconds() > htlc_data.timelock, E_TIMELOCK_NOT_EXPIRED);

        htlc_data.refunded = true;
        let coins = coin::withdraw<CoinType>(sender, htlc_data.amount);
        coin::deposit(sender_addr, coins);

        event::emit_event(&mut htlc_store.refunded_events, HTLCRefundedEvent {
            contract_id,
        });
    }

    fun generate_contract_id(
        sender: address,
        recipient: address,
        amount: u64,
        hashlock: vector<u8>,
        timelock: u64
    ): vector<u8> {
        let data = vector::empty<u8>();
        vector::append(&mut data, bcs::to_bytes(&sender));
        vector::append(&mut data, bcs::to_bytes(&recipient));
        vector::append(&mut data, bcs::to_bytes(&amount));
        vector::append(&mut data, hashlock);
        vector::append(&mut data, bcs::to_bytes(&timelock));
        hash::sha3_256(data)
    }
}