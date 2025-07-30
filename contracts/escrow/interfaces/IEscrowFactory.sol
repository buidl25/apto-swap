// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "../libraries/ImmutablesLib.sol";

/**
 * @title Escrow Factory Interface
 * @notice Interface for the escrow factory contract
 * @dev Defines the functions and events for the escrow factory
 * @custom:security-contact security@1inch.io
 */
interface IEscrowFactory {
    /**
     * @notice Event emitted when a new escrow contract is deployed
     * @param escrow The address of the deployed escrow contract
     * @param orderHash The hash of the order
     * @param maker The maker address
     * @param taker The taker address
     * @param token The token address
     * @param amount The amount of tokens
     * @param secretHash The hash of the secret
     * @param safetyDeposit The safety deposit amount
     */
    event EscrowDeployed(
        address indexed escrow,
        bytes32 indexed orderHash,
        address maker,
        address taker,
        address token,
        uint256 amount,
        bytes32 secretHash,
        uint256 safetyDeposit
    );

    /**
     * @notice Deploys a new escrow contract
     * @param immutables The immutable values to use for the escrow contract
     * @return escrow The address of the deployed escrow contract
     */
    function deploy(Immutables calldata immutables) external payable returns (address escrow);

    /**
     * @notice Gets the address of an escrow contract for the given order hash
     * @param orderHash The hash of the order
     * @return The address of the escrow contract
     */
    function getEscrowAddress(bytes32 orderHash) external view returns (address);

    /**
     * @notice Gets the implementation address of the escrow contract
     * @return The implementation address
     */
    function implementation() external view returns (address);

    // Note: owner() and transferOwnership() functions are inherited from OpenZeppelin's Ownable
}
