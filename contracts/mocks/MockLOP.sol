// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@1inch/limit-order-protocol-contract/contracts/interfaces/ITakerInteraction.sol";
import "@1inch/limit-order-protocol-contract/contracts/interfaces/IOrderMixin.sol";
import "@1inch/limit-order-protocol-contract/contracts/libraries/TakerTraitsLib.sol";


contract MockLOP {
    event OrderFilled(address indexed resolver, bytes data);

    function fillContractOrderArgs(
        IOrderMixin.Order calldata order,
        bytes calldata signature,
        uint256 takingAmount,
        TakerTraits takerTraits,
        bytes calldata args
    ) external {
        (address target, bytes memory data) = abi.decode(args, (address, bytes));
        emit OrderFilled(target, data);
    }

    function triggerTakerInteraction(
        address resolverAddress,
        IOrderMixin.Order calldata order,
        bytes calldata extraData
    ) external {
        ITakerInteraction(resolverAddress).takerInteraction(
            order,
            "", // extension
            bytes32(0), // orderHash
            address(this), // taker
            order.makingAmount,
            order.takingAmount,
            0, // remainingMakingAmount
            extraData
        );
    }
}
