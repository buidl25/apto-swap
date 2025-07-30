// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { AddressLib, Address } from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";

import { Immutables, ImmutablesLib } from "./libraries/ImmutablesLib.sol";
import { ProxyHashLib } from "./libraries/ProxyHashLib.sol";
import { IEscrowFactory } from "./interfaces/IEscrowFactory.sol";
import { EscrowSrc } from "./EscrowSrc.sol";

/**
 * @title Escrow Factory contract
 * @notice Factory contract for deploying escrow contracts
 * @dev Uses the minimal proxy pattern to deploy escrow contracts
 * @custom:security-contact security@1inch.io
 */
contract EscrowFactory is IEscrowFactory, Ownable {
    using AddressLib for Address;
    using ImmutablesLib for Immutables;

    // The implementation address of the escrow contract
    address public immutable override implementation;

    // Mapping of order hash to escrow address
    mapping(bytes32 => address) private _escrows;

    /**
     * @dev Constructor
     * @param rescueDelay The delay period before funds can be rescued
     */
    constructor(uint32 rescueDelay) Ownable(msg.sender) {
        implementation = address(new EscrowSrc(rescueDelay));
    }

    /**
     * @notice See {IEscrowFactory-deploy}
     */
    function deploy(Immutables calldata immutables) external payable override returns (address escrow) {
        // Ensure the order hash is not already used
        require(_escrows[immutables.orderHash] == address(0), "EscrowFactory: escrow already exists");

        // Create a clone of the implementation contract
        escrow = Clones.clone(implementation);
        
        // Store the escrow address for the order hash
        _escrows[immutables.orderHash] = escrow;

        // Initialize the escrow contract
        bytes32 immutablesHash = keccak256(abi.encode(immutables));
        (bool success, ) = escrow.call(abi.encodeWithSignature("initialize(bytes32)", immutablesHash));
        require(success, "EscrowFactory: failed to initialize escrow");

        // Transfer the safety deposit to the escrow contract
        if (immutables.safetyDeposit > 0) {
            require(msg.value >= immutables.safetyDeposit, "EscrowFactory: insufficient safety deposit");
            (success, ) = escrow.call{value: immutables.safetyDeposit}("");
            require(success, "EscrowFactory: failed to transfer safety deposit");
        }

        // Emit the deployment event
        emit EscrowDeployed(
            escrow,
            immutables.orderHash,
            immutables.maker.get(),
            immutables.taker.get(),
            immutables.token.get(),
            immutables.amount,
            immutables.secretHash,
            immutables.safetyDeposit
        );
    }

    /**
     * @notice See {IEscrowFactory-getEscrowAddress}
     */
    function getEscrowAddress(bytes32 orderHash) external view override returns (address) {
        return _escrows[orderHash];
    }
}
