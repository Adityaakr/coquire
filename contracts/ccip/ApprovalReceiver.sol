// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ApprovalReceiver — lives on Hedera testnet; records treasury approvals delivered by CCIP.
/// @notice Only the Hedera testnet router (0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4) may call ccipReceive, and only from the allowed sender.
/// The Coquire guard reads approvals(orderId) before co-signing payments on that order.
contract ApprovalReceiver {
    struct Any2EVMMessage { bytes32 messageId; uint64 sourceChainSelector; bytes sender; bytes data; EVMTokenAmount[] destTokenAmounts; }
    struct EVMTokenAmount { address token; uint256 amount; }
    struct Approval { uint256 cap; address supplier; uint64 sourceChainSelector; uint256 receivedAt; }

    address public immutable router;
    address public owner;
    address public allowedSender;
    uint64 public allowedSourceSelector;
    mapping(bytes32 => Approval) public approvals;

    event ApprovalReceived(bytes32 indexed messageId, bytes32 indexed orderId, uint256 cap, address supplier, uint64 sourceChainSelector);

    constructor(address _router, uint64 _allowedSourceSelector) {
        router = _router;
        owner = msg.sender;
        allowedSourceSelector = _allowedSourceSelector;
    }

    function setAllowedSender(address _sender) external { require(msg.sender == owner, "owner"); allowedSender = _sender; }

    /// @dev CCIPReceiver interface: the router calls this with the delivered message.
    function ccipReceive(Any2EVMMessage calldata message) external {
        require(msg.sender == router, "router");
        require(message.sourceChainSelector == allowedSourceSelector, "source");
        require(abi.decode(message.sender, (address)) == allowedSender, "sender");
        (bytes32 orderId, uint256 cap, address supplier) = abi.decode(message.data, (bytes32, uint256, address));
        approvals[orderId] = Approval({ cap: cap, supplier: supplier, sourceChainSelector: message.sourceChainSelector, receivedAt: block.timestamp });
        emit ApprovalReceived(message.messageId, orderId, cap, supplier, message.sourceChainSelector);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x85572ffb || interfaceId == 0x01ffc9a7; // IAny2EVMMessageReceiver, IERC165
    }
}
