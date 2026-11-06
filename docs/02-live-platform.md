# 02 · Coquire, the live platform

Date: 2026-11-07 · Branch: `feat/coquire-v1` · Archetype: BUILD · Stakes: one-way door (money paths) · Supersedes the demo-first scope in `docs/01-coquire-build.md`.

## 1. Recommendation

Ship Coquire as one Railway service: an Express 5 API with SQLite on a volume, wallet sign-in, a server-side guard that co-signs, a real 402 supplier running tesseract.js, ECIES sealing in the browser, and server-sent events so every party sees the same order. Keep three rails behind environment variables so each goes live the moment its accounts exist: x402 settlement on Hedera testnet, Arkiv discovery on Rabdi testnet, and a CCIP treasury approval from Ethereum Sepolia. The agent key is the Hedera payer account; the wallet signs once per order.

## 2. What is live now, verified

| Piece | Evidence |
|---|---|
| Two teams in separate browsers share one order over SSE | Playwright run `scratchpad/e2e/real.mjs`: team B's join appears in team A's tab; combined volume 200 |
| Automated supplier reprices on volume and signs its quote | 0.05 USDC at 150 pages, 0.045 at 200; signature verified server-side |
| Unanimous approval, permission signatures, order start | both teams approve; permission message verified with `ethers.verifyMessage` |
| Guard as server-side co-signer | NO_DELEGATION for a team that had not signed; OVER_RATE, REPLAY, WRONG_SUPPLIER declines recorded with reasons |
| Real OCR on sealed pages | tesseract.js reads the rendered sample invoice: vendor, number, date, total, confidence 0.94, 312 ms |
| Results sealed to the agent key and decrypted in the browser | results table shows INV numbers in team A's tab |
| 200 pages, two agents, completion | 18 s wall clock, 207 settlements recorded, 0 console errors |
| Domain tests | 13 pass: money, pricing reconciliation, guard order, replay rule, lifecycle, ECIES round trip and key recovery |

Simulated until configured: the facilitator settlement itself (receipts are keccak refs, labelled), the Arkiv write (local index), the CCIP message (timer). The UI reads these flags from the server and never claims more.

## 3. Why this shape

- **The agent key is the payer.** The Hedera x402 `exact` scheme needs the payer's Hedera account signature; MetaMask cannot produce it (spec: `scheme_exact_hedera.md`). Making the team's agent key the Hedera account keeps the wallet to one signature per order and keeps the per-call path automatic.
- **The guard owns the settlement path today, the KeyList tomorrow.** Only guard-approved payments reach the facilitator. The spec supports KeyList/threshold payer accounts for `cryptoTransfer`; adding the guard as the second key of a 2-of-2 is one account-key update per team and makes the limit unforgeable on-chain.
- **SQLite on a volume, one replica.** Railway volumes forbid replicas anyway; no second service, no credentials. Postgres is a driver swap when zero-downtime deploys matter.
- **Ciphertext only on the server.** Pages are sealed in the browser for the supplier key; results are sealed by the supplier for the agent key. The server stores envelopes it cannot open.

## 4. Steelman of the rejected option: keep everything in the browser

Strongest case: zero infrastructure, nothing to host, the demo already worked. Why we still passed: a second team in a second browser could not see the order, suppliers could not quote it, and the guard key lived next to the agent key it was supposed to check. None of that is a product.

## 5. What I need from you to turn each rail live

