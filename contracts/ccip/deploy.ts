/**
 * Deploy the CCIP approval contracts.
 *   1. Receiver on Hedera testnet:  npx tsx contracts/ccip/deploy.ts receiver
 *   2. Sender on Ethereum Sepolia:  CCIP_RECEIVER_ADDRESS=0x... npx tsx contracts/ccip/deploy.ts sender
 *   3. Allow the sender on the receiver: CCIP_SENDER_ADDRESS=0x... npx tsx contracts/ccip/deploy.ts allow
 * Needs: TREASURY_PRIVATE_KEY (Sepolia, ETH for gas + fees), HEDERA_DEPLOYER_PRIVATE_KEY (Hedera testnet ECDSA key with HBAR), solc installed (npm i -D solc).
 */
import { readFileSync } from 'node:fs';
import { ethers } from 'ethers';
import solc from 'solc';

const SEPOLIA_ROUTER = '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59';
const HEDERA_ROUTER = '0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4';
const HEDERA_SELECTOR = 222782988166878823n;
const SEPOLIA_SELECTOR = 16015286601757825753n;

function compile(name: string) {
  const source = readFileSync(new URL(`./${name}.sol`, import.meta.url), 'utf8');
  const input = { language: 'Solidity', sources: { [`${name}.sol`]: { content: source } }, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if (out.errors?.some((e: { severity: string }) => e.severity === 'error')) throw new Error(JSON.stringify(out.errors, null, 2));
  const c = out.contracts[`${name}.sol`][name];
  return { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object };
}

const mode = process.argv[2];
if (mode === 'receiver') {
  const provider = new ethers.JsonRpcProvider(process.env.VITE_HEDERA_RPC_URL ?? 'https://testnet.hashio.io/api');
  const wallet = new ethers.Wallet(process.env.HEDERA_DEPLOYER_PRIVATE_KEY!, provider);
  const { abi, bytecode } = compile('ApprovalReceiver');
  const f = new ethers.ContractFactory(abi, bytecode, wallet);
  const c = await f.deploy(HEDERA_ROUTER, SEPOLIA_SELECTOR, { gasLimit: 3_000_000 });
  await c.waitForDeployment();
  console.log('CCIP_RECEIVER_ADDRESS=' + (await c.getAddress()));
} else if (mode === 'sender') {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY!, provider);
  const { abi, bytecode } = compile('ApprovalSender');
  const f = new ethers.ContractFactory(abi, bytecode, wallet);
  const c = await f.deploy(SEPOLIA_ROUTER, HEDERA_SELECTOR, process.env.CCIP_RECEIVER_ADDRESS!);
  await c.waitForDeployment();
  console.log('CCIP_SENDER_ADDRESS=' + (await c.getAddress()));
} else if (mode === 'allow') {
  const provider = new ethers.JsonRpcProvider(process.env.VITE_HEDERA_RPC_URL ?? 'https://testnet.hashio.io/api');
  const wallet = new ethers.Wallet(process.env.HEDERA_DEPLOYER_PRIVATE_KEY!, provider);
  const c = new ethers.Contract(process.env.CCIP_RECEIVER_ADDRESS!, ['function setAllowedSender(address)'], wallet);
  const tx = await c.setAllowedSender(process.env.CCIP_SENDER_ADDRESS!);
  await tx.wait();
  console.log('allowed sender set', tx.hash);
} else {
  console.log('usage: deploy.ts receiver | sender | allow');
}
