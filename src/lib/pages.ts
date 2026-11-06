/**
 * Turn uploaded files into page images in the browser, so plaintext never leaves the client.
 * Images pass through; PDFs are rasterised with pdf.js page by page.
 */
export interface PageImage { name: string; mime: string; bytes: Uint8Array; page: number }

export async function filesToPages(files: File[]): Promise<PageImage[]> {
  const out: PageImage[] = [];
  for (const f of files) {
    if (f.type === 'application/pdf') {
      const pdfjs = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
        out.push({ name: `${f.name}#${i}`, mime: 'image/png', bytes: new Uint8Array(await blob.arrayBuffer()), page: out.length + 1 });
      }
    } else if (f.type.startsWith('image/')) {
      out.push({ name: f.name, mime: f.type, bytes: new Uint8Array(await f.arrayBuffer()), page: out.length + 1 });
    }
  }
  return out;
}

/** A rendered sample invoice for teams that have not uploaded pages yet, so the agent still processes something real. */
export function sampleInvoicePage(n: number): PageImage {
  const canvas = document.createElement('canvas');
  canvas.width = 1240; canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  const vendors = ['Northgate Office Supply', 'Lumen Energy', 'Cityline Couriers', 'Pinewood Catering', 'Atlas Print Co.', 'Meridian Telecom'];
  const vendor = vendors[n % vendors.length];
  const total = (((n * 7919) % 48000) + 1250) / 100;
  ctx.font = 'bold 44px sans-serif'; ctx.fillText(vendor, 80, 110);
  ctx.font = '28px sans-serif';
  ctx.fillText(`Invoice Number: INV-${2400 + n * 13}`, 80, 190);
  ctx.fillText(`Date: 2026-${String(((n * 3) % 12) + 1).padStart(2, '0')}-${String((n % 27) + 1).padStart(2, '0')}`, 80, 240);
  ctx.fillText('Bill To: Northwind Books', 80, 290);
  ctx.font = '26px sans-serif';
  ctx.fillText('Services rendered', 80, 400); ctx.fillText(total.toFixed(2), 900, 400);
  ctx.font = 'bold 32px sans-serif'; ctx.fillText(`TOTAL DUE: USD ${total.toFixed(2)}`, 80, 560);
  const dataUrl = canvas.toDataURL('image/png');
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
  return { name: `sample-invoice-${n}.png`, mime: 'image/png', bytes, page: n };
}