1. **Railway**: create a service from this repo, add a volume mounted at `/data`, set `DATABASE_PATH=/data/coquire.sqlite`, `APP_ORIGIN=https://<your-domain>`, and generate `SESSION_SECRET`, `GUARD_PRIVATE_KEY`, `SUPPLIER_PRIVATE_KEY` (any three secp256k1 keys; `openssl rand -hex 32` for each). Keep replicas at 1.
2. **x402 on Hedera testnet**:
   - A Hedera testnet account for the built-in supplier, associated with USDC `0.0.429274`. Set `SUPPLIER_HEDERA_ACCOUNT_ID`. (HBAR from https://portal.hedera.com/faucet.)
   - Pick a facilitator: `X402_FACILITATOR_URL=https://x402.org/facilitator` or `https://api.testnet.blocky402.com`. No API key.
   - For each buyer team: fund the agent key's Hedera account (send HBAR to its EVM alias to auto-create it, then 20 USDC from https://faucet.circle.com, then associate USDC). I can add a one-click "fund my agent" page that shows the alias and checks association once you confirm the facilitator.
3. **Arkiv**: an access key from https://hub.arkiv.network/access-keys and an EVM key with tGLM from https://hub.arkiv.network/faucet. Set `ARKIV_ACCESS_KEY`, `ARKIV_PRIVATE_KEY`.
4. **CCIP**: a Sepolia account with ETH and LINK (https://faucets.chain.link/sepolia) as `TREASURY_PRIVATE_KEY`, and a Hedera testnet ECDSA key with HBAR as `HEDERA_DEPLOYER_PRIVATE_KEY`. Then run the three `contracts/ccip/deploy.ts` steps and set `CCIP_SENDER_ADDRESS`, `CCIP_RECEIVER_ADDRESS`.
5. **Decisions**: (a) whether human suppliers may quote (today the built-in OCR supplier is the only one with a processing endpoint; human suppliers can quote but not fulfil until they run an endpoint), (b) whether to keep the browser-key sign-in for users without MetaMask, (c) a domain and the contact address shown in the footer.

## 6. Roadmap after the keys arrive

1. Live x402: server verifies and settles through the configured facilitator; browser agent builds the partially signed TransferTransaction with `@x402/hedera`; HashScan links on every receipt. Then the 2-of-2 KeyList per team.
2. Arkiv entities for orders and quotes; Discover reads from Arkiv rather than the local index.
3. CCIP approval gate: the guard reads `approvals(orderId)` on the receiver and refuses when the cap is lower than the team limits.
4. Supplier onboarding for third parties: an endpoint template and a "verify my endpoint" check.
5. Hardening: rate limits on `/api/auth`, blob size and count caps per team, session rotation, audit export.

## 7. Grounded claims

| Claim | Source | Tier |
|---|---|---|
| Hedera exact scheme is a partially signed TransferTransaction; MetaMask cannot sign it | https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_hedera.md | supported |
| Public facilitators for hedera:testnet without keys: x402.org, Blocky402, Launa | https://docs.hedera.com/solutions/ai/x402/facilitators (live `/supported` checked by the research lens) | supported |
| `@x402/hedera` 2.30.0 published 2026-11-04; deprecated `x402` 1.x | npm registry | verified (installed; type defs read) |
| Testnet USDC `0.0.429274`, 6 decimals; Circle faucet 20 USDC per 2 h | https://developers.circle.com/stablecoins/usdc-contract-addresses, https://faucet.circle.com | supported |
| Arkiv Rabdi testnet chain id 7794095; SDK 1.0.1 | https://docs.arkiv.network/, npm registry | verified (installed) |
| CCIP lane Sepolia → Hedera testnet with routers and selectors as coded | https://docs.chain.link/ccip/directory/testnet/chain/hedera-testnet | supported |
| Railway volumes: one per service, replicas not allowed | https://docs.railway.com/reference/volumes | supported |
| tesseract.js 7.0.0 Node support; pdf-to-img 7.0.2 | npm registry; run locally | verified |
| Two-team flow completes with real OCR and decrypted results | `scratchpad/e2e/real.mjs` run on 2026-11-07 | verified |

Evidence summary: 5 verified, 5 supported, 0 unverified, 0 contradicted.

> Cross-tier verification reduces instance- and tier-level error correlation but not shared-lineage blind spots. Treat cross-tier survival as weaker evidence than grounding.

## Telemetry
- divergence: 0.81 (evidence 0.95, conclusion 0.60) | threshold 0.30 UNCALIBRATED
- grounding: n/a
- models: draft=opus · research=4 general-purpose lenses (x402, Arkiv+CCIP+ECIES, references, backend)
- claims: hedera-scheme supported · facilitators supported · x402-sdk verified · usdc-testnet supported · arkiv verified · ccip-lane supported · railway-volumes supported · ocr-stack verified · two-team-e2e verified
- fleet: 4 lenses · token-multiple vs single-pass ≈ n/a
