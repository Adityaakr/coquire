<p align="center">
  <img src="./public/logo.svg" alt="Coquire" width="72" height="72" />
</p>
<h1 align="center">Coquire</h1>
<p align="center"><strong>Private group buying for API capacity</strong></p>
<p align="center">Teams pool demand for an API workload. A supplier quotes the combined volume once. Each team's agent pays per call in USDC over x402 on Hedera, under a spending limit the team signed and a guard enforces. Workloads travel sealed; results come back sealed.</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#how-an-order-works">How an order works</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#the-guard">The guard</a> ·
  <a href="#pricing-model">Pricing</a> ·
  <a href="#privacy-model">Privacy</a> ·
  <a href="#api">API</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#deploying">Deploying</a>
</p>

---

## Table of contents

- [Why](#why)
- [What is live](#what-is-live)
- [Quick start](#quick-start)
- [How an order works](#how-an-order-works)
- [Architecture](#architecture)
  - [System diagram](#system-diagram)
  - [Keys and who signs what](#keys-and-who-signs-what)
  - [Per-call payment path](#per-call-payment-path)
  - [Domain model](#domain-model)
  - [Server](#server)
  - [Client](#client)
  - [Data on disk](#data-on-disk)
- [The guard](#the-guard)
- [Pricing model](#pricing-model)
- [Privacy model](#privacy-model)
- [Rails and interoperability](#rails-and-interoperability)
  - [Hedera and x402](#hedera-and-x402)
  - [Arkiv](#arkiv)
  - [Chainlink CCIP](#chainlink-ccip)
- [API](#api)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deploying](#deploying)
- [Repository layout](#repository-layout)
- [Design system](#design-system)
- [Security notes and known limits](#security-notes-and-known-limits)
- [Roadmap](#roadmap)
- [References](#references)

## Why

Small teams buy API capacity (OCR, transcription, embeddings, model inference) at list price because none of them alone reaches a volume tier. Enterprises negotiate. Everyone else pays retail.

Coquire lets teams that do not know each other combine volume for one workload and get one quote on the total, without sharing their data with each other or with Coquire. Each team keeps its own budget, its own files, and its own results. The supplier sees combined demand and funded balances before quoting, so quotes are real. Payment is per call, so nobody prepays for capacity they never use.

## What is live

Everything in the product path runs for real on testnets. Nothing is a mock with a fake receipt.

| Piece | Status | Where |
|---|---|---|
| Sign-in with MetaMask on Hedera testnet, or a browser-held key | Live | `server/auth.ts`, `src/lib/wallet.ts` |
| Agent key registration with public key recovery from the sign-in signature | Live | `server/routes.ts` (`/auth/verify`) |
| Multi-user shared state over server-sent events, SQLite action log | Live | `server/state.ts`, `server/sse.ts`, `server/db.ts` |
| ECIES sealing of pages for the supplier and of results for the agent | Live | `src/lib/ecies.ts` |
| Guard: five checks, server-side co-signature, decline reasons in the ledger | Live | `src/domain/guard.ts`, `server/rail.ts` |
| Built-in OCR supplier as an x402 resource server (tesseract.js) | Live | `server/supplier/` |
| Automatic volume quotes signed by the supplier key | Live | `server/supplier/routes.ts` |
| x402 settlement in USDC on Hedera testnet through a public facilitator | Live when configured | `server/x402live.ts`, `src/lib/x402live.ts` |
| Agent account creation and funding on Hedera from the supplier treasury | Live when configured | `server/hedera.ts`, `/app/wallet` |
| Order and quote discovery as Arkiv entities (Rabdi testnet) | Live when configured | `server/arkiv.ts` |
| Chainlink CCIP treasury approval, Ethereum Sepolia to Hedera testnet | Contracts ready, simulated until deployed | `contracts/ccip/`, `server/ccip.ts` |

The Settings page in the app reads these flags from the server and labels anything simulated. The server never reports a receipt as live unless the facilitator settled it.

## Quick start

Requirements: Node 22 or newer.

```bash
git clone https://github.com/Adityaakr/coquire.git
cd coquire
npm install
cp .env.example .env          # defaults run with no keys; settlement and discovery are simulated
npm run dev:server            # API and supplier on :3000; generates dev secrets into ./data
npm run dev                   # Vite on :8080, proxies /api and /supplier
```

Open http://localhost:8080/app. Sign in with a browser key, name your team, and you are on the dashboard.

To act as a second team, open a second browser profile (or an incognito window) and sign in there. Each profile holds its own agent key, so each is a separate team with a separate balance.

Production build:

```bash
npm run build && npm start    # one process serves dist/ and the API on PORT (default 3000)
```

Other scripts: `npm test` (domain and crypto tests), `npm run typecheck`, `npm run lint`.

## How an order works

The order page is the spine of the product. It has three tabs: Group, Quotes, and Execution (Earnings for a supplier). A stepper at the top shows the four stages.

1. **List.** A team describes the workload (today: invoice OCR, one call per page), commits a page count, and sets its agent's spending limit. The order is written to Arkiv with an expiry equal to the offer window. Nothing but the terms and the combined volume leaves the browser.
2. **Join.** Other teams find the order in the Market and join with their own page count and limit. Everyone on the order sees the combined volume update live over SSE.
3. **Quote.** Suppliers see combined volume and funded balances and quote once on the total: a rate per call, an optional reservation fee for the whole order, and a delivery window. The built-in OCR supplier quotes automatically from a volume tier table and signs its quote. Every team approves the same quote; approval is unanimous or the order does not proceed.
4. **Permit.** Each team signs one permission message with its wallet: this supplier, this rate, this allowance, this order. That is the only wallet signature per order. The guard will refuse any payment that does not match it.
5. **Start.** The reservation fee, if any, is split by committed pages and paid at start. The order becomes active.
6. **Pay per call.** Each team's agent uploads pages, seals them for the supplier's key, and calls the supplier's 402 endpoint. The supplier answers with payment requirements. The agent signs a USDC transfer for exactly one call, the guard checks it and co-signs, the facilitator settles it on Hedera, the supplier runs OCR and returns the result sealed for the agent's key. The agent decrypts in the browser. Each settled call gets a HashScan receipt in the ledger.
7. **Complete.** When every team's committed calls have settled, the order completes. Unspent allowance was never moved, so there is nothing to refund.

The Execution tab also has a "prove the guard" panel: three buttons send deliberately bad requests (supplier asks more than the approved rate, a replayed request id, a wrong payee) and the ledger records each decline with its reason.

## Architecture

### System diagram

```
┌────────────────────────── Browser (per team) ───────────────────────────┐
│  React SPA                                                              │
│  ├─ wallet sign-in (MetaMask via EIP-6963, or browser key)              │
│  ├─ agent key (localStorage)  → signs every per-call payment           │
│  ├─ ECIES: seal pages → supplier key · open results ← agent key         │
│  ├─ @x402/hedera: builds partially signed USDC TransferTransaction      │
│  └─ store: REST + SSE subscription, derived totals from src/domain      │
└───────────────┬──────────────────────────────┬──────────────────────────┘
                │ /api (JSON, httpOnly JWT)     │ /supplier/v1 (x402 402 handshake)
┌───────────────▼──────────────────────────────▼──────────────────────────┐
│  Express 5 server (one process)                                         │
│  ├─ auth: nonce → EIP-4361 style message → ethers.verifyMessage         │
│  ├─ state host: reducer over an action log, snapshot, SSE broadcast     │
│  ├─ guard co-signer: src/domain/guard + GUARD_PRIVATE_KEY               │
│  ├─ rail: forwards guard-approved payments to the facilitator           │
│  ├─ built-in supplier: 402 resource server, tesseract.js OCR,           │
│  │   signed volume quotes, results sealed for the agent                 │
│  ├─ hedera: AccountCreate for agents, USDC funding from the treasury    │
│  ├─ arkiv: order and quote entities with expiry                         │
│  └─ ccip: approval gate (simulated until contracts are deployed)        │
│  SQLite: accounts · actions · state snapshot · blobs (ciphertext only)  │
│          · settlements                                                  │
└───────┬───────────────────┬───────────────────────┬─────────────────────┘
        │                   │                       │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────────▼─────────────────────┐
│ x402 facilitator│  │ Arkiv Rabdi    │  │ Chainlink CCIP                  │
│ x402.org        │  │ testnet        │  │ Sepolia ApprovalSender →        │
│ verify + settle │  │ entities with  │  │ Hedera ApprovalReceiver         │
│ fee sponsored   │  │ BTL expiry     │  │ (treasury cap per order)        │
└───────┬────────┘  └────────────────┘  └─────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────────────┐
│ Hedera testnet · USDC 0.0.429274 · agent accounts → supplier account    │
│ every settlement is a real transaction on HashScan                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Keys and who signs what

| Key | Lives | Signs | Why it is separate |
|---|---|---|---|
| Sign-in key (MetaMask or browser key) | user's wallet or localStorage | the sign-in message, one permission per order | one human signature per order, never per call |
| Agent key | localStorage of the browser that onboarded | every per-call payment; decrypts results | the Hedera `exact` scheme needs the payer account's signature, which MetaMask cannot produce; the agent key *is* the Hedera payer account |
| Guard key | server, `GUARD_PRIVATE_KEY` | co-signs payments that pass all five checks | only guard-approved payments reach the facilitator |
| Supplier key | server, `SUPPLIER_PRIVATE_KEY` | quotes, result envelopes; operator of the supplier Hedera account | quotes are verifiable; pages are sealed to this key |
| Arkiv key | server, `ARKIV_PRIVATE_KEY` | entity writes on Rabdi testnet | pays tGLM for storage |
| Treasury key | server, `TREASURY_PRIVATE_KEY` | CCIP approval messages from Sepolia | a finance team's chain can cap spend on another chain |

The agent's public key is recovered from the sign-in signature at `/api/auth/verify` and stored with the account, so anyone (the supplier, another team) can seal data to it without a key exchange step.

### Per-call payment path

```
agent                     Coquire server                 supplier (402)           facilitator        Hedera
  │  upload sealed page ──▶ blobs (ciphertext)                                                           
  │  POST /supplier/v1/pages/:requestId  ─────────────▶  402 + requirements                              
  │  ◀──────────────────────────────────────────────────  {exact, USDC, amount, payTo, feePayer}         
  │  sign TransferTransaction (agent key)                                                                 
  │  POST /api/orders/:id/pay {proposal, agentSig, x402Payload}                                           
  │                           guard(state, order, quote, proposal, hasDelegation)                        
  │                           ├─ declined → ledger event with reason, 4xx                                 
  │                           └─ ok → guard signs → rail.settle ─────────────────▶ verify ──▶ settle ──▶ tx
  │                           record settlement (tx id)                            ◀────────────────────  
  │                           supplier OCR on the sealed page → result sealed for agent key               
  │  ◀── { settled, txRef, hashscan, sealedResultRef }                                                    
  │  openJson(result, agent key) → row in the results table                                               
```

Each request id is bound to the resource URL and to the order, so a payment signed for one page cannot be replayed for another, and a payment for one supplier cannot be redirected to a different payee.

### Domain model

`src/domain/` is pure TypeScript shared by the browser and the server. It has no runtime dependencies, no `@/` aliases, and no browser APIs, so the same reducer and the same guard run on both sides.

| File | What it holds |
|---|---|
| `types.ts` | `Team`, `Supplier`, `Order`, `TeamCommit`, `Quote`, `Payment`, `LedgerEvent`, `GuardVerdict`, `CoquireState` |
| `money.ts` | all money is `bigint` micro-USDC (6 decimals); `usdc('0.045')`, `fmt`, arithmetic helpers. No floats anywhere in a money path |
| `guard.ts` | the pure verdict function and the check order, plus `describeVerdict` for ledger text |
| `selectors.ts` | every derived number: combined volume, `teamBudget`, `remainingAllowance`, reservation shares, `settledPayments`, `supplierEarnings`, `orderStatus` |
| `reducer.ts` | the action vocabulary and the lifecycle; `STATE_VERSION` for persisted snapshots |

Invariants the code keeps:

- Totals are derived from settled payments, never stored. Budget, allowance, reservation shares, and completion are all selectors.
- Only settled payments feed the replay set. A declined attempt never blocks a retry.
- The reservation fee never reduces the per-call allowance.
- `quoted` and `expired` are derived on read from quotes and the offer window; the stored status is one of `draft | open | approved | active | completed`.
- An order is `approved` only when every team approved the same quote, and `completed` only when every team's committed calls are settled.

### Server

One Express 5 process. Routes are in `server/routes.ts` (mounted at `/api`) and `server/supplier/routes.ts` (mounted at `/supplier`). In production the same process serves `dist/`.

| Module | Role |
|---|---|
| `server/auth.ts` | nonce issue, message verification, httpOnly JWT cookie (jose), `requireAuth` |
| `server/db.ts` | better-sqlite3 schema and the secrets store (dev secrets are generated into `./data` on first run) |
| `server/state.ts` | applies actions through the shared reducer, appends to the action log, keeps a snapshot, broadcasts |
| `server/sse.ts` | `/api/events` subscribers; every state change is pushed to every signed-in browser |
| `server/rail.ts` | `settle` (live through the facilitator, otherwise a labelled simulated reference), `recordExternal`, `verifySettlement` |
| `server/x402live.ts` | facilitator client over `@x402/core`: reads `/supported` for the fee payer, builds `exact` requirements, verify-then-settle |
| `server/hedera.ts` | `createAgentAccount` (AccountCreateTransaction with the agent's ECDSA key as alias, unlimited automatic token associations, small HBAR float), `sendUsdc`, mirror-node reads |
| `server/arkiv.ts` | `coquire_orders` and `coquire_quotes` schemas, entity writes with expiry, explorer links |
| `server/ccip.ts` | lane constants, approval read, simulated approval timer when contracts are not deployed |
| `server/supplier/routes.ts` | the built-in supplier: profile, volume tiers, signed auto-quotes, `POST /supplier/v1/pages/:requestId` 402 handshake, `GET /supplier/v1/sample` |
| `server/supplier/ocr.ts` | tesseract.js worker over a page image (pdf-to-img for PDFs) |

### Client

React 18, Vite, TypeScript, plain CSS. No Tailwind, no component library.

| Path | Role |
|---|---|
| `src/api/client.ts` | fetch wrapper with credentials, SSE subscription |
| `src/store/store.tsx` | the provider: sign-in modes, onboarding, orders, `payForPage`, `runAgent` loop, toasts; all totals come from `src/domain/selectors` |
| `src/lib/wallet.ts` | EIP-6963 provider discovery (picks MetaMask even when another extension owns `window.ethereum`), chain switch to Hedera testnet, provider rebuild after switch |
| `src/lib/keys.ts` | agent, guard, and browser-owner keys in localStorage |
| `src/lib/ecies.ts` | ECIES over secp256k1: ephemeral key, ECDH, HKDF-SHA256, AES-256-GCM; envelope `0x01 | ephemeral pubkey | nonce | ciphertext+tag`; `recoverPublicKey` from any signature |
| `src/lib/pages.ts` | PDF to page images in the browser (pdfjs-dist) before sealing |
| `src/lib/x402live.ts` | `@x402/hedera` ExactHederaScheme with a signer built from the agent key; Buffer polyfill is installed in `src/main.tsx` |
| `src/lib/hedera.ts` | agent account status from the mirror node, USDC association from the browser |
| `src/app/` | `AppLayout` (sidebar shell, top bar, sign-in), `OverviewPage` (Home), `DiscoverPage` (Market), `WalletPage`, `NewOrderPage`, `OrderPage`, `OnboardPage`, `SettingsPage`, shared `kit.tsx` |
| `src/landing/` | marketing site: `Hero`, `Sections`, `Rails` (use cases, how it works, built on, privacy flow), `ProductPage`, `UseCasesPage`, `Closing`, `Nav`, `Mark` |
| `src/docs/` | developer docs rendered at `/docs/:slug`: overview, concepts, lifecycle, guard, pricing, privacy, live-wiring, interoperability, running |

Routes: `/` landing, `/product`, `/use-cases`, `/docs/:slug`, `/app` (Home), `/app/discover` (Market), `/app/wallet`, `/app/orders/new`, `/app/orders/:id`, `/app/onboard`, `/app/settings`.

### Data on disk

SQLite at `DATABASE_PATH` (default `./data/coquire.sqlite`; on Railway, the mounted volume).

| Table | Contents |
|---|---|
| `accounts` | sign-in address, team or supplier profile, agent address and agent public key |
| `nonces` | one-time sign-in nonces |
| `actions` | append-only action log (actor, type, JSON, time); the state is a fold over this |
| `state` | the latest snapshot and its `STATE_VERSION` |
| `blobs` | sealed pages and sealed results, by reference, with the address they are sealed for. The server cannot open them |
| `settlements` | tx reference, request id, amount, payer, payee, network, simulated flag |
| `settings` | generated dev secrets when env vars are absent |

## The guard

The guard is a pure function: `guard(state, order, quote, proposal, hasDelegation)` returns `{ ok: true }` or a typed decline. It runs on the server before any payment is forwarded, and the same function is available in the browser so the UI can show which check would fail before a call is attempted.

| Check | Decline code | What it means |
|---|---|---|
| The team signed a permission for this order | `NO_DELEGATION` | no wallet signature, no payments |
| The payee is the approved supplier | `WRONG_SUPPLIER` | a request cannot redirect funds |
| The amount is at most the approved rate per call | `OVER_RATE` | the supplier cannot raise the price mid-order |
| The request id has not already settled | `REPLAY` | one payment per page, with the first-seen time recorded |
| Settled spend plus this call fits the team's limit | `ALLOWANCE_EXHAUSTED` | the limit is the limit |

Every decline is written to the order ledger with its reason and the numbers involved. The check order is a UX choice, not a security one: all five must pass.

Today the guard is a server-side co-signer that gates what reaches the facilitator. The Hedera `exact` scheme supports KeyList and threshold payer accounts, so the planned next step is to make the guard the second key of a 2-of-2 on each team's agent account. Then the limit is enforced by the ledger itself, not by Coquire's server.

## Pricing model

One call equals one page for the invoice OCR workload. The supplier quotes on combined volume. The built-in supplier's tier table:

| Combined pages | Rate per page | Reservation fee (whole order) |
|---|---|---|
| under 150 | 0.060 USDC (list) | none |
| 150 and up | 0.050 USDC | 1.50 USDC |
| 200 and up | 0.045 USDC | 2.00 USDC |
| 500 and up | 0.040 USDC | 3.00 USDC |

The reservation fee is split across teams in proportion to committed pages and paid at start. It never reduces the per-call allowance.

Worked example, asserted by `src/test/domain.test.ts`: team A commits 150 pages and team B commits 50. Combined 200 pages, quote 0.045 with a 2.00 fee. A pays 150 × 0.045 + 1.50 = 8.25, B pays 50 × 0.045 + 0.50 = 2.75. Total 11.00 against 12.00 at list. The landing page's pricing example and the app's numbers reconcile because both come from the same selectors.

A team's spending limit is the most its agent may ever move on the order. Unspent allowance is never transferred, so there is nothing to release at the end.

## Privacy model

What each party can see:

| Data | Other teams | Supplier | Coquire server | Public chain |
|---|---|---|---|---|
| Order terms, combined volume, funded balances | yes | yes | yes | yes, on Arkiv |
| Which teams are in the group and their page counts | yes | yes | yes | no |
| A team's spending limit | no | no | yes (to run the guard) | no |
| Page contents | no | yes, after approval, one page at a time | ciphertext only | no |
| OCR results | no | yes, as it produces them | ciphertext only | no |
| Per-call payments: amount, payer, payee | no | yes | yes | yes, on Hedera |

Pages are sealed in the browser for the approved supplier's public key only after the group approves that supplier. Results are sealed by the supplier for the agent's public key. The server stores and relays envelopes it cannot open.

"Private" here means private workloads and private budgets, not private payments. Call counts and amounts are public on Hedera, and the order's existence is public on Arkiv by design.

## Rails and interoperability

### Hedera and x402

- Network `hedera:testnet`, chain id 296, JSON-RPC `https://testnet.hashio.io/api`, mirror node `https://testnet.mirrornode.hedera.com`.
- Asset: USDC token `0.0.429274`, 6 decimals.
- Scheme: x402 `exact`. The payer builds a partially signed `TransferTransaction`; the facilitator adds the fee-payer signature and submits it. Network fees are sponsored by the facilitator.
- Facilitator: `https://x402.org/facilitator` by default. Any facilitator that lists `exact` on `hedera:testnet` in `/supported` works; the server reads the fee payer from there.
- The agent account is an ordinary Hedera account created from the agent key's ECDSA public key as its alias, with unlimited automatic token associations. Any x402 client can pay the supplier from it, and any explorer can audit it.
- The supplier endpoint is a standard 402 resource server. `scripts/agent.ts` proves it by paying it with the stock `@x402/fetch` client, with no Coquire code in the loop.

Testnet convenience: the supplier account acts as a treasury. `POST /api/wallet/fund` creates the agent's account (about 1 HBAR per account, charged to the supplier) and sends it `AGENT_FUND_USDC`. The Wallet page shows the supplier's HBAR and refuses with the top-up address when the treasury cannot afford a creation.

### Arkiv

- Rabdi testnet, chain id 7794095. Explorer `https://rabdi.explorer.arkiv.network/entity/<key>`.
- Two schemas: `coquire_orders` (order id, title, status, pages, creator, needed-by, sealed body) and `coquire_quotes` (order id, supplier, rate, fee, signature, body). Numeric and address columns use the SDK's typed helpers.
- Each order entity expires with the offer window, so the Market only shows orders that can still be quoted. The Market table links each row to its entity.
- Without credentials the server keeps a local index and labels it as such.

### Chainlink CCIP

- Lane: Ethereum Sepolia (router `0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59`, selector `16015286601757825753`) to Hedera testnet (router `0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4`, selector `222782988166878823`).
- `contracts/ccip/ApprovalSender.sol` on Sepolia sends `(orderId, cap)`; `ApprovalReceiver.sol` on Hedera stores `approvals(orderId)`. The guard will refuse an order whose team limits exceed the cap.
- `contracts/ccip/deploy.ts` compiles with solc and deploys both sides. Until `CCIP_SENDER_ADDRESS` and `CCIP_RECEIVER_ADDRESS` are set, the approval is simulated with a timer and labelled.

## API

All `/api` routes except `auth/*` and `health` need the session cookie. Responses are JSON; money fields are strings of micro-USDC.

| Method and path | Purpose |
|---|---|
| `POST /api/auth/nonce` | issue a nonce for an address |
| `POST /api/auth/verify` | verify the signed message, bind the agent public key, set the session cookie |
| `POST /api/auth/signout` | clear the session |
| `GET /api/me` | account, team, supplier, guard address, facilitator and Arkiv flags, resource base, CCIP lane |
| `POST /api/profile` | set team or supplier profile |
| `GET /api/state` | full shared state snapshot |
| `GET /api/events` | server-sent events stream of state changes |
| `POST /api/orders` | create an order, write it to Arkiv, trigger the supplier auto-quote |
| `POST /api/orders/:id/join` | join with pages and a limit |
| `POST /api/orders/:id/limit` | change your limit before start |
| `POST /api/orders/:id/quote` | submit a signed quote (supplier mode) |
| `POST /api/orders/:id/approve` | approve a quote |
| `POST /api/orders/:id/delegate` | submit the signed permission |
| `GET /api/orders/:id/delegation` | the permission message to sign |
| `POST /api/orders/:id/start` | start an active order, settle reservation shares |
| `GET /api/orders/:id/requirements` | x402 requirements for the next call |
| `POST /api/orders/:id/pay` | guard check, co-sign, settle, OCR, sealed result |
| `POST /api/orders/:id/release` | close out an order |
| `POST /api/blobs`, `GET /api/blobs/:ref` | sealed page and result storage |
| `GET /api/wallet` | agent account status, supplier treasury balances, creation cost |
| `POST /api/wallet/fund` | create the agent account and send USDC from the treasury |
| `GET /api/health` | version, facilitator name, settlement count |
| `POST /supplier/v1/pages/:requestId` | the supplier's 402 resource: standard `PAYMENT-SIGNATURE` header or Coquire's guard-co-signed `X-PAYMENT` |
| `GET /supplier/v1/sample` | a rendered sample invoice page |

## Configuration

Copy `.env.example` to `.env`. With no values set, the server generates dev secrets into `./data` and runs with simulated settlement and a local discovery index.

| Variable | Purpose |
|---|---|
| `PORT`, `APP_ORIGIN` | listen port; origin used in the sign-in message and cookies |
| `DATABASE_PATH` | SQLite path (Railway: the volume mount is detected automatically) |
| `SESSION_SECRET` | JWT signing secret |
| `GUARD_PRIVATE_KEY` | guard co-signer key |
| `SUPPLIER_PRIVATE_KEY`, `SUPPLIER_NAME`, `SUPPLIER_LIST_RATE`, `SUPPLIER_AUTOQUOTE` | the built-in supplier's key, display name, list rate, and whether it quotes automatically |
| `OCR_LANG`, `TESSDATA_PATH` | tesseract language and data path |
| `X402_NETWORK`, `X402_FACILITATOR_URL`, `SUPPLIER_HEDERA_ACCOUNT_ID` | live settlement switches: both the facilitator and the supplier account must be set |
| `HEDERA_USDC_TOKEN_ID` | defaults to `0.0.429274` |
| `TESTNET_FUND_FROM_SUPPLIER`, `AGENT_FUND_USDC`, `AGENT_INITIAL_HBAR` | treasury funding of agents: enabled by default, 7 USDC and 0.2 HBAR per agent |
| `ARKIV_ACCESS_KEY`, `ARKIV_PRIVATE_KEY` | Arkiv Rabdi testnet writes |
| `SEPOLIA_RPC_URL`, `TREASURY_PRIVATE_KEY`, `HEDERA_DEPLOYER_PRIVATE_KEY`, `CCIP_SENDER_ADDRESS`, `CCIP_RECEIVER_ADDRESS` | CCIP lane |
| `VITE_HEDERA_RPC_URL`, `VITE_HEDERA_MIRROR_URL` | client-side Hedera endpoints |

Where to get testnet resources:

- HBAR: https://portal.hedera.com/faucet (takes a Hedera account id such as `0.0.x`)
- USDC on Hedera testnet: https://faucet.circle.com (takes the Hedera account id, 20 USDC per request)
- Arkiv access key and tGLM: https://hub.arkiv.network
- Sepolia ETH and LINK: https://faucets.chain.link/sepolia

## Scripts

| Script | What it does |
|---|---|
| `npx tsx --env-file=.env scripts/hedera-setup.ts supplier` | resolves the supplier account id behind the key's EVM alias, associates USDC, prints balances |
| `npx tsx --env-file=.env scripts/hedera-setup.ts 0x<key>` | same for any ECDSA key, such as a team's agent key |
| `npx tsx --env-file=.env scripts/arkiv-check.ts` | writes one probe entity to Arkiv and reads it back |
| `npx tsx scripts/agent.ts <resource-url> '<json>'` | pays the supplier endpoint with the stock x402 client from any Hedera account |
| `npx tsx --env-file=.env contracts/ccip/deploy.ts` | compiles and deploys the CCIP sender and receiver |

## Testing

```bash
npm test
```

`src/test/domain.test.ts` covers money arithmetic, the pricing reconciliation, guard check order, the replay rule (a declined attempt does not poison a retry), and the order lifecycle. `src/test/ecies.test.ts` covers the seal and open round trip and public key recovery from a signature.

End-to-end runs are Playwright scripts that drive two browser profiles against a running server: sign in, fund agents, list, join, auto-quote, approve, sign permissions, start, pay per page with real OCR and decrypted results, prove the guard, and collect HashScan receipts. They live outside the repo because they need funded testnet accounts.

## Deploying

`railway.json` describes one service: Nixpacks build, `npm ci && npm run build`, start with `npm start`, health check on `/api/health`, one replica.

1. Create a Railway service from this repository and attach a volume. The server picks up `RAILWAY_VOLUME_MOUNT_PATH` and stores SQLite there.
2. Set `APP_ORIGIN` to your domain and generate `SESSION_SECRET`, `GUARD_PRIVATE_KEY`, `SUPPLIER_PRIVATE_KEY` (`openssl rand -hex 32` each).
3. For live settlement: fund the supplier key's Hedera account with HBAR, run `scripts/hedera-setup.ts supplier`, and set `SUPPLIER_HEDERA_ACCOUNT_ID` and `X402_FACILITATOR_URL`. Send the supplier USDC from the Circle faucet so it can fund agents.
4. For discovery: set the two Arkiv variables.
5. Keep replicas at 1; SQLite on a volume does not share across replicas.

## Repository layout

```
server/                Express 5 API: auth, state host, SSE, guard + rail, x402 live, Hedera ops, Arkiv, CCIP
server/supplier/       the built-in OCR supplier: 402 routes, tesseract worker, sample invoice
src/domain/            pure types, money, guard, selectors, reducer (shared with the server)
src/lib/               ecies, keys, wallet (EIP-6963), pages (PDF → images), x402live, hedera
src/api/               fetch client and SSE subscription
src/store/             React provider over the API
src/app/               app shell and pages: Home, Market, Wallet, New order, Order, Onboard, Settings
src/landing/           marketing pages and the landing framework
src/docs/              developer docs at /docs/:slug
src/ui/, src/styles/   design kit primitives and tokens
src/test/              vitest suites
contracts/ccip/        ApprovalSender (Sepolia), ApprovalReceiver (Hedera testnet), deploy script
scripts/               hedera-setup, arkiv-check, standalone x402 agent
docs/                  decision records: 01 build, 02 live platform
public/                logo, icons, partner logos, app screenshots used on the landing page
```

## Design system

The UI is a port of the FintechX Framer template as adapted in [liquid-stake-vara](https://github.com/Adityaakr/liquid-stake-vara): plain CSS tokens in `src/styles/tokens.css`, primitives in `src/ui/`, the landing framework in `src/landing/fx.tsx`. The app shell is a white typographic sidebar with Buy and Supply groups. Fonts: Bricolage Grotesque, Inter, JetBrains Mono. New screens use `src/ui` and `src/app/kit.tsx`; there is no second styling system.

## Security notes and known limits

- Testnet only. Keys for the browser-key sign-in and the agent live in localStorage, which is fine for testnet and not for mainnet custody.
- The guard is a server co-signer today. A compromised server could sign a bad payment; the 2-of-2 KeyList design removes that trust.
- The supplier treasury funding agents is a testnet convenience and is gated by `TESTNET_FUND_FROM_SUPPLIER`.
- Third-party suppliers can quote but can only fulfil orders once they run a 402 endpoint with the same contract as the built-in one.
- Rate limiting on `/api/auth`, blob size caps per team, and session rotation are on the roadmap.
- Rotate any key that has ever been pasted into a chat or a ticket.

## Roadmap

1. Guard as the second key of a 2-of-2 KeyList on each agent account.
2. Market reads from Arkiv queries rather than the local mirror of what this server wrote.
3. CCIP approval gate live: guard reads `approvals(orderId)` before start.
4. Supplier onboarding for third parties: an endpoint template and a "verify my endpoint" check.
5. More workload kinds (transcription, embeddings) with a unit field on the order.
6. Hardening: rate limits, blob caps, session rotation, audit export.

## References

- x402 Hedera `exact` scheme: https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_hedera.md
- x402 facilitators for Hedera: https://docs.hedera.com/solutions/ai/x402/facilitators
- Hedera JSON-RPC relay: https://docs.hedera.com/hedera/tutorials/more-tutorials/json-rpc-connections/hashio
- USDC on Hedera testnet: https://developers.circle.com/stablecoins/usdc-contract-addresses
- Arkiv entities and expiry: https://docs.arkiv.network/
- Chainlink CCIP Hedera testnet directory: https://docs.chain.link/ccip/directory/testnet/chain/hedera-testnet
- Railway volumes: https://docs.railway.com/reference/volumes
- Decision records in this repo: `docs/01-coquire-build.md`, `docs/02-live-platform.md`
