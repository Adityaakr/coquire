import { Buffer } from 'buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/global.css';
import '@/ui/ui.css';
import App from './App';

// The Hedera SDK (used by the browser agent to sign x402 payments) expects Node globals.
const g = globalThis as unknown as { Buffer?: typeof Buffer; process?: { env: Record<string, string> } };
if (!g.Buffer) g.Buffer = Buffer;
if (!g.process) g.process = { env: {} };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
