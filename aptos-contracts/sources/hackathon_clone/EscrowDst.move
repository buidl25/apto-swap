module cross_chain_swap::escrow_dst {
    use std::signer;
    use std::vector;
    use std::hash;
    use std::bcs;
    use std::string::String;
    use std::error;
    use aptos_framework::timestamp;
    use aptos_framework::coin::Self;
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_std::table::{Self, Table};
    use aptos_std::type_info;

    /// Structure for storing time locks
    struct Timelocks has copy, drop, store {
        deployed_at: u64,
        dst_withdrawal: u64,
        dst_public_withdrawal: u64,
        dst_cancellation: u64,
    }

    /// Structure with immutable swap parameters
    struct Immutables has copy, drop, store {
        order_hash: vector<u8>,
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        token_type: String,
        amount: u64,
        safety_deposit: u64,
        timelocks: Timelocks,
    }

    /// Structure for storing escrow data
    struct EscrowData has store {
        immutables: Immutables,
        withdrawn: bool,
        cancelled: bool,
    }

    /// Storage for escrow contracts
    struct EscrowStore has key {
        contracts: Table<vector<u8>, EscrowData>,
        factory: address,
        rescue_delay: u64,
        created_events: EventHandle<EscrowCreatedEvent>,
        withdrawn_events: EventHandle<WithdrawalEvent>,
        cancelled_events: EventHandle<EscrowCancelledEvent>,
        rescued_events: EventHandle<FundsRescuedEvent>,
    }

    /// Escrow creation event
    struct EscrowCreatedEvent has drop, store {
        contract_id: vector<u8>,
        maker: address,
        taker: address,
        token_type: String,
        amount: u64,
        hashlock: vector<u8>,
        timelocks: Timelocks,
    }

    /// Withdrawal event
    struct WithdrawalEvent has drop, store {
        contract_id: vector<u8>,
        secret: vector<u8>,
    }

    /// Escrow cancellation event
    struct EscrowCancelledEvent has drop, store {
        contract_id: vector<u8>,
    }

    /// Funds rescue event
    struct FundsRescuedEvent has drop, store {
        contract_id: vector<u8>,
        token_type: String,
        amount: u64,
    }

    // Error codes
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_CONTRACT_EXISTS: u64 = 3;
    const E_CONTRACT_NOT_EXISTS: u64 = 4;
    const E_TIMELOCK_EXPIRED: u64 = 5;
    const E_TIMELOCK_NOT_EXPIRED: u64 = 6;
    const E_INVALID_SECRET: u64 = 7;
    const E_ALREADY_WITHDRAWN: u64 = 8;
    const E_ALREADY_CANCELLED: u64 = 9;
    const E_UNAUTHORIZED: u64 = 10;
    const E_INVALID_IMMUTABLES: u64 = 11;
    const E_INVALID_TIME: u64 = 12;

    /// Module initialization
    public entry fun initialize(
        account: &signer,
        rescue_delay: u64
    ) {
        let sender = signer::address_of(account);
        assert!(!exists<EscrowStore>(sender), error::already_exists(E_ALREADY_INITIALIZED));

        move_to(account, EscrowStore {
            contracts: table::new(),
            factory: sender,
            rescue_delay,
            created_events: account::new_event_handle<EscrowCreatedEvent>(account),
            withdrawn_events: account::new_event_handle<WithdrawalEvent>(account),
            cancelled_events: account::new_event_handle<EscrowCancelledEvent>(account),
            rescued_events: account::new_event_handle<FundsRescuedEvent>(account),
        });
    }

    /// Create escrow on destination chain
    public entry fun create_escrow_dst<CoinType>(
        account: &signer,
        order_hash: vector<u8>,
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        amount: u64,
        safety_deposit: u64,
        dst_withdrawal_delay: u64,
        dst_public_withdrawal_delay: u64,
        dst_cancellation_delay: u64
    ) acquires EscrowStore {
        let _sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        assert!(exists<EscrowStore>(module_addr), error::not_found(E_NOT_INITIALIZED));
        
        let current_time = timestamp::now_seconds();
        
        // Create Timelocks structure
        let timelocks = Timelocks {
            deployed_at: current_time,
            dst_withdrawal: current_time + dst_withdrawal_delay,
            dst_public_withdrawal: current_time + dst_public_withdrawal_delay,
            dst_cancellation: current_time + dst_cancellation_delay,
        };
        
        // Get token type name
        let token_type = type_info::type_name<CoinType>();
        
        // Create Immutables structure
        let immutables = Immutables {
            order_hash,
            hashlock,
            maker,
            taker,
            token_type,
            amount,
            safety_deposit,
            timelocks,
        };
        
        // Calculate contract ID
        let contract_id = compute_contract_id(&immutables);
        
        let escrow_store = borrow_global_mut<EscrowStore>(module_addr);
        assert!(!table::contains(&escrow_store.contracts, contract_id), error::already_exists(E_CONTRACT_EXISTS));
        
        // Transfer tokens from caller to escrow
        let coins = coin::withdraw<CoinType>(account, amount);
        coin::deposit(module_addr, coins);
        
        // Create escrow data
        let escrow_data = EscrowData {
            immutables,
            withdrawn: false,
            cancelled: false,
        };
        
        // Add escrow to table
        table::add(&mut escrow_store.contracts, contract_id, escrow_data);
        
        // Emit escrow creation event
        event::emit_event(&mut escrow_store.created_events, EscrowCreatedEvent {
            contract_id,
            maker,
            taker,
            token_type,
            amount,
            hashlock,
            timelocks,
        });
    }

    /// Withdraw funds with secret verification (taker only)
    public entry fun withdraw<CoinType>(
        account: &signer,
        contract_id: vector<u8>,
        secret: vector<u8>
    ) acquires EscrowStore {
        let sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        let escrow_store = borrow_global_mut<EscrowStore>(module_addr);
        assert!(table::contains(&escrow_store.contracts, contract_id), error::not_found(E_CONTRACT_NOT_EXISTS));
        
        let escrow_data = table::borrow_mut(&mut escrow_store.contracts, contract_id);
        
        // Check that caller is the taker
        assert!(sender == escrow_data.immutables.taker, error::permission_denied(E_UNAUTHORIZED));
        
        // Check that escrow is not withdrawn or cancelled
        assert!(!escrow_data.withdrawn, error::invalid_state(E_ALREADY_WITHDRAWN));
        assert!(!escrow_data.cancelled, error::invalid_state(E_ALREADY_CANCELLED));
        
        // Check time constraints
        let current_time = timestamp::now_seconds();
        assert!(current_time >= escrow_data.immutables.timelocks.dst_withdrawal, error::invalid_state(E_TIMELOCK_NOT_EXPIRED));
        assert!(current_time < escrow_data.immutables.timelocks.dst_cancellation, error::invalid_state(E_TIMELOCK_EXPIRED));
        
        // Verify secret
        assert!(hash::sha3_256(secret) == escrow_data.immutables.hashlock, error::invalid_argument(E_INVALID_SECRET));
        
        // Mark escrow as withdrawn
        escrow_data.withdrawn = true;
        
        // Transfer tokens to recipient (maker)
        let coins = coin::withdraw<CoinType>(account, escrow_data.immutables.amount);
        coin::deposit(escrow_data.immutables.maker, coins);
        
        // Transfer safety deposit to caller
        // In a real implementation, this would transfer native currency
        // For simplicity, this step is omitted
        
        // Emit withdrawal event
        event::emit_event(&mut escrow_store.withdrawn_events, WithdrawalEvent {
            contract_id,
            secret,
        });
    }

    /// Public withdrawal with secret verification (any user)
    public entry fun public_withdraw<CoinType>(
        account: &signer,
        contract_id: vector<u8>,
        secret: vector<u8>
    ) acquires EscrowStore {
        let _sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        let escrow_store = borrow_global_mut<EscrowStore>(module_addr);
        assert!(table::contains(&escrow_store.contracts, contract_id), error::not_found(E_CONTRACT_NOT_EXISTS));
        
        let escrow_data = table::borrow_mut(&mut escrow_store.contracts, contract_id);
        
        // Check that escrow is not withdrawn or cancelled
        assert!(!escrow_data.withdrawn, error::invalid_state(E_ALREADY_WITHDRAWN));
        assert!(!escrow_data.cancelled, error::invalid_state(E_ALREADY_CANCELLED));
        
        // Check time constraints
        let current_time = timestamp::now_seconds();
        assert!(current_time >= escrow_data.immutables.timelocks.dst_public_withdrawal, error::invalid_state(E_TIMELOCK_NOT_EXPIRED));
        assert!(current_time < escrow_data.immutables.timelocks.dst_cancellation, error::invalid_state(E_TIMELOCK_EXPIRED));
        
        // Verify secret
        assert!(hash::sha3_256(secret) == escrow_data.immutables.hashlock, error::invalid_argument(E_INVALID_SECRET));
        
        // Mark escrow as withdrawn
        escrow_data.withdrawn = true;
        
        // Transfer tokens to recipient (maker)
        let coins = coin::withdraw<CoinType>(account, escrow_data.immutables.amount);
        coin::deposit(escrow_data.immutables.maker, coins);
        
        // Transfer safety deposit to caller
        // In a real implementation, this would transfer native currency
        // For simplicity, this step is omitted
        
        // Emit withdrawal event
        event::emit_event(&mut escrow_store.withdrawn_events, WithdrawalEvent {
            contract_id,
            secret,
        });
    }

    /// Cancel swap (taker only)
    public entry fun cancel<CoinType>(
        account: &signer,
        contract_id: vector<u8>
    ) acquires EscrowStore {
        let sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        let escrow_store = borrow_global_mut<EscrowStore>(module_addr);
        assert!(table::contains(&escrow_store.contracts, contract_id), error::not_found(E_CONTRACT_NOT_EXISTS));
        
        let escrow_data = table::borrow_mut(&mut escrow_store.contracts, contract_id);
        
        // Check that caller is the taker
        assert!(sender == escrow_data.immutables.taker, error::permission_denied(E_UNAUTHORIZED));
        
        // Check that escrow is not withdrawn or cancelled
        assert!(!escrow_data.withdrawn, error::invalid_state(E_ALREADY_WITHDRAWN));
        assert!(!escrow_data.cancelled, error::invalid_state(E_ALREADY_CANCELLED));
        
        // Check time constraints
        let current_time = timestamp::now_seconds();
        assert!(current_time >= escrow_data.immutables.timelocks.dst_cancellation, error::invalid_state(E_TIMELOCK_NOT_EXPIRED));
        
        // Mark escrow as cancelled
        escrow_data.cancelled = true;
        
        // Transfer tokens back to taker
        let coins = coin::withdraw<CoinType>(account, escrow_data.immutables.amount);
        coin::deposit(escrow_data.immutables.taker, coins);
        
        // Transfer safety deposit to caller
        // In a real implementation, this would transfer native currency
        // For simplicity, this step is omitted
        
        // Emit cancellation event
        event::emit_event(&mut escrow_store.cancelled_events, EscrowCancelledEvent {
            contract_id,
        });
    }

    /// Rescue stuck funds
    public entry fun rescue_funds<CoinType>(
        account: &signer,
        contract_id: vector<u8>,
        amount: u64
    ) acquires EscrowStore {
        let _sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        let escrow_store = borrow_global_mut<EscrowStore>(module_addr);
        assert!(table::contains(&escrow_store.contracts, contract_id), error::not_found(E_CONTRACT_NOT_EXISTS));
        
        let escrow_data = table::borrow_mut(&mut escrow_store.contracts, contract_id);
        
        // Check that caller is the taker
        assert!(_sender == escrow_data.immutables.taker, error::permission_denied(E_UNAUTHORIZED));
        
        // Check that enough time has passed
        let current_time = timestamp::now_seconds();
        assert!(current_time >= escrow_data.immutables.timelocks.deployed_at + escrow_store.rescue_delay, 
            error::invalid_state(E_TIMELOCK_NOT_EXPIRED));
        
        // Transfer tokens to taker
        let coins = coin::withdraw<CoinType>(account, amount);
        coin::deposit(escrow_data.immutables.taker, coins);
        
        // Get token type name
        let token_type = type_info::type_name<CoinType>();
        
        // Emit funds rescue event
        event::emit_event(&mut escrow_store.rescued_events, FundsRescuedEvent {
            contract_id,
            token_type,
            amount,
        });
    }

    /// Helper functions for creating timelocks and immutables
    public fun create_timelocks(
        deployed_at: u64,
        dst_withdrawal: u64,
        dst_public_withdrawal: u64,
        dst_cancellation: u64
    ): Timelocks {
        Timelocks {
            deployed_at,
            dst_withdrawal,
            dst_public_withdrawal,
            dst_cancellation,
        }
    }

    public fun create_immutables(
        order_hash: vector<u8>,
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        token_type: String,
        amount: u64,
        safety_deposit: u64,
        timelocks: Timelocks
    ): Immutables {
        Immutables {
            order_hash,
            hashlock,
            maker,
            taker,
            token_type,
            amount,
            safety_deposit,
            timelocks,
        }
    }

    /// Calculate contract ID
    public fun compute_contract_id(immutables: &Immutables): vector<u8> {
        let data = vector::empty<u8>();
        vector::append(&mut data, immutables.order_hash);
        vector::append(&mut data, immutables.hashlock);
        vector::append(&mut data, bcs::to_bytes(&immutables.maker));
        vector::append(&mut data, bcs::to_bytes(&immutables.taker));
        vector::append(&mut data, bcs::to_bytes(&immutables.token_type));
        vector::append(&mut data, bcs::to_bytes(&immutables.amount));
        vector::append(&mut data, bcs::to_bytes(&immutables.safety_deposit));
        vector::append(&mut data, bcs::to_bytes(&immutables.timelocks.deployed_at));
        vector::append(&mut data, bcs::to_bytes(&immutables.timelocks.dst_withdrawal));
        vector::append(&mut data, bcs::to_bytes(&immutables.timelocks.dst_public_withdrawal));
        vector::append(&mut data, bcs::to_bytes(&immutables.timelocks.dst_cancellation));
        hash::sha3_256(data)
    }
}
