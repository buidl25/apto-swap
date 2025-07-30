// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@1inch/solidity-utils/contracts/libraries/SafeERC20.sol";
import { AddressLib, Address } from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";

import { Timelocks, TimelocksLib } from "./libraries/TimelocksLib.sol";
import { Immutables, ImmutablesLib } from "./libraries/ImmutablesLib.sol";
import { IBaseEscrow } from "./interfaces/IBaseEscrow.sol";

/**
 * @title Base Escrow contract
 * @notice Abstract contract with base functionality for escrow contracts
 * @dev Contains common functionality for all escrow contracts
 * @custom:security-contact security@1inch.io
 */
abstract contract BaseEscrow is IBaseEscrow {
    using AddressLib for Address;
    using ImmutablesLib for Immutables;
    using SafeERC20 for IERC20;
    using TimelocksLib for Timelocks;

    // Immutables hash stored in the contract
    bytes32 internal _immutablesHash;

    // Rescue delay period in seconds
    uint32 internal immutable _rescueDelay;

    // Timestamp when the contract was deployed
    uint256 internal immutable _deploymentTimestamp;

    /**
     * @dev Constructor
     * @param rescueDelay The delay period before funds can be rescued
     */
    constructor(uint32 rescueDelay) {
        _rescueDelay = rescueDelay;
        _deploymentTimestamp = block.timestamp;
    }

    /**
     * @dev Modifier to ensure only the taker can call the function
     * @param immutables The immutable values used to deploy the clone contract
     */
    modifier onlyTaker(Immutables calldata immutables) {
        require(msg.sender == immutables.taker.get(), "BaseEscrow: caller is not taker");
        _;
    }

    /**
     * @dev Modifier to ensure only the maker can call the function
     * @param immutables The immutable values used to deploy the clone contract
     */
    modifier onlyMaker(Immutables calldata immutables) {
        require(msg.sender == immutables.maker.get(), "BaseEscrow: caller is not maker");
        _;
    }

    /**
     * @dev Modifier to ensure the immutables hash is valid
     * @param immutables The immutable values used to deploy the clone contract
     */
    modifier onlyValidImmutables(Immutables calldata immutables) {
        require(immutables.validateHash(_immutablesHash), "BaseEscrow: invalid immutables");
        _;
    }

    /**
     * @dev Modifier to ensure the secret is valid
     * @param secret The secret to validate
     * @param immutables The immutable values used to deploy the clone contract
     */
    modifier onlyValidSecret(bytes32 secret, Immutables calldata immutables) {
        require(keccak256(abi.encodePacked(secret)) == immutables.secretHash, "BaseEscrow: invalid secret");
        _;
    }

    /**
     * @dev Modifier to ensure the current time is after the specified timelock
     * @param timelock The timelock to check
     */
    modifier onlyAfter(uint256 timelock) {
        require(block.timestamp > timelock, "BaseEscrow: too early");
        _;
    }

    /**
     * @dev Modifier to ensure the current time is before the specified timelock
     * @param timelock The timelock to check
     */
    modifier onlyBefore(uint256 timelock) {
        require(block.timestamp < timelock, "BaseEscrow: too late");
        _;
    }

    /**
     * @notice See {IBaseEscrow-rescueFunds}
     */
    function rescueFunds(address token, uint256 amount, address recipient) external {
        require(block.timestamp > _deploymentTimestamp + _rescueDelay, "BaseEscrow: rescue delay not passed");
        if (token == address(0)) {
            _ethTransfer(recipient, amount);
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
        emit FundsRescued(token, amount, recipient);
    }

    /**
     * @dev Transfers ETH to the specified address
     * @param to The address to transfer ETH to
     * @param amount The amount of ETH to transfer
     */
    function _ethTransfer(address to, uint256 amount) internal {
        if (amount > 0) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "BaseEscrow: ETH transfer failed");
        }
    }
}
