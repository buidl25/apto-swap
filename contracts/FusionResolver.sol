// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@1inch/limit-order-protocol-contract/contracts/libraries/TakerTraitsLib.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import "@1inch/solidity-utils/contracts/libraries/SafeERC20.sol";
import "@1inch/limit-order-protocol-contract/contracts/interfaces/IOrderMixin.sol";
import "@1inch/limit-order-protocol-contract/contracts/interfaces/ITakerInteraction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FusionResolver
 * @notice Resolver contract for handling 1inch Fusion orders with HTLC integration
 * @dev Implements ITakerInteraction for interaction with 1inch Limit Order Protocol
 */
contract FusionResolver is ITakerInteraction, Ownable {
    using SafeERC20 for IERC20;

    uint256 private constant _ARGS_HAS_TARGET = 1 << 251;

    // Address of the 1inch Limit Order Protocol
    address public immutable limitOrderProtocol;
    
    // Mapping to track HTLC locks
    mapping(bytes32 => HTLCLock) public htlcLocks;
    
    // HTLC lock structure
    struct HTLCLock {
        address sender;
        address recipient;
        address tokenAddress;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
    }
    
    // Events
    event HTLCCreated(
        bytes32 indexed id,
        address indexed sender,
        address indexed recipient,
        address tokenAddress,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock
    );
    
    event HTLCWithdrawn(bytes32 indexed id, bytes32 preimage);
    event HTLCRefunded(bytes32 indexed id);
    
    /**
     * @dev Constructor
     * @param _limitOrderProtocol Address of the 1inch Limit Order Protocol
     */
    constructor(address _limitOrderProtocol) Ownable(msg.sender) {
        require(_limitOrderProtocol != address(0), "Invalid LOP address");
        limitOrderProtocol = _limitOrderProtocol;
    }
    
    /**
     * @dev Creates an HTLC lock for a token
     * @param _recipient Recipient address
     * @param _tokenAddress Token address
     * @param _amount Amount of tokens
     * @param _hashlock Hash of the secret
     * @param _timelock Timestamp after which the sender can refund
     * @return id HTLC lock ID
     */
    function createHTLC(
        address _recipient,
        address _tokenAddress,
        uint256 _amount,
        bytes32 _hashlock,
        uint256 _timelock
    ) external returns (bytes32 id) {
        require(_recipient != address(0), "Invalid recipient");
        require(_tokenAddress != address(0), "Invalid token address");
        require(_amount > 0, "Invalid amount");
        require(_hashlock != 0, "Invalid hashlock");
        require(_timelock > block.timestamp, "Timelock must be in the future");
        
        // Calculate HTLC ID
        id = keccak256(
            abi.encodePacked(
                msg.sender,
                _recipient,
                _tokenAddress,
                _amount,
                _hashlock,
                _timelock
            )
        );
        
        // Ensure HTLC doesn't already exist
        require(htlcLocks[id].sender == address(0), "HTLC already exists");
        
        // Create HTLC lock
        htlcLocks[id] = HTLCLock({
            sender: msg.sender,
            recipient: _recipient,
            tokenAddress: _tokenAddress,
            amount: _amount,
            hashlock: _hashlock,
            timelock: _timelock,
            withdrawn: false,
            refunded: false
        });
        
        // Transfer tokens from sender to this contract
        IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Emit event
        emit HTLCCreated(
            id,
            msg.sender,
            _recipient,
            _tokenAddress,
            _amount,
            _hashlock,
            _timelock
        );
        
        return id;
    }
    
    /**
     * @dev Withdraws tokens from an HTLC using the preimage
     * @param _id HTLC ID
     * @param _preimage Secret preimage that hashes to the hashlock
     */
    function withdraw(bytes32 _id, bytes32 _preimage) external {
        HTLCLock storage lock = htlcLocks[_id];
        
        // Validate HTLC state
        require(lock.sender != address(0), "HTLC does not exist");
        require(!lock.withdrawn, "HTLC already withdrawn");
        require(!lock.refunded, "HTLC already refunded");
        require(block.timestamp <= lock.timelock, "HTLC expired");
        require(lock.recipient == msg.sender, "Not recipient");
        
        // Validate preimage
        require(sha256(abi.encodePacked(_preimage)) == lock.hashlock, "Invalid preimage");
        
        // Mark as withdrawn
        lock.withdrawn = true;
        
        // Transfer tokens to recipient
        IERC20(lock.tokenAddress).safeTransfer(lock.recipient, lock.amount);
        
        // Emit event
        emit HTLCWithdrawn(_id, _preimage);
    }
    
    /**
     * @dev Refunds tokens to the sender after timelock expiration
     * @param _id HTLC ID
     */
    function refund(bytes32 _id) external {
        HTLCLock storage lock = htlcLocks[_id];
        
        // Validate HTLC state
        require(lock.sender != address(0), "HTLC does not exist");
        require(!lock.withdrawn, "HTLC already withdrawn");
        require(!lock.refunded, "HTLC already refunded");
        require(block.timestamp > lock.timelock, "HTLC not yet expired");
        require(lock.sender == msg.sender, "Not sender");
        
        // Mark as refunded
        lock.refunded = true;
        
        // Transfer tokens back to sender
        IERC20(lock.tokenAddress).safeTransfer(lock.sender, lock.amount);
        
        // Emit event
        emit HTLCRefunded(_id);
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
        require(msg.sender == limitOrderProtocol, "Only LOP can call");
        
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
