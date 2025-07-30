module cross_chain_swap::escrow_factory {
    use std::signer;
    use std::error;
    use std::string::String;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_std::table::{Self, Table};
    use aptos_std::type_info;
    
    use cross_chain_swap::escrow_dst::Self;

    /// Structure for storing factory data
    struct FactoryData has key {
        owner: address,
        rescue_delay: u64,
        created_escrows: Table<vector<u8>, address>,
        creation_events: EventHandle<EscrowCreationEvent>,
    }

    /// Escrow creation event
    struct EscrowCreationEvent has drop, store {
        contract_id: vector<u8>,
        escrow_address: address,
        maker: address,
        taker: address,
        token_type: String,
        amount: u64,
    }

    /// Error codes
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_CONTRACT_EXISTS: u64 = 4;

    /// Initialize factory
    public entry fun initialize(
        account: &signer,
        rescue_delay: u64
    ) {
        let _sender = signer::address_of(account);
        assert!(!exists<FactoryData>(_sender), error::already_exists(E_ALREADY_INITIALIZED));

        move_to(account, FactoryData {
            owner: _sender,
            rescue_delay,
            created_escrows: table::new(),
            creation_events: account::new_event_handle<EscrowCreationEvent>(account),
        });
    }

    /// Create a new escrow on the destination chain
    public entry fun create_dst_escrow<CoinType>(
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
    ) acquires FactoryData {
        let _sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        assert!(exists<FactoryData>(module_addr), error::not_found(E_NOT_INITIALIZED));
        
        // Create escrow through escrow_dst module
        escrow_dst::create_escrow_dst<CoinType>(
            account,
            order_hash,
            hashlock,
            maker,
            taker,
            amount,
            safety_deposit,
            dst_withdrawal_delay,
            dst_public_withdrawal_delay,
            dst_cancellation_delay
        );
        
        // Get contract ID
        let current_time = timestamp::now_seconds();
        let timelocks = escrow_dst::create_timelocks(
            current_time,
            current_time + dst_withdrawal_delay,
            current_time + dst_public_withdrawal_delay,
            current_time + dst_cancellation_delay
        );
        
        let token_type = type_info::type_name<CoinType>();
        
        let immutables = escrow_dst::create_immutables(
            order_hash,
            hashlock,
            maker,
            taker,
            token_type,
            amount,
            safety_deposit,
            timelocks
        );
        
        let contract_id = escrow_dst::compute_contract_id(&immutables);
        
        // Register created escrow in factory
        let factory_data = borrow_global_mut<FactoryData>(module_addr);
        assert!(!table::contains(&factory_data.created_escrows, contract_id), error::already_exists(E_CONTRACT_EXISTS));
        
        table::add(&mut factory_data.created_escrows, contract_id, module_addr);
        
        // Emit escrow creation event
        event::emit_event(&mut factory_data.creation_events, EscrowCreationEvent {
            contract_id,
            escrow_address: module_addr,
            maker,
            taker,
            token_type,
            amount,
        });
    }

    /// Get escrow address by ID
    public fun get_escrow_address(
        contract_id: vector<u8>
    ): address acquires FactoryData {
        let module_addr = @cross_chain_swap;
        
        assert!(exists<FactoryData>(module_addr), error::not_found(E_NOT_INITIALIZED));
        
        let factory_data = borrow_global<FactoryData>(module_addr);
        assert!(table::contains(&factory_data.created_escrows, contract_id), error::not_found(E_CONTRACT_EXISTS));
        
        *table::borrow(&factory_data.created_escrows, contract_id)
    }

    /// Update rescue delay
    public entry fun update_rescue_delay(
        account: &signer,
        new_rescue_delay: u64
    ) acquires FactoryData {
        let _sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        assert!(exists<FactoryData>(module_addr), error::not_found(E_NOT_INITIALIZED));
        
        let factory_data = borrow_global_mut<FactoryData>(module_addr);
        assert!(_sender == factory_data.owner, error::permission_denied(E_UNAUTHORIZED));
        
        factory_data.rescue_delay = new_rescue_delay;
    }

    /// Transfer factory ownership
    public entry fun transfer_ownership(
        account: &signer,
        new_owner: address
    ) acquires FactoryData {
        let _sender = signer::address_of(account);
        let module_addr = @cross_chain_swap;
        
        assert!(exists<FactoryData>(module_addr), error::not_found(E_NOT_INITIALIZED));
        
        let factory_data = borrow_global_mut<FactoryData>(module_addr);
        assert!(_sender == factory_data.owner, error::permission_denied(E_UNAUTHORIZED));
        
        factory_data.owner = new_owner;
    }
}
