import { createWorker, type Worker } from 'tesseract.js';
import { pdf } from 'pdf-to-img';
import type { InvoiceResult } from '../../src/domain/types.js';

let worker: Promise<Worker> | null = null;
function getWorker() {
  if (!worker) {
    worker = createWorker(process.env.OCR_LANG ?? 'eng', 1, { cachePath: process.env.TESSDATA_PATH ?? './data/tessdata', logger: () => {} });
  }
  return worker;
}

/** Rasterise a PDF into PNG page images, or pass an image through. */
export async function toPageImages(bytes: Uint8Array, mime: string): Promise<Uint8Array[]> {
  if (mime === 'application/pdf') {
    const pages: Uint8Array[] = [];
    const doc = await pdf(Buffer.from(bytes), { scale: 2 });
    for await (const png of doc) pages.push(new Uint8Array(png));
    return pages;
  }
  return [bytes];
}

const MONEY = /(?:total|amount due|balance due|grand total)[^\d]{0,24}([\d.,]+)/i;
const INVOICE_NO = /(?:invoice|inv)\.?\s*(?:no|number|#)?[:\s#]*([A-Z0-9-]{3,})/i;
const DATE = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4})/;
const CURRENCY = /(USD|EUR|GBP|INR|\$|€|£)/;

/** Real OCR with tesseract.js, then light extraction of the fields buyers asked for. Confidence is tesseract's own mean. */
export async function ocrInvoice(image: Uint8Array): Promise<InvoiceResult & { text: string }> {
  const w = await getWorker();
  const { data } = await w.recognize(Buffer.from(image));
  const text = data.text ?? '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const vendor = lines.find((l) => /[A-Za-z]{3,}/.test(l) && !/invoice|date|total|bill to|ship to/i.test(l)) ?? 'Unknown vendor';
  const invoiceNumber = text.match(INVOICE_NO)?.[1] ?? '';
  const date = text.match(DATE)?.[1] ?? '';
  const total = text.match(MONEY)?.[1]?.replace(/,/g, '') ?? '';
  const currency = text.match(CURRENCY)?.[1]?.replace('$', 'USD').replace('€', 'EUR').replace('£', 'GBP') ?? 'USD';
  return { vendor: vendor.slice(0, 80), invoiceNumber, date, total, currency, confidence: Math.round((data.confidence ?? 0)) / 100, text: text.slice(0, 4000) };
}

export async function warmOcr() {
  try { await getWorker(); } catch (e) { console.warn('[ocr] worker failed to start', e); }
}
