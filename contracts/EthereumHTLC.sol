// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EthereumHTLC is ReentrancyGuard {
    struct HTLCData {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
    }

    mapping(bytes32 => HTLCData) public contracts;

    event HTLCCreated(bytes32 indexed contractId, address indexed sender, address indexed recipient, address token, uint256 amount, bytes32 hashlock, uint256 timelock);
    event HTLCWithdrawn(bytes32 indexed contractId, bytes32 preimage);
    event HTLCRefunded(bytes32 indexed contractId);

    function createHTLC(address recipient, address token, uint256 amount, bytes32 hashlock, uint256 timelock) external returns (bytes32 contractId) {
        require(timelock > block.timestamp, "Timelock must be in the future");
        require(amount > 0, "Amount must be greater than 0");

        contractId = keccak256(abi.encodePacked(msg.sender, recipient, token, amount, hashlock, timelock));
        require(contracts[contractId].sender == address(0), "Contract already exists");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        contracts[contractId] = HTLCData({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            hashlock: hashlock,
            timelock: timelock,
            withdrawn: false,
            refunded: false
        });

        emit HTLCCreated(contractId, msg.sender, recipient, token, amount, hashlock, timelock);
    }

    function withdraw(bytes32 contractId, bytes32 preimage) external nonReentrant {
        HTLCData storage htlc = contracts[contractId];
        require(htlc.sender != address(0), "Contract does not exist");
        require(!htlc.withdrawn, "Already withdrawn");
        require(!htlc.refunded, "Already refunded");
        require(block.timestamp <= htlc.timelock, "Timelock expired");
        require(keccak256(abi.encodePacked(preimage)) == htlc.hashlock, "Invalid preimage");

        htlc.withdrawn = true;
        IERC20(htlc.token).transfer(htlc.recipient, htlc.amount);

        emit HTLCWithdrawn(contractId, preimage);
    }

    function refund(bytes32 contractId) external nonReentrant {
        HTLCData storage htlc = contracts[contractId];
        require(htlc.sender != address(0), "Contract does not exist");
        require(!htlc.withdrawn, "Already withdrawn");
        require(!htlc.refunded, "Already refunded");
        require(block.timestamp > htlc.timelock, "Timelock not expired");
        require(msg.sender == htlc.sender, "Only sender can refund");

        htlc.refunded = true;
        IERC20(htlc.token).transfer(htlc.sender, htlc.amount);

        emit HTLCRefunded(contractId);
    }
}