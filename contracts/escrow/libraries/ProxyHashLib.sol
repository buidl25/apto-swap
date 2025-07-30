// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/**
 * @title ProxyHashLib
 * @notice Library for working with proxy contract hashing
 * @dev Provides utility functions for generating deterministic proxy addresses
 * @custom:security-contact security@1inch.io
 */
library ProxyHashLib {
    /**
     * @dev Computes the hash of a proxy contract based on its parameters
     * @param orderHash The hash of the order
     * @param salt A random value to ensure uniqueness
     * @return The hash of the proxy contract
     */
    function computeProxyHash(bytes32 orderHash, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(orderHash, salt));
    }

    /**
     * @dev Predicts the address of a proxy contract based on its parameters
     * @param factory The address of the factory contract
     * @param orderHash The hash of the order
     * @param salt A random value to ensure uniqueness
     * @return The predicted address of the proxy contract
     */
    function predictProxyAddress(address factory, bytes32 orderHash, bytes32 salt) internal pure returns (address) {
        bytes32 proxyHash = computeProxyHash(orderHash, salt);
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                factory,
                proxyHash,
                keccak256(abi.encodePacked(hex"3d602d80600a3d3981f3363d3d373d3d3d363d73", address(0), hex"5af43d82803e903d91602b57fd5bf3"))
            )
        );
        return address(uint160(uint256(hash)));
    }
}

/**
 * @dev Minimal proxy contract interface for address calculation
 */
interface ERC1167 {
    function implementation() external view returns (address);
}
