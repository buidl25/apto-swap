// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./IEscrow.sol";
import "../libraries/ImmutablesLib.sol";

/**
 * @title Source Escrow Interface
 * @notice Interface for the source escrow contract functionality
 * @dev Extends the escrow interface with source-specific functionality
 * @custom:security-contact security@1inch.io
 */
interface IEscrowSrc is IEscrow {
    /**
     * @notice Withdraws funds to a specific address using the secret
     * @param secret The secret that unlocks the escrow
     * @param target The address to send the funds to
     * @param immutables The immutable values used to deploy the clone contract
     */
    function withdrawTo(bytes32 secret, address target, Immutables calldata immutables) external;

    /**
     * @notice Allows anyone to withdraw funds to the taker using the secret after the public withdrawal period begins
     * @dev Can be called by anyone, not just the taker
     * @param secret The secret that unlocks the escrow
     * @param immutables The immutable values used to deploy the clone contract
     */
    function publicWithdraw(bytes32 secret, Immutables calldata immutables) external;

    /**
     * @notice Allows anyone to cancel the escrow after the public cancellation period begins
     * @dev Can be called by anyone, not just the taker
     * @param immutables The immutable values used to deploy the clone contract
     */
    function publicCancel(Immutables calldata immutables) external;
}
