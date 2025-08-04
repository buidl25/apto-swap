// SPDX-License-Identifier: MIT
module cross_chain_swap::dutch_auction {
    use std::signer;

    use aptos_framework::aptos_account;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;

    // --- Constants ---

    /// The auction creator hasn't created an auction yet.
    const E_AUCTION_NOT_FOUND: u64 = 1;
    /// The auction has already ended.
    const E_AUCTION_ENDED: u64 = 2;
    /// The start time must be less than the end time.
    const E_INVALID_TIME_RANGE: u64 = 3;
    /// The start time must not be in the past.
    const E_START_TIME_IN_PAST: u64 = 4;

    // --- Structs ---

    /// Represents a Dutch auction for a specific pair of coins.
    /// `MakerCoin` is the coin being sold.
    /// `TakerCoin` is the coin being accepted as payment.
    struct Auction<phantom MakerCoin, phantom TakerCoin> has key {
        maker_addr: address,
        making_amount: u64,
        // --- Auction Parameters ---
        start_time: u64,
        end_time: u64,
        start_taking_amount: u64,
        end_taking_amount: u64,
        // --- State ---
        maker_coins: Coin<MakerCoin>,
    }

    // --- Public View Functions ---

    /// Calculates the current taking amount required to fill the auction.
    /// The price decreases linearly from `start_taking_amount` to `end_taking_amount`.
    public fun calculate_current_taking_amount(
        start_time: u64,
        end_time: u64,
        start_taking_amount: u64,
        end_taking_amount: u64,
    ): u64 {
        let now = timestamp::now_seconds();

        // Clamp current time to the auction's time range
        let current_time = if (now < start_time) {
            start_time
        } else if (now > end_time) {
            end_time
        } else {
            now
        };

        let duration = end_time - start_time;
        assert!(duration > 0, E_INVALID_TIME_RANGE);

        // This is the core logic from the Solidity contract, adapted for Move.
        // It calculates the price at `current_time` using linear interpolation.
        // The use of u128 is to prevent overflow during intermediate calculations.
        let time_from_start = (current_time - start_time) as u128;
        let time_until_end = (end_time - current_time) as u128;
        let start_amount = start_taking_amount as u128;
        let end_amount = end_taking_amount as u128;
        let duration_u128 = duration as u128;

        let current_price = (start_amount * time_until_end + end_amount * time_from_start) / duration_u128;
        (current_price as u64)
    }

    // --- Public Functions ---

    /// Creates a new Dutch auction.
    /// The maker (signer) deposits `making_amount` of `MakerCoin`.
    public entry fun create_auction<MakerCoin, TakerCoin>(
        maker: &signer,
        making_amount: u64,
        start_taking_amount: u64,
        end_taking_amount: u64,
        start_time: u64,
        end_time: u64,
    ) {
        let maker_addr = signer::address_of(maker);
        let now = timestamp::now_seconds();

        // Validations
        assert!(start_time < end_time, E_INVALID_TIME_RANGE);
        assert!(start_time >= now, E_START_TIME_IN_PAST);

        // Withdraw coins from the maker to be held by the auction resource.
        let maker_coins_to_deposit = coin::withdraw<MakerCoin>(maker, making_amount);

        // Create and move the Auction resource to the maker's account.
        move_to(maker, Auction<MakerCoin, TakerCoin> {
            maker_addr,
            making_amount,
            start_time,
            end_time,
            start_taking_amount,
            end_taking_amount,
            maker_coins: maker_coins_to_deposit,
        });
    }

    /// Fills an existing auction.
    /// The taker (signer) pays the current taking amount and receives the making amount.
    public entry fun fill_auction<MakerCoin, TakerCoin>(
        taker: &signer,
        maker_addr: address,
    ) acquires Auction {
        let taker_addr = signer::address_of(taker);
        assert!(exists<Auction<MakerCoin, TakerCoin>>(maker_addr), E_AUCTION_NOT_FOUND);

        let auction = borrow_global<Auction<MakerCoin, TakerCoin>>(maker_addr);
        let now = timestamp::now_seconds();
        assert!(now <= auction.end_time, E_AUCTION_ENDED);

        // Calculate the required payment amount at this moment.
        let taking_amount_needed = calculate_current_taking_amount(
            auction.start_time,
            auction.end_time,
            auction.start_taking_amount,
            auction.end_taking_amount,
        );

        // Withdraw the payment from the taker.
        let taker_payment = coin::withdraw<TakerCoin>(taker, taking_amount_needed);

        // The auction is now over. Move the resource out of global storage to process the fund transfer.
        let finished_auction = move_from<Auction<MakerCoin, TakerCoin>>(maker_addr);
        let Auction {
            maker_addr: stored_maker_addr,
            making_amount: _,
            start_time: _,
            end_time: _,
            start_taking_amount: _,
            end_taking_amount: _,
            maker_coins,
        } = finished_auction;

        // Deposit funds to the respective parties.
        // Taker gets the maker's coins.
        aptos_account::deposit_coins(taker_addr, maker_coins);
        // Maker gets the taker's payment.
        aptos_account::deposit_coins(stored_maker_addr, taker_payment);
    }
}
