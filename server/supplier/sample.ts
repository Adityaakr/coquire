import { readFileSync, existsSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

/** A rendered sample invoice so "test the API before you buy" runs real OCR without the buyer uploading anything. */
export function sampleInvoicePng(): Uint8Array {
  const path = process.env.SAMPLE_INVOICE_PATH ?? './data/sample-invoice.png';
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  const w = 1240, h = 1000;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 44px sans-serif'; ctx.fillText('Northgate Office Supply', 80, 110);
  ctx.font = '28px sans-serif';
  ctx.fillText('Invoice Number: INV-2413', 80, 190);
  ctx.fillText('Date: 2026-10-14', 80, 240);
  ctx.fillText('Bill To: Northwind Books', 80, 290);
  ctx.font = '26px sans-serif';
  const rows = [['A4 copier paper, 10 boxes', '240.00'], ['Toner cartridge, black', '89.50'], ['Delivery', '15.00']];
  let y = 400;
  for (const [d, a] of rows) { ctx.fillText(d, 80, y); ctx.fillText(a, 900, y); y += 50; }
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('TOTAL DUE: USD 344.50', 80, 640);
  ctx.font = '22px sans-serif';
  ctx.fillText('Payment terms: net 30. Thank you.', 80, 720);
  return new Uint8Array(c.toBuffer('image/png'));
}
