// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./IBaseEscrow.sol";

/**
 * @title Escrow Interface
 * @notice Interface for the escrow contract functionality
 * @dev Extends the base escrow interface with additional functionality
 * @custom:security-contact security@1inch.io
 */
interface IEscrow is IBaseEscrow {
    /**
     * @notice Returns the immutables hash stored in the contract
     * @return The immutables hash
     */
    function immutablesHash() external view returns (bytes32);

    /**
     * @notice Returns the rescue delay period
     * @return The rescue delay in seconds
     */
    function rescueDelay() external view returns (uint32);
}
