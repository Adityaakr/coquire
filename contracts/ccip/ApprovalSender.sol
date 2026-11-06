// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ApprovalSender — a treasury on Ethereum Sepolia approves a spend cap for a Coquire order on Hedera testnet.
/// @notice Sends an arbitrary-data CCIP message { orderId, cap, supplier } to ApprovalReceiver. Fees paid in native ETH.
/// Router (Sepolia): 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59 · Hedera testnet selector: 222782988166878823
interface IRouterClient {
    struct EVMTokenAmount { address token; uint256 amount; }
    struct EVM2AnyMessage { bytes receiver; bytes data; EVMTokenAmount[] tokenAmounts; address feeToken; bytes extraArgs; }
    function getFee(uint64 destinationChainSelector, EVM2AnyMessage memory message) external view returns (uint256 fee);
    function ccipSend(uint64 destinationChainSelector, EVM2AnyMessage calldata message) external payable returns (bytes32);
}

contract ApprovalSender {
    IRouterClient public immutable router;
    uint64 public immutable destinationSelector;
    address public receiver;
    address public owner;

    event ApprovalSent(bytes32 indexed messageId, bytes32 indexed orderId, uint256 cap, address supplier, uint256 fee);

    constructor(address _router, uint64 _destinationSelector, address _receiver) {
        router = IRouterClient(_router);
        destinationSelector = _destinationSelector;
        receiver = _receiver;
        owner = msg.sender;
    }

    function setReceiver(address _receiver) external { require(msg.sender == owner, "owner"); receiver = _receiver; }

    function _message(bytes32 orderId, uint256 cap, address supplier) internal view returns (IRouterClient.EVM2AnyMessage memory) {
        // extraArgs: EVMExtraArgsV1 { gasLimit } with tag 0x97a657c9, 300k gas for the receiver.
        bytes memory extraArgs = abi.encodeWithSelector(bytes4(0x97a657c9), uint256(300_000));
        return IRouterClient.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(orderId, cap, supplier),
            tokenAmounts: new IRouterClient.EVMTokenAmount[](0),
            feeToken: address(0),
            extraArgs: extraArgs
        });
    }

    function quoteFee(bytes32 orderId, uint256 cap, address supplier) external view returns (uint256) {
        return router.getFee(destinationSelector, _message(orderId, cap, supplier));
    }

    function sendApproval(bytes32 orderId, uint256 cap, address supplier) external payable returns (bytes32 messageId) {
        require(msg.sender == owner, "owner");
        IRouterClient.EVM2AnyMessage memory m = _message(orderId, cap, supplier);
        uint256 fee = router.getFee(destinationSelector, m);
        require(msg.value >= fee, "fee");
        messageId = router.ccipSend{ value: fee }(destinationSelector, m);
        emit ApprovalSent(messageId, orderId, cap, supplier, fee);
        if (msg.value > fee) payable(msg.sender).transfer(msg.value - fee);
    }

    receive() external payable {}
}
