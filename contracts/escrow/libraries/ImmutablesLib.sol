// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import { AddressLib, Address } from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import { Timelocks } from "./TimelocksLib.sol";

/**
 * @title Immutables structure and library
 * @notice Contains immutable parameters for escrow contracts
 * @dev Used to store and validate immutable parameters for escrow contracts
 * @custom:security-contact security@1inch.io
 */
struct Immutables {
    bytes32 orderHash;
    Address maker;
    Address taker;
    Address token;
    uint256 amount;
    bytes32 secretHash;
    uint256 safetyDeposit;
    Timelocks timelocks;
}

/**
 * @title ImmutablesLib
 * @notice Library for working with Immutables struct
 * @dev Provides utility functions for Immutables struct
 */
library ImmutablesLib {
    /**
     * @dev Validates that the immutables hash matches the expected hash
     * @param self The Immutables struct
     * @param expectedHash The expected hash of the immutables
     * @return True if the hash matches, false otherwise
     */
    function validateHash(Immutables calldata self, bytes32 expectedHash) internal pure returns (bool) {
        return keccak256(abi.encode(self)) == expectedHash;
    }
}
