import { ethers } from 'ethers';
import type { Micro } from '../src/domain/money.js';

/**
 * Treasury approval over Chainlink CCIP, Ethereum Sepolia → Hedera testnet.
 * Live when CCIP_SENDER_ADDRESS (Sepolia), CCIP_RECEIVER_ADDRESS (Hedera testnet) and TREASURY_PRIVATE_KEY (Sepolia, funded with ETH + LINK) are set.
 * Contracts and deploy scripts live in contracts/ccip. Otherwise the approval is recorded locally and labelled simulated.
 *
 * Lane facts (Chainlink CCIP directory, 2026-11-07):
 *   Sepolia router 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59, selector 16015286601757825753
 *   Hedera testnet router 0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4, selector 222782988166878823
 */
export const LANE = {
  source: 'Ethereum Sepolia',
  destination: 'Hedera testnet',
  sepoliaRouter: '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59',
  hederaRouter: '0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4',
  hederaSelector: 222782988166878823n,
  sepoliaSelector: 16015286601757825753n,
  sepoliaLink: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
};

const live = !!(process.env.CCIP_SENDER_ADDRESS && process.env.CCIP_RECEIVER_ADDRESS && process.env.TREASURY_PRIVATE_KEY);

const SENDER_ABI = ['function sendApproval(bytes32 orderId, uint256 cap, address supplier) payable returns (bytes32 messageId)', 'function quoteFee(bytes32 orderId, uint256 cap, address supplier) view returns (uint256)'];
const RECEIVER_ABI = ['function approvals(bytes32 orderId) view returns (uint256 cap, address supplier, uint64 sourceChainSelector, uint256 receivedAt)'];

const orderKey = (orderId: string) => ethers.keccak256(ethers.toUtf8Bytes(orderId));

export const ccip = {
  live,
  lane: { source: LANE.source, destination: LANE.destination, simulated: !live },
  messageUrl: (id: string) => `https://ccip.chain.link/#/side-drawer/msg/${id}`,
  async request({ orderId, cap, supplier }: { orderId: string; cap: Micro; supplier: string }): Promise<{ messageId: string }> {
    if (!live) {
      return { messageId: ethers.keccak256(ethers.toUtf8Bytes(`ccip-sim:${orderId}:${cap}:${supplier}`)) };
    }
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com');
    const wallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY!, provider);
    const sender = new ethers.Contract(process.env.CCIP_SENDER_ADDRESS!, SENDER_ABI, wallet);
    const fee: bigint = await sender.quoteFee(orderKey(orderId), cap, supplier);
    const tx = await sender.sendApproval(orderKey(orderId), cap, supplier, { value: fee });
    const rc = await tx.wait();
    const log = rc.logs.find((l: { topics: string[] }) => l.topics.length > 1);
    const messageId: string = log ? log.topics[1] : tx.hash;
    return { messageId };
  },
  async waitDelivered(messageId: string, orderId?: string): Promise<void> {
    if (!live) { await new Promise((r) => setTimeout(r, 2500)); return; }
    const provider = new ethers.JsonRpcProvider(process.env.VITE_HEDERA_RPC_URL ?? 'https://testnet.hashio.io/api');
    const receiver = new ethers.Contract(process.env.CCIP_RECEIVER_ADDRESS!, RECEIVER_ABI, provider);
    const key = orderId ? orderKey(orderId) : null;
    const deadline = Date.now() + 25 * 60_000;
    while (Date.now() < deadline) {
      if (key) {
        const a = await receiver.approvals(key);
        if (a.receivedAt && a.receivedAt > 0n) return;
      }
      await new Promise((r) => setTimeout(r, 15_000));
    }
    throw new Error(`CCIP message ${messageId} not delivered within 25 minutes`);
  },
  async readApproval(orderId: string): Promise<{ cap: Micro; supplier: string } | null> {
    if (!live) return null;
    const provider = new ethers.JsonRpcProvider(process.env.VITE_HEDERA_RPC_URL ?? 'https://testnet.hashio.io/api');
    const receiver = new ethers.Contract(process.env.CCIP_RECEIVER_ADDRESS!, RECEIVER_ABI, provider);
    const a = await receiver.approvals(orderKey(orderId));
    return a.receivedAt > 0n ? { cap: a.cap, supplier: a.supplier } : null;
  },
};
