<p align="center">
  <img src="./public/logo.svg" alt="Coquire" width="72" height="72" />
</p>
<h1 align="center">coquire</h1>
<p align="center"><strong>Private group buying for API capacity</strong></p>
<p align="center">Teams pool demand for an API workload, a supplier quotes the combined volume once, and each team's agent pays per call in USDC over x402 on Hedera under a signed spending limit that a guard enforces. Workloads travel sealed; results come back sealed.</p>

---

## What this is

A real multi-user product: an Express 5 API with SQLite, wallet sign-in, a server-side guard that co-signs, a 402 supplier that runs tesseract.js on sealed pages, ECIES sealing in the browser, and server-sent events so every party sees the same order.

- **Buyer teams** commit pages to an order, approve one supplier quote, sign one permission for their agent, and the agent pays per call.
- **Suppliers** see funded group orders, quote the combined volume, and get paid per call. The built-in supplier quotes by policy, signs its quotes, and runs real OCR.
- **Agents** hold a browser key that signs every payment and decrypts results. The wallet signs once per order.

Switch between Buyer and Supplier with the toggle in the top bar. Use a second browser profile (or device) to act as the second team.

## What is live and what needs keys

| Piece | Status | Needs |
|---|---|---|
| Sign-in (MetaMask on Hedera testnet or a browser key), sessions | Live | nothing |
| Agent key registration, ECIES sealing of pages and results | Live | nothing |
| Guard: four checks, server-side co-signature, decline reasons | Live | nothing |
| Built-in OCR supplier as a 402 resource server | Live | nothing |
| Shared state, SSE, SQLite persistence | Live | a Railway volume in production |
| x402 settlement on Hedera testnet | Simulated until configured | `X402_FACILITATOR_URL`, supplier Hedera account, funded agent accounts |
| Arkiv discovery (Rabdi testnet) | Local index until configured | `ARKIV_ACCESS_KEY`, `ARKIV_PRIVATE_KEY` |
| Chainlink CCIP treasury approval | Simulated until configured | deploy `contracts/ccip`, `CCIP_*`, `TREASURY_PRIVATE_KEY` |

The app's Settings page reads these flags from the server. See `docs/02-live-platform.md` for what to provide, and `/docs/live-wiring` in the app.

## Run it

```bash
npm install
cp .env.example .env         # defaults work with no keys
npm run dev:server           # API + supplier on :3000 (generates dev secrets into ./data)
npm run dev                  # Vite on :8080, proxies /api and /supplier
npm test                     # domain + crypto tests
npm run build && npm start   # production: serves dist/ from the API server
```

## Layout

```
server/        Express 5 API: auth, state host + action log, SSE, guard + rail, x402 live, Arkiv, CCIP, built-in OCR supplier
src/domain/    pure types, money, guard, selectors, reducer (shared with the server)
src/lib/       ecies.ts (sealing), keys.ts (browser keys), pages.ts (PDF → page images), x402live.ts (Hedera payer)
src/api/       fetch client + SSE subscription
src/store/     React provider over the API
src/app/       AppLayout (sidebar), Onboard, Overview, NewOrder, Order, Discover, Settings
src/landing/   marketing pages, UseCasesPage (references), ProductPage, kit components
src/docs/      developer docs at /docs
contracts/ccip ApprovalSender (Sepolia), ApprovalReceiver (Hedera testnet), deploy.ts
scripts/       agent.ts: a standalone x402 client that pays the supplier endpoint
```

## Design

The UI is a port of the FintechX Framer template as adapted in `liquid-stake-vara`: plain CSS tokens in `src/styles/`, primitives in `src/ui/`, landing framework in `src/landing/fx.tsx`. Fonts: Bricolage Grotesque, Inter, JetBrains Mono.
