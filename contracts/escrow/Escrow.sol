// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import { BaseEscrow } from "./BaseEscrow.sol";
import { IEscrow } from "./interfaces/IEscrow.sol";

/**
 * @title Escrow contract
 * @notice Contract that extends BaseEscrow with additional functionality
 * @dev Implements the IEscrow interface
 * @custom:security-contact security@1inch.io
 */
abstract contract Escrow is BaseEscrow, IEscrow {
    /**
     * @notice See {IEscrow-immutablesHash}
     */
    function immutablesHash() external view returns (bytes32) {
        return _immutablesHash;
    }

    /**
     * @notice See {IEscrow-rescueDelay}
     */
    function rescueDelay() external view returns (uint32) {
        return _rescueDelay;
    }

    /**
     * @dev Sets the immutables hash
     * @param hash The immutables hash to set
     */
    function _setImmutablesHash(bytes32 hash) internal {
        _immutablesHash = hash;
    }
    
    /**
     * @dev External initializer for the immutables hash, can only be called once
     * @param hash The immutables hash to set
     */
    function initialize(bytes32 hash) external {
        require(_immutablesHash == bytes32(0), "Escrow: already initialized");
        _immutablesHash = hash;
    }
    
    /**
     * @dev Receive function to accept ETH transfers
     */
    receive() external payable {}
}
