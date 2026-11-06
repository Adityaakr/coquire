import type { Request, Response } from 'express';

const clients = new Set<Response>();

export function subscribe(req: Request, res: Response) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write(`event: hello\ndata: ${Date.now()}\n\n`);
  clients.add(res);
  const beat = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* closed */ } }, 25_000);
  req.on('close', () => { clearInterval(beat); clients.delete(res); });
}

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? `__big:${v}` : v))}\n\n`;
  for (const c of clients) { try { c.write(payload); } catch { clients.delete(c); } }
}

export const clientCount = () => clients.size;
