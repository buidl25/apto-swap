// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract TestEvmToken is ERC20, ERC20Burnable {
    constructor() ERC20("TestEvmToken", "TET") {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens
    }
    
    /**
     * @dev Mints tokens to a specified address (for testing purposes)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}