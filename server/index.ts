import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { api } from './routes.js';
import { supplierRouter } from './supplier/routes.js';
import { warmOcr } from './supplier/ocr.js';
import { facilitator } from './rail.js';
import { discovery } from './arkiv.js';
import { ccip } from './ccip.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '12mb' }));
app.use('/api', api);
app.use('/supplier', supplierRouter);

const dist = join(__dirname, '..', 'dist');
app.use(express.static(dist, { index: false, maxAge: '1h' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/supplier')) { next(); return; }
  res.sendFile(join(dist, 'index.html'), (err) => { if (err) res.status(404).send('Build the app first: npm run build'); });
});

app.listen(PORT, () => {
  console.log(`[coquire] listening on ${PORT}`);
  console.log(`[coquire] settlement: ${facilitator.live ? 'live facilitator ' + facilitator.url : 'simulated'} · arkiv: ${discovery.live ? 'live' : 'local'} · ccip: ${ccip.live ? 'live' : 'simulated'}`);
  void warmOcr();
});
