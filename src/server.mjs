import http from 'node:http';
import { promises as fs, constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = path.join(ROOT, '.runtime/runs');
const validId = value => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
const types = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.ttf': 'font/ttf', '.json': 'application/json', '.jsonl': 'text/plain; charset=utf-8' };

async function openConfined(root, relative) {
  const segments = relative.split('/');
  if (!segments.length || segments.some(s => !s || s === '.' || s === '..' || s.includes('\\') || s.includes('\0'))) throw Object.assign(new Error('Invalid path'), { status: 400 });
  let current = root;
  const rootRelative = path.relative(ROOT, root);
  if (rootRelative.startsWith('..') || path.isAbsolute(rootRelative)) throw new Error('Invalid root');
  let ancestor = ROOT;
  for (const segment of rootRelative.split(path.sep).filter(Boolean)) {
    ancestor = path.join(ancestor, segment);
    const base = await fs.lstat(ancestor);
    if (base.isSymbolicLink() || !base.isDirectory()) throw Object.assign(new Error('Invalid root'), { status: 404 });
  }
  for (let i = 0; i < segments.length; i++) {
    current = path.join(current, segments[i]);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || (i < segments.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw Object.assign(new Error('Not a regular file'), { status: 404 });
  }
  const handle = await fs.open(current, constants.O_RDONLY | constants.O_NOFOLLOW);
  if (!(await handle.stat()).isFile()) { await handle.close(); throw new Error('Not a file'); }
  return handle;
}
async function readFile(root, relative) {
  const handle = await openConfined(root, relative);
  try { return await handle.readFile('utf8'); } finally { await handle.close(); }
}
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
async function sendFile(req, res, root, relative, trusted = false) {
  const handle = await openConfined(root, relative);
  try {
    const { size } = await handle.stat();
    const headers = { 'Content-Type': types[path.extname(relative).toLowerCase()] || 'text/plain; charset=utf-8', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    if (!trusted) headers['Content-Security-Policy'] = "default-src 'none'; sandbox";
    let start = 0, end = size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || size === 0) { res.end(); return; }
    const stream = handle.createReadStream({ start, end, autoClose: false });
    await new Promise((resolve, reject) => { stream.on('error', reject); res.on('finish', resolve); res.on('close', () => { stream.destroy(); resolve(); }); stream.pipe(res); });
  } finally { await handle.close(); }
}
export async function serve({ port = 4381, host = '127.0.0.1' } = {}) {
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); json(res, 405, { error: 'Read-only viewer' }); return; }
      const pathname = decodeURIComponent(req.url.split('?')[0]);
      if (pathname === '/') { const html = await fs.readFile(path.join(ROOT, 'web/index.html')); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : html); return; }
      if (pathname === '/api/runs') {
        const entries = await fs.readdir(RUNS, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
        const states = await Promise.all(entries.filter(e => e.isDirectory() && validId(e.name)).map(async e => { try { const state = JSON.parse(await readFile(RUNS, `${e.name}/state.json`)); return { ...state, id: e.name }; } catch { return null; } }));
        json(res, 200, states.filter(Boolean).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))); return;
      }
      const run = /^\/api\/runs\/([^/]+)$/.exec(pathname);
      if (run && validId(run[1])) {
        const state = JSON.parse(await readFile(RUNS, `${run[1]}/state.json`));
        const log = await readFile(RUNS, `${run[1]}/events.jsonl`).catch(e => { if (e.code === 'ENOENT') return ''; throw e; });
        const events = log.split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
        json(res, 200, { state: { ...state, id: run[1] }, events }); return;
      }
      const artifact = /^\/artifacts\/([^/]+)\/(.+)$/.exec(pathname);
      if (artifact && validId(artifact[1])) { await sendFile(req, res, RUNS, `${artifact[1]}/${artifact[2]}`); return; }
      if (pathname.startsWith('/assets/')) { await sendFile(req, res, path.join(ROOT, 'assets'), pathname.slice(8), true); return; }
      json(res, 404, { error: 'Not found' });
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      json(res, error instanceof URIError ? 400 : error.status || (error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500), { error: 'Unable to read requested artifact' });
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return server;
}
