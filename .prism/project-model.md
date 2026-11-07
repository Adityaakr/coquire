# Prism project model — Coquire (repo: Vaultera)

> Code-truth layer for this repo. Created 2026-11-06 when the Vaultera product was removed and Coquire built in its place on branch `feat/coquire-v1`. Decision doc: `docs/01-coquire-build.md`.

## Architecture
- React 18 + Vite + TypeScript SPA, Tailwind with the Mocha/Verdant token set in `src/index.css`, shadcn primitives in `src/components/ui/` (pruned to what is used).
- `src/domain/`: `types.ts`, `money.ts` (bigint micro-USDC), `guard.ts` (pure verdict), `selectors.ts` (all derived totals), `reducer.ts` (actions + lifecycle), `demo.ts` (simulated teams/suppliers/order).
- `src/adapters/`: interfaces in `types.ts`, mocks in `mock.ts`, swap point `index.ts` (`VITE_LIVE_ADAPTERS`).
- `src/store/store.tsx`: React provider; persists state to localStorage (`coquire.state.v3`, bigint-safe); owns async orchestrations and simulated counterparties (join after 4s, quotes at 5.5s/8.7s, other teams approve ~2s after you, simulated teams' agents pay once active).
- `src/lib/keys.ts`: local agent / guard / demo-owner keys (ethers Wallet in localStorage).
- Routes: `/` landing; `/app` dashboard (role-aware); `/app/onboard`; `/app/orders/new`; `/app/orders/:id` (tabs Group / Quotes / Execution or Earnings); `/app/discover`; `/app/settings`.
- `server.js`: static SPA server for Railway. No API.

## Invariants (cited)
- All money is `bigint` micro-USDC; never floats. `src/domain/money.ts`.
- Totals are derived from settled payments, never stored. `src/domain/selectors.ts` (`teamBudget`, `remainingAllowance`).
- Only `settled` payments feed the replay set; declined attempts never block a retry. `src/domain/guard.ts` + test "declined attempt does not poison a retry".
- Reservation fee never reduces the per-call allowance. `remainingAllowance` ignores reservations.
- `quoted` and `expired` are derived on read (`orderStatus`), never written.
- Order `approved` only when every team approves the same quote; `completed` only when every team's calls are settled. `src/domain/reducer.ts`.
- Anything simulated is labelled Simulated in the UI (`SimTag`) and in Settings "What is real in this build".
- Landing pricing example (150/50 pages, 0.06 list, 0.045 group, 2.00 fee) is asserted by `src/test/domain.test.ts`; change both together.

## Danger zones
- `src/store/store.tsx` simulated-counterparty timers use `stateRef` and `simulate` flag; changing order status names breaks their guards.
- `STATE_VERSION` in `reducer.ts` must be bumped on any state-shape change or persisted demos load garbage.
- Removed `next-themes`; `src/components/ui/sonner.tsx` is hardcoded light.

## Decision log
- 2026-11-06 — Replace Vaultera with Coquire; demo-first with adapters; keep design tokens; delete contracts/agents/scripts. (`docs/01-coquire-build.md`)
- 2026-11-06 — CCIP lane labelled Ethereum Sepolia → Hedera testnet (simulated), not Arbitrum, per Chainlink testnet directory.
- 2026-11-06 — Headline kept as "Private group buying for API capacity" pending Aditya's call (audience lens suggested softening).

## Assumptions to check later
- Hedera x402 `exact` scheme supports a second co-signature on the payer account (threshold/KeyList) for the guard design.
- Facilitator choice and demo account funding for live wiring.

## Lessons
- A group order can never complete if simulated members have no agent; simulate every side you seed.
- 2026-11-06 (later) — Aditya: keep the Vaultera design scheme exactly on landing and app; only content changes. Landing rebuilt to the original section sequence (centered hero + preview card, trust strip, 4 numbered steps, 6 tagged feature cards, 3 example cards, Hedera split with checklist + pipeline card, supplier CTA card, FAQ as cards, final CTA, 4-column footer). App uses the original KPICard, vault-style order cards with MetricBlock and pulsing StatusPill, Overview layout with Live Activity column, 1440px shell with pill nav. Do not introduce new layout patterns; reuse these.
- 2026-11-07 — Aditya: "use this design" → https://github.com/Adityaakr/liquid-stake-vara (Vale Protocol, a 1:1 FintechX Framer port). Ported wholesale: `src/styles` tokens, `src/ui` primitives, `src/landing/fx.tsx` + `landing.css`, `src/app/app.css` + `bits.tsx`, `public/fx` images. Tailwind, shadcn, radix, framer-motion, sonner removed. Landing keeps every template section in order (hero with tile, clients ticker, before/after, features bento, overview, step switcher, security split, use-case ticker, integrations ring, stats board, testimonials ticker, pricing→worked example, FAQs, footer card); app uses the sidebar shell with Bento panels, Stat, Badge, Tabs, ap-table. Hero/overview/product screenshots are captured from the Coquire app itself into `public/fx/app-{hero,overview,portfolio}{,-m}.jpg`. Rule: never reintroduce a second styling system; new screens use `src/ui` + `src/app/kit.tsx`.
- 2026-11-07 — "No demo": the product is now a real multi-user server (`server/`): Express 5 + better-sqlite3 (action log + snapshot), EIP-4361 style sign-in (MetaMask or browser key), agent key registration with public key recovery, server-side guard co-signer, SSE, built-in 402 OCR supplier (tesseract.js + pdf-to-img), ECIES sealing (noble). x402 live path (`server/x402live.ts`, `src/lib/x402live.ts`, `scripts/agent.ts`), Arkiv (`server/arkiv.ts`), CCIP (`server/ccip.ts`, `contracts/ccip`) are env-gated and untested live until Aditya supplies accounts (list in `docs/02-live-platform.md`). Two-team Playwright flow in scratchpad `e2e/real.mjs` passes: 200 pages, real OCR, decrypted results, 0 errors.
- 2026-11-07 — Repo remote switched to https://github.com/Adityaakr/coquire.git, branch `main`. Aditya: "keep pushing the changes with small commits". Push after each landed piece; no co-author trailer.
- Invariant: `src/domain` must stay runtime-agnostic (imported by both the Vite client and the Node server); no `@/` aliases or browser APIs inside it.
- Invariant: the server stores ciphertext only; results are never in shared state (only `sealedResultRef`). Decryption happens in the browser with the agent key.
- 2026-11-07 — Arkiv is LIVE (Rabdi testnet): `.env` holds ARKIV_ACCESS_KEY + ARKIV_PRIVATE_KEY (address 0xABFE…8bF2, 10 tGLM). Orders and quotes write real entities; `scripts/arkiv-check.ts` is the probe. SDK 1.0 needs typed helpers (`dec()`, `addr()`, `bytes()`) for non-string columns. x402 goes live only when both X402_FACILITATOR_URL (set: x402.org, feePayer 0.0.9185802) and SUPPLIER_HEDERA_ACCOUNT_ID are set; `scripts/hedera-setup.ts` associates USDC and prints the id once the supplier EVM address 0x4218…1757 has HBAR. CCIP still simulated. Remote is SSH now; pushes work.
- 2026-11-07 — App shell v3 (Proteus pattern per Aditya): white typographic sidebar (Buy/Supply group, Home/Market/Wallet, bottom Docs/Switch/Settings), top bar with network pill + account chip, Home = Welcome + Balance block + "Orders in progress"/"Funded orders" lists + Get-started checklist + supply promo; `/app/wallet` holds the agent Hedera account funding steps (HBAR faucet → associate USDC → Circle faucet). Classes `px-*` in app.css. MetaMask chosen via EIP-6963 (Phantom hijacks window.ethereum); ethers provider rebuilt after chain switch. With X402 live, e2e `real.mjs` stops at payment unless the agent account is funded (expected).
- 2026-11-07 — Live x402 verified to the facilitator: browser (@x402/hedera + Buffer polyfill in main.tsx) builds the partially signed TransferTransaction, server forwards, x402.org returns `insufficient_balance: payer holds 0 of 0.0.429274` — i.e. the whole path works once agents hold USDC. Server creates agent accounts via AccountCreateTransaction (`server/hedera.ts`, operator = supplier 0.0.11348836, memo "coquire agent", maxAuto -1, 1 HBAR) and can forward USDC from the supplier (`POST /api/wallet/fund`). Supplier needs USDC from the Circle faucet (user action) to distribute.
