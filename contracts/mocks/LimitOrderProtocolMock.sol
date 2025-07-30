// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LimitOrderProtocolMock
 * @dev Mock implementation of the 1inch Limit Order Protocol for testing
 */
contract LimitOrderProtocolMock {
    event OrderFilled(
        address maker,
        address taker,
        address makerAsset,
        address takerAsset,
        uint256 makingAmount,
        uint256 takingAmount
    );

    // Mock function to simulate a call from the Limit Order Protocol
    function mockCall(
        address maker,
        address taker,
        address makerAsset,
        address takerAsset,
        uint256 makingAmount,
        uint256 takingAmount
    ) external {
        // Transfer tokens to simulate the order fill
        if (makerAsset != address(0)) {
            IERC20(makerAsset).transferFrom(maker, taker, makingAmount);
        }
        
        if (takerAsset != address(0)) {
            IERC20(takerAsset).transferFrom(taker, maker, takingAmount);
        }
        
        emit OrderFilled(
            maker,
            taker,
            makerAsset,
            takerAsset,
            makingAmount,
            takingAmount
        );
    }
}
