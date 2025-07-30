// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { TakerTraitsLib, TakerTraits } from "@1inch/limit-order-protocol-contract/contracts/libraries/TakerTraitsLib.sol";
import { AddressLib, Address } from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import { SafeERC20 } from "@1inch/solidity-utils/contracts/libraries/SafeERC20.sol";
import { IOrderMixin } from "@1inch/limit-order-protocol-contract/contracts/interfaces/IOrderMixin.sol";
import { ITakerInteraction } from "@1inch/limit-order-protocol-contract/contracts/interfaces/ITakerInteraction.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { Immutables, ImmutablesLib } from "./libraries/ImmutablesLib.sol";
import { Timelocks, TimelocksLib } from "./libraries/TimelocksLib.sol";
import { IEscrowFactory } from "./interfaces/IEscrowFactory.sol";

/**
 * @title FusionResolver
 * @notice Resolver contract for handling 1inch Fusion orders with Escrow integration
 * @dev Implements ITakerInteraction for interaction with 1inch Limit Order Protocol
 * @custom:security-contact security@1inch.io
 */
contract FusionResolver is ITakerInteraction, Ownable {
    using AddressLib for Address;
    
    /**
     * @dev Helper function to convert address to Address type
     * @param addr The address to convert
     * @return The Address type representation
     */
    function _toAddress(address addr) internal pure returns (Address) {
        return Address.wrap(uint256(uint160(addr)));
    }
    using ImmutablesLib for Immutables;
    using SafeERC20 for IERC20;
    using TimelocksLib for Timelocks;

    uint256 private constant _ARGS_HAS_TARGET = 1 << 251;

    // Address of the 1inch Limit Order Protocol
    address public immutable limitOrderProtocol;
    
    // Address of the EscrowFactory contract
    address public immutable escrowFactory;
    
    // Events
    event EscrowOrderCreated(
        bytes32 indexed orderHash,
        address indexed escrow,
        address maker,
        address taker,
        address token,
        uint256 amount,
        bytes32 secretHash,
        uint256 safetyDeposit
    );
    
    /**
     * @dev Constructor
     * @param _limitOrderProtocol Address of the 1inch Limit Order Protocol
     * @param _escrowFactory Address of the EscrowFactory contract
     */
    constructor(address _limitOrderProtocol, address _escrowFactory) Ownable(msg.sender) {
        require(_limitOrderProtocol != address(0), "FusionResolver: invalid LOP address");
        require(_escrowFactory != address(0), "FusionResolver: invalid factory address");
        limitOrderProtocol = _limitOrderProtocol;
        escrowFactory = _escrowFactory;
    }
    
    /**
     * @notice Creates a new escrow order
     * @param recipient The address of the recipient (taker)
     * @param token The address of the token to be escrowed
     * @param amount The amount of tokens to be escrowed
     * @param secretHash The hash of the secret
     * @param timelockValues The timelock values array [8] for the escrow
     * @param orderHash The hash of the order
     * @return escrowAddress The address of the deployed escrow contract
     */
    function createEscrowOrder(
        address recipient,
        address token,
        uint256 amount,
        bytes32 secretHash,
        uint256[8] calldata timelockValues,
        bytes32 orderHash
    ) external payable returns (address escrowAddress) {
        require(recipient != address(0), "FusionResolver: invalid recipient");
        require(token != address(0), "FusionResolver: invalid token address");
        require(amount > 0, "FusionResolver: invalid amount");
        require(secretHash != bytes32(0), "FusionResolver: invalid secretHash");
        
        // Create immutables struct with Timelocks from array
        Timelocks memory timelocks;
        timelocks.values = timelockValues;
        
        // Create immutables struct
        Immutables memory immutables = Immutables({
            orderHash: orderHash,
            maker: _toAddress(msg.sender),
            taker: _toAddress(recipient),
            token: _toAddress(token),
            amount: amount,
            secretHash: secretHash,
            safetyDeposit: msg.value,
            timelocks: timelocks
        });
        
        // Transfer tokens from sender to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Deploy escrow contract through factory
        escrowAddress = IEscrowFactory(escrowFactory).deploy{value: msg.value}(immutables);
        
        // Transfer tokens to the escrow contract
        IERC20(token).safeTransfer(escrowAddress, amount);
        
        // Emit event
        emit EscrowOrderCreated(
            orderHash,
            escrowAddress,
            msg.sender,
            recipient,
            token,
            amount,
            secretHash,
            msg.value
        );
        
        return escrowAddress;
    }
    
    /**
     * @dev Approves tokens for the Limit Order Protocol
     * @param token Token address
     */
    function approveToken(address token) external onlyOwner {
        IERC20(token).approve(limitOrderProtocol, type(uint256).max);
    }
    
    /**
     * @dev Settles orders through the Limit Order Protocol
     * @param order Limit order to be settled
     * @param signature Order signature
     * @param takingAmount Amount being taken
     * @param thresholdAmount Threshold amount
     * @param target Target address for interaction
     * @param data Interaction data
     */
    function settleOrders(
        IOrderMixin.Order calldata order,
        bytes calldata signature,
        uint256 takingAmount,
        uint256 thresholdAmount,
        address target,
        bytes calldata data
    ) external {
        // Approve tokens if needed
        IERC20(AddressLib.get(order.makerAsset)).approve(limitOrderProtocol, order.makingAmount);

        TakerTraits takerTraits = TakerTraits.wrap(thresholdAmount | _ARGS_HAS_TARGET);

        bytes memory args = abi.encode(target, data);

        // Call fillContractOrderArgs on the Limit Order Protocol
        IOrderMixin(limitOrderProtocol).fillContractOrderArgs(
            order,
            signature,
            takingAmount,
            takerTraits,
            args
        );
    }
    
    /**
     * @dev Implements ITakerInteraction.takerInteraction
     * @param order Order being processed
     * @param extension Order extension data
     * @param orderHash Hash of the order being processed
     * @param taker Taker address
     * @param makingAmount Actual making amount
     * @param takingAmount Actual taking amount
     * @param remainingMakingAmount Order remaining making amount
     * @param extraData Extra data
     */
    function takerInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external {
        require(msg.sender == limitOrderProtocol, "FusionResolver: only LOP can call");
        
        // Decode interaction data
        (address token, uint256 amount, address recipient) = abi.decode(
            extraData,
            (address, uint256, address)
        );
        
        // Transfer tokens to recipient
        IERC20(token).safeTransfer(recipient, amount);
    }
    
    /**
     * @dev Rescues tokens accidentally sent to the contract
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
