export type Block =
  | { t: 'p'; text: string }
  | { t: 'h2'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'code'; lang: string; code: string }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'note'; text: string };

export interface DocPage { slug: string; title: string; summary: string; blocks: Block[] }

export const DOCS: DocPage[] = [
  {
    slug: 'overview',
    title: 'What Coquire is',
    summary: 'Private group buying for API capacity, settled per call.',
    blocks: [
      { t: 'p', text: 'Coquire lets several teams buy API capacity as one order while each team keeps its own budget, its own files and its own receipts. A supplier quotes the combined volume once. Each team approves the quote, signs one permission for its agent, and the agent pays per call in USDC over x402 on Hedera. A guard co-signs every payment only when the supplier, the price, the request ID and the remaining allowance all check out.' },
      { t: 'h2', text: 'The three roles' },
      { t: 'table', head: ['Role', 'What they do', 'What they sign'], rows: [
        ['Buyer team', 'Commits pages to an order, approves one quote, sets a per-order spending limit', 'One permission per order (supplier, rate, limit)'],
        ['Supplier', 'Quotes the combined volume, offers a sample, processes sealed pages', 'Each quote; each 402 PaymentRequirements'],
        ['Agent', 'Encrypts a page, reads the 402 requirements, signs the payment, submits the sealed result reference', 'Every per-call payment, with the guard co-signature'],
      ] },
      { t: 'h2', text: 'The interoperability story' },
      { t: 'p', text: 'Nothing about an order is private to Coquire. The order and every signed quote are Arkiv entities any app can read. Payments settle through x402, so any 402-aware client can pay the same supplier. A treasury that lives on another chain approves spend through a Chainlink CCIP message that the guard reads before it co-signs. Coquire is one client for those rails, not the only one.' },
      { t: 'ul', items: [
        'Discover: Arkiv entities with an expiry equal to the offer window.',
        'Settle: x402 on Hedera, USDC, a facilitator sponsors network fees.',
        'Approve: CCIP message from Ethereum Sepolia to Hedera testnet carrying a spend cap.',
        'Seal: ECIES to the recipient address, so files never travel in the clear.',
      ] },
    ],
  },
  {
    slug: 'concepts',
    title: 'Core concepts',
    summary: 'Orders, commits, quotes, permissions, payments.',
    blocks: [
      { t: 'h2', text: 'Order' },
      { t: 'p', text: 'An order is a workload description plus a list of team commits and a list of quotes. It carries an offer window (until when suppliers may quote) and a needed-by deadline. One call processes one page.' },
      { t: 'code', lang: 'ts', code: `interface Order {
  id: string; title: string; workload: 'invoice-ocr'; description: string;
  createdBy: string;            // teamId
  teams: TeamCommit[];          // who committed how many pages, with what limit
  quotes: Quote[];              // signed supplier quotes
  offerWindowEnd: number; neededBy: number;
  approvedQuoteId?: string;     // set only when every team approved the same quote
  status: 'draft' | 'open' | 'approved' | 'active' | 'completed';
  arkivListingId?: string;      // Arkiv entity id
  ccip?: { messageId: string; status: 'pending' | 'delivered'; cap: Micro };
}` },
      { t: 'h2', text: 'Team commit' },
      { t: 'p', text: 'A commit is a team\'s share of the order: how many pages it needs and the spending limit its agent may use. The limit is the per-call allowance. The reservation fee is paid separately when the order starts and never reduces the allowance.' },
      { t: 'h2', text: 'Quote' },
      { t: 'p', text: 'A quote fixes a rate per call, a reservation fee for the whole order, a delivery window and whether a free sample is offered. The supplier signs the canonical JSON of those fields. The reservation fee is split across teams pro-rata by committed pages; the split always sums exactly to the fee.' },
      { t: 'h2', text: 'Permission' },
      { t: 'p', text: 'After the group approves a quote, each team signs one message: "pay this supplier at or below this rate, up to this limit, for this order". The agent key then signs each call without a wallet prompt. The permission is what the guard checks against.' },
      { t: 'h2', text: 'Payment' },
      { t: 'p', text: 'A payment is one call. It records the request ID, the amount, the payee, the guard verdict, the agent and guard signatures, the settlement reference and the sealed request and result references. Only settled payments count toward spend; declined ones stay in the ledger for audit.' },
      { t: 'h2', text: 'Money' },
      { t: 'p', text: 'All amounts are integers in micro-USDC (six decimals). Totals are derived from settled payments and never stored, so the budget always reconciles.' },
      { t: 'code', lang: 'ts', code: `usdc(0.045)          // 45000n
formatUSDC(6_750_000n) // "6.75 USDC"
splitProRata(usdc(2), [150, 50]) // [1_500_000n, 500_000n]` },
    ],
  },
  {
    slug: 'lifecycle',
    title: 'Order lifecycle',
    summary: 'From draft to completed, and what is derived on read.',
    blocks: [
      { t: 'code', lang: 'text', code: `draft ──list on Arkiv──▶ open ──every team approves the same quote──▶ approved
approved ──permission signed, CCIP approval delivered, reservation paid──▶ active
active ──every team's committed calls settled──▶ completed
open | quoted ──offer window passes──▶ expired (derived)
approved ──needed-by passes without start──▶ expired (derived)` },
      { t: 'p', text: 'Two states are never written: "quoted" is "open with at least one quote", and "expired" is computed from the clock when the order is read. That keeps a reloaded order from showing a stale status.' },
      { t: 'h2', text: 'Approval rule' },
      { t: 'p', text: 'Approval is unanimous: every team in the group must approve the same quote. A team may change its approval while the order is open. The first moment all approvals match, the order becomes approved and the quote is fixed.' },
      { t: 'h2', text: 'Completion rule' },
      { t: 'p', text: 'An order completes when every team has settled as many calls as it committed. A team whose agent finishes early sees "your pages are done" while the others continue.' },
    ],
  },
  {
    slug: 'guard',
    title: 'The guard',
    summary: 'Four checks, one verdict, no surprises.',
    blocks: [
      { t: 'p', text: 'The guard is a pure function. It takes the current state, the order, the approved quote, a payment proposal and whether a permission exists, and returns a verdict. The UI renders the verdict directly, so every decline says exactly why.' },
      { t: 'code', lang: 'ts', code: `type GuardVerdict =
  | { ok: true }
  | { ok: false; code: 'NO_DELEGATION' }
  | { ok: false; code: 'WRONG_SUPPLIER'; expected: string; got: string }
  | { ok: false; code: 'OVER_RATE'; approved: Micro; asked: Micro }
  | { ok: false; code: 'REPLAY'; requestId: string; firstSeenAt: number }
  | { ok: false; code: 'ALLOWANCE_EXHAUSTED'; remaining: Micro; asked: Micro };` },
      { t: 'h2', text: 'Order of checks' },
      { t: 'ul', items: [
        'Permission exists for this order.',
        'Payee equals the approved supplier.',
        'Amount is at or below the approved rate per call.',
        'Request ID has not already been settled for this order and team. Declined attempts never poison the replay set, so a legitimate retry with the same ID succeeds.',
        'Amount is at or below the remaining allowance (limit minus settled spend).',
      ] },
      { t: 'h2', text: 'Where the limit lives' },
      { t: 'p', text: 'The design is a 2-of-2 key on the team\'s payment account: the agent key and the guard key. A payment settles only with both signatures, so the limit is enforced at signing time rather than by trusting the agent. Request IDs are Coquire-side identifiers bound to the resource URL; Hedera\'s own replay protection is the transaction ID.' },
      { t: 'note', text: 'In the current build the guard key is local to the browser and settlement is simulated. The live design keeps the guard as a server-side co-signer. See "Live wiring".' },
    ],
  },
  {
    slug: 'pricing',
    title: 'Pricing math',
    summary: 'The worked example, reconciled.',
    blocks: [
      { t: 'p', text: 'Two teams commit 150 and 50 pages. The supplier lists 0.06 USDC per page and quotes 0.045 per page for 200 pages with a 2.00 USDC reservation fee.' },
      { t: 'table', head: ['Team', 'Pages', 'Alone', 'Group rate', 'Fee share', 'Total', 'Saves'], rows: [
        ['A', '150', '9.00', '6.75', '1.50', '8.25', '0.75'],
        ['B', '50', '3.00', '2.25', '0.50', '2.75', '0.25'],
        ['Supplier receives', '200', '12.00', '9.00', '2.00', '11.00', ''],
      ] },
      { t: 'p', text: 'Agent limits: A sets 6.75, B sets 2.25. If B\'s agent processes only 40 pages it pays 1.80 and 0.45 never leaves B\'s account. The reservation fee is released to the supplier when the order starts and is not refundable.' },
      { t: 'code', lang: 'ts', code: `teamCostAtQuote(order, quote, 'team_a')
// { calls: 6_750_000n, reservation: 1_500_000n, total: 8_250_000n }
reservationShares(order, quote)
// { team_a: 1_500_000n, team_b: 500_000n }   // sums exactly to the fee` },
    ],
  },
  {
    slug: 'privacy',
    title: 'What is public, what is sealed',
    summary: 'Terms are public. Files are not.',
    blocks: [
      { t: 'table', head: ['Data', 'Who can read it', 'Where'], rows: [
        ['Order terms, combined volume, deadline', 'Everyone', 'Arkiv entity'],
        ['Signed quotes', 'Everyone', 'Arkiv entity'],
        ['Team addresses and funded balances', 'Everyone', 'Hedera'],
        ['Per-call USDC payments and amounts', 'Everyone', 'Hedera'],
        ['Invoice pages', 'Approved supplier only', 'Sealed blob, reference in the 402 request'],
        ['OCR results', 'The paying team only', 'Sealed blob, reference in the supplier response'],
      ] },
      { t: 'p', text: 'Call counts and timing are visible on the ledger even though contents are not. State that plainly to buyers.' },
    ],
  },
  {
    slug: 'live-wiring',
    title: 'Live wiring',
    summary: 'What runs for real today, what each rail needs, and the exact environment variables.',
    blocks: [
      { t: 'p', text: 'Coquire is a real multi-user server. Two teams in different browsers see the same order through server-sent events; every mutation is authorised against the signed-in account and applied through the same pure reducer the tests cover. The pieces below are live in every deployment with no configuration.' },
      { t: 'table', head: ['Piece', 'How it is real'], rows: [
        ['Sign-in', 'EIP-4361 shaped message signed by MetaMask or a browser-held secp256k1 key; nonce checked server-side; httpOnly session cookie.'],
        ['Agent key', 'Generated in the browser, bound to the account with its own signature; its public key is recovered server-side and used as the sealing target for results.'],
        ['Guard', 'Pure function on the server over canonical state. A server-held key co-signs only when all four checks pass. Declined attempts are recorded with their reason.'],
        ['Sealing', 'ECIES over secp256k1 (ECDH, HKDF-SHA256, AES-256-GCM). Pages are sealed in the browser for the supplier; results are sealed by the supplier for the agent key. The server stores ciphertext only.'],
        ['Supplier', 'A 402 resource server at /supplier/v1/pages/:requestId. It runs tesseract.js on the sealed page and seals the result back. Any x402 client can call it.'],
        ['Discovery and state', 'SQLite on a Railway volume; action log plus snapshot; SSE broadcast on every change.'],
      ] },
      { t: 'h2', text: 'x402 settlement on Hedera testnet' },
      { t: 'p', text: 'The accepted scheme is "exact" on network "hedera:testnet": the payer signs a partially signed Hedera TransferTransaction and a facilitator adds the fee-payer signature and submits it. MetaMask cannot produce that signature. The payer must be a Hedera account whose key the agent holds, which is exactly what the agent key is. Public facilitators that support hedera:testnet without an API key, as listed in the Hedera docs: x402.org, Blocky402 testnet, Launa testnet.' },
      { t: 'code', lang: 'sh', code: `# server
X402_FACILITATOR_URL=https://x402.org/facilitator     # or https://api.testnet.blocky402.com
SUPPLIER_HEDERA_ACCOUNT_ID=0.0.xxxxxx                 # built-in supplier payout; must be associated with USDC 0.0.429274
# agent (per team) — a Hedera account controlled by the team's agent key
#   create: send HBAR to the agent key's EVM alias from https://portal.hedera.com/faucet (auto-creates the account)
#   fund:   https://faucet.circle.com → Hedera Testnet, 20 USDC / 2 h
#   associate USDC 0.0.429274 to the account (one transaction, needs a little HBAR)` },
      { t: 'ul', items: [
        'Packages: @x402/core, @x402/fetch, @x402/express, @x402/hedera (2.30.x, published 2026-11-04). The deprecated x402 and x402-express 1.x packages are not used.',
        'Testnet USDC token id 0.0.429274, 6 decimals (Circle). Payer and payee must both be associated or settlement fails with TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.',
        'The guard today gates the settlement path: only guard-approved payments reach the facilitator. A 2-of-2 KeyList on the payer account (agent + guard) is supported by the scheme and is the next step; it needs one account key update per team.',
        'The Node agent in scripts/agent.ts pays the supplier endpoint directly with @x402/fetch, proving the endpoint works for any client.',
      ] },
      { t: 'h2', text: 'Arkiv discovery' },
      { t: 'p', text: 'Arkiv is an Ethereum-compatible DB-chain from the Golem ecosystem. Public testnet "Rabdi", chain id 7794095, two-second blocks, writes paid in test GLM. SDK @arkiv-network/sdk 1.0.1 (viem peer). Orders and quotes are written as typed entities with an expiry equal to the offer window.' },
      { t: 'code', lang: 'sh', code: `ARKIV_ACCESS_KEY=...        # https://hub.arkiv.network/access-keys
ARKIV_PRIVATE_KEY=0x...     # EVM key funded with tGLM from https://hub.arkiv.network/faucet
# explorer: https://rabdi.explorer.arkiv.network` },
      { t: 'h2', text: 'Chainlink CCIP treasury approval' },
      { t: 'p', text: 'Lane Ethereum Sepolia → Hedera testnet exists in the CCIP directory with arbitrary messaging. contracts/ccip holds ApprovalSender (Sepolia) and ApprovalReceiver (Hedera). The guard reads approvals(orderId) on the receiver before co-signing when CCIP is live.' },
      { t: 'code', lang: 'sh', code: `npx tsx contracts/ccip/deploy.ts receiver     # HEDERA_DEPLOYER_PRIVATE_KEY, HBAR from https://portal.hedera.com/faucet
CCIP_RECEIVER_ADDRESS=0x... npx tsx contracts/ccip/deploy.ts sender   # TREASURY_PRIVATE_KEY, Sepolia ETH + LINK from https://faucets.chain.link/sepolia
CCIP_SENDER_ADDRESS=0x... npx tsx contracts/ccip/deploy.ts allow
# Routers: Sepolia 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59 · Hedera testnet 0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4
# Message explorer: https://ccip.chain.link/#/side-drawer/msg/<messageId>` },
      { t: 'h2', text: 'Deployment' },
      { t: 'p', text: 'One Railway service with a volume mounted at /data. Build: npm ci && npm run build. Start: npm start (tsx server/index.ts). Health: /api/health. Replicas must stay at one because SQLite lives on the volume. Required env: SESSION_SECRET, GUARD_PRIVATE_KEY, SUPPLIER_PRIVATE_KEY, APP_ORIGIN, DATABASE_PATH. Everything else is optional and turns a simulated rail live.' },
      { t: 'note', text: 'Settings in the app shows "What is live in this deployment", read from the server, so the UI never claims more than the server is configured for.' },
    ],
  },
  {
    slug: 'interoperability',
    title: 'Interoperability',
    summary: 'Why the order lives on public rails, and what that buys each party.',
    blocks: [
      { t: 'p', text: 'A group order is a contract between parties that do not share a budget, a database or a vendor account. If the order lived only inside Coquire, every party would have to trust Coquire with its money and its files. Putting each part of the order on a rail that the party can verify on its own removes that trust.' },
      { t: 'table', head: ['Rail', 'What it holds', 'Who verifies it without Coquire'], rows: [
        ['Arkiv', 'The order terms and every signed quote, with an expiry', 'Any app that reads Arkiv entities; suppliers can find demand without an account'],
        ['x402 on Hedera', 'Each per-call payment, settled in USDC with a transaction id', 'The supplier, the buyer, and anyone with HashScan'],
        ['Chainlink CCIP', 'A treasury approval from another chain: order, cap, supplier', 'The guard on Hedera reads the receiver contract; the treasury reads the CCIP explorer'],
        ['ECIES', 'Pages and results, sealed to one recipient key each', 'Only the recipient can open them; the server cannot'],
        ['Signatures', 'Quotes, permissions, per-call payments', 'Anyone with the public keys; they are plain secp256k1 signatures over canonical JSON'],
      ] },
      { t: 'h2', text: 'What this buys' },
      { t: 'ul', items: [
        'Suppliers can quote demand they discovered elsewhere and get paid by clients that never open Coquire.',
        'Buyers can switch client without losing the order: the quote, the permission and the ledger are all reconstructible from the rails.',
        'A treasury can stay on the chain it already lives on and still bound what agents spend on Hedera.',
        'Auditors get a ledger where every settled call has a receipt and every decline has a reason, without reading private files.',
      ] },
      { t: 'h2', text: 'The agent is the payer' },
      { t: 'p', text: 'On Hedera the x402 "exact" scheme is signed by the payer\'s Hedera account key. Coquire makes the team\'s agent key that account. The wallet signs one permission; the agent signs every call; the guard co-signs. That keeps the wallet out of the per-call path and keeps the spending limit enforceable at signing time.' },
    ],
  },
  {
    slug: 'running',
    title: 'Running locally',
    summary: 'Install, run, test.',
    blocks: [
      { t: 'code', lang: 'sh', code: `npm install
npm run dev        # http://localhost:8080
npm test           # domain tests: money, guard, budget, lifecycle
npm run build && npm start` },
      { t: 'p', text: 'Copy .env.example to .env to change the Hedera RPC. The demo needs no keys. Reset everything from Settings.' },
    ],
  },
];
