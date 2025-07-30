// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/**
 * @title Timelocks structure and library
 * @notice Contains timelock parameters for different stages of escrow contracts
 * @dev Used to store and validate timelock parameters for escrow contracts
 * @custom:security-contact security@1inch.io
 */
struct Timelocks {
    uint256[8] values;
}

/**
 * @title TimelocksLib
 * @notice Library for working with Timelocks struct
 * @dev Provides utility functions for Timelocks struct
 */
library TimelocksLib {
    /**
     * @dev Enum representing different stages of the escrow contract
     */
    enum Stage {
        SrcFinality,
        SrcWithdrawal,
        SrcPublicWithdrawal,
        SrcCancellation,
        SrcPublicCancellation,
        DstFinality,
        DstCancellation,
        DstPublicCancellation
    }

    /**
     * @dev Gets the timelock value for a specific stage
     * @param self The Timelocks struct
     * @param stage The stage to get the timelock for
     * @return The timelock value for the specified stage
     */
    function get(Timelocks calldata self, Stage stage) internal pure returns (uint256) {
        return self.values[uint256(stage)];
    }

    /**
     * @dev Validates that the current time is after the specified stage's timelock
     * @param self The Timelocks struct
     * @param stage The stage to validate
     * @return True if the current time is after the timelock, false otherwise
     */
    function validateAfter(Timelocks calldata self, Stage stage) internal view returns (bool) {
        return block.timestamp > self.values[uint256(stage)];
    }

    /**
     * @dev Validates that the current time is before the specified stage's timelock
     * @param self The Timelocks struct
     * @param stage The stage to validate
     * @return True if the current time is before the timelock, false otherwise
     */
    function validateBefore(Timelocks calldata self, Stage stage) internal view returns (bool) {
        return block.timestamp < self.values[uint256(stage)];
    }
}
