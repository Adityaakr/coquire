# 01 · Coquire v1 — build decision doc

Date: 2026-11-06 · Branch: `feat/coquire-v1` · Archetype: BUILD · Mode: looped (converged after round 1) · Stakes: two-way door (demo-first, no real funds move)

## 1. Recommendation

Replace the Vaultera product in this repo with Coquire, a two-sided demo of private group buying for API capacity, built as a React + Vite SPA on the existing Mocha/Verdant design system. One account, two modes (Buyer / Supplier). The order page is the product's spine with three tabs (Group, Quotes, Execution or Earnings). All integrations (x402 settlement, Arkiv, CCIP, encryption, supplier OCR) sit behind adapter interfaces and ship as labelled mocks; wallet connection and every signature are real. Domain logic is a pure reducer over `bigint` micro-USDC with derived totals and a pure guard that returns a discriminated verdict.

## 2. Why

- **Flow before demo path.** The UX lens and a standing user rule both say first-run must work for a real buyer with zero orders. Onboarding, empty dashboard, New order, and Discover were built before any seeding; sample data loads at onboarding and is labelled Simulated.
- **Derived money, never stored.** Budget, allowance, reservation shares and refundable balance are selectors over settled payments (`src/domain/selectors.ts`). This is what makes the landing-page pricing table and the app's numbers reconcile exactly (`src/test/domain.test.ts`, "pricing example reconciles").
- **Honest surface for an insider audience.** The audience lens found claims a Hedera/x402 engineer would push back on. Applied in the same pass: facilitator named and its fee sponsorship stated; spending-limit placement explained (2-of-2 agent + guard key, guard simulated); "request ID" scoped as Coquire-side and bound to the resource URL; CCIP preview relabelled as a simulated Ethereum Sepolia lane; every receipt badged Simulated; "negotiate volume rates" softened to "get volume quotes"; "verify balances" softened to "see funded balances".

## 3. Steelman of the rejected option: real x402 settlement on Hedera testnet now

Strongest case: judges who click a receipt and land on a real HashScan transaction trust everything else; public facilitators (x402.org, Launa, Blocky402) advertise `hedera:testnet` with no API key; the signing plumbing (ethers v6, canonical JSON) is already in place. Why we still passed for v1: it needs funded testnet USDC accounts for two teams, a real supplier endpoint honouring 402, and a facilitator client whose exact scheme payload (Hedera `exact`: partially signed TransferTransaction, fee-payer co-signature) has to be verified against the current spec. That is a one-day task on its own and would have crowded out the flow. The adapter boundary (`src/adapters/index.ts`) keeps it a contained follow-up.

## 4. Assumptions and falsifiers

- 1 API call = 1 page. If a supplier bills per document or per token, the pricing model needs a unit field on the order.
- The group must approve one quote unanimously. If the product wants majority approval or per-team supplier choice, `APPROVE_QUOTE` in the reducer changes.
- Reservation fee is per order, split pro-rata by committed pages. If suppliers quote per-team fees, `reservationShares` changes.
- Guard check order supplier → rate → replay → allowance is a UX choice, not a security one; any order is safe because all four must pass.
- The 2-of-2 key design is stated, not implemented. If Hedera's x402 `exact` scheme cannot carry a second signature for the account in use, the live design moves to a HIP-336 allowance or a `transferExecutor` path. (Audience lens, see spec link below.)

## 5. Open questions for Aditya

- Headline: keep "Private group buying" (your positioning) or soften to "Group buying with encrypted workloads"? The audience lens rated "private" a SOFTEN because call counts and amounts are public on Hedera. I kept your headline and made the privacy section precise.
- Which facilitator for live wiring, and who funds the two demo team accounts?
- Should the simulated second team be replaceable by a real second browser session (invite link already copies the order URL)?

## 6. Grounded claims

| Claim | Evidence | Tier |
|---|---|---|
| Hedera testnet JSON-RPC `https://testnet.hashio.io/api`, chain 296 / `0x128` | https://docs.hedera.com/hedera/tutorials/more-tutorials/json-rpc-connections/hashio ; `src/config/hedera.ts` | verified |
| ethers v6 `BrowserProvider`, `getSigner()`, `signMessage`, `parseUnits` | https://docs.ethers.org/v6/getting-started/ ; used in `src/lib/keys.ts`, `src/store/store.tsx` | verified |
| Hedera x402 `exact` scheme: facilitator adds fee-payer signature; threshold/KeyList accounts contemplated | https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_hedera.md | supported |
| Public facilitators advertise `hedera:testnet` | https://docs.hedera.com/solutions/ai/x402/facilitators | supported |
| CCIP testnet directory lists Hedera Testnet with a Sepolia lane, not Arbitrum Sepolia | https://docs.chain.link/ccip/directory/testnet/chain/hedera-testnet | supported |
| Arkiv entities carry expiry (BTL) | https://arkiv-network.github.io/documentation/overview/what-is-an-entity | supported |
| Pricing example reconciles (A 8.25 + B 2.75 = 11.00 = 9.00 + 2.00) | `src/test/domain.test.ts` passes | verified |
| Full buyer flow completes: 150/150 pages, 6.75/6.75 USDC, 3 declines, 0 console errors; state survives reload | Playwright run against dev server (scratchpad `e2e/flow.mjs`, `persist.mjs`) | verified |

Evidence summary: 4 verified, 4 supported, 0 unverified, 0 contradicted.

> Cross-tier verification reduces instance- and tier-level error correlation but not shared-lineage blind spots. Treat cross-tier survival as weaker evidence than grounding.

## Changelog

Round 1 critique folded in: order completion blocked because the simulated team had no agent (fixed: simulated teams' agents pay in the background once active); zero-unused state now explicit; batch run of 25 pages added so the ledger is watchable. No claims fell. Open risk: live x402 payload shape unverified against a running facilitator.

## Telemetry
- divergence: 0.73 (evidence 1.00, conclusion 0.33) | threshold 0.30 UNCALIBRATED
- grounding: n/a
- models: draft=opus · skeptics=none (two-way door; grounding verify only)
- claims: hedera-rpc grounded · ethers-v6 grounded · pricing-reconciles grounded · e2e-flow grounded · x402-exact-scheme supported · facilitators supported · ccip-lane supported · arkiv-expiry supported
- fleet: 3 lenses (UX/flow, practitioner, audience) · token-multiple vs single-pass ≈ n/a
