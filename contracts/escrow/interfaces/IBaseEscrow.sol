// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "../libraries/ImmutablesLib.sol";

/**
 * @title Base Escrow Interface
 * @notice Interface for the base escrow contract functionality
 * @dev Defines the basic functions and events for escrow contracts
 * @custom:security-contact security@1inch.io
 */
interface IBaseEscrow {
    /**
     * @notice Event emitted when funds are withdrawn from escrow
     * @param secret The secret that was used to unlock the escrow
     */
    event Withdrawal(bytes32 secret);

    /**
     * @notice Event emitted when escrow is cancelled
     */
    event EscrowCancelled();

    /**
     * @notice Event emitted when funds are rescued from the contract
     * @param token The token that was rescued
     * @param amount The amount of tokens that were rescued
     * @param recipient The address that received the rescued tokens
     */
    event FundsRescued(address token, uint256 amount, address recipient);

    /**
     * @notice Withdraws funds from escrow using the secret
     * @param secret The secret that unlocks the escrow
     * @param immutables The immutable values used to deploy the clone contract
     */
    function withdraw(bytes32 secret, Immutables calldata immutables) external;

    /**
     * @notice Cancels the escrow and returns funds to the maker
     * @param immutables The immutable values used to deploy the clone contract
     */
    function cancel(Immutables calldata immutables) external;

    /**
     * @notice Rescues funds that are stuck in the contract
     * @dev Can only be called after the rescue delay has passed
     * @param token The token to rescue
     * @param amount The amount of tokens to rescue
     * @param recipient The address to send the rescued tokens to
     */
    function rescueFunds(address token, uint256 amount, address recipient) external;
}
