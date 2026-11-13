import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { serve } from '../src/server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function request(port, pathname, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method, headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject); req.end();
  });
}

test('read-only viewer serves exact artifacts and confines run paths', async t => {
  const id = `server-test-${randomUUID()}`;
  const workspace = path.join(root, '.runtime/runs', id);
  const bytes = Buffer.from('0123456789abcdef');
  let server;
  await fs.mkdir(path.join(workspace, 'output'), { recursive: true });
  try {
    const state = { id, title: '<script>untrusted title</script>', status: 'REVIEW_INCOMPLETE', startedAt: '2026-11-13T00:00:00Z', output: 'output/draft.mp4' };
    const event = { at: state.startedAt, role: 'producer', status: 'pending', message: 'Review required' };
    await fs.writeFile(path.join(workspace, 'state.json'), JSON.stringify(state));
    await fs.writeFile(path.join(workspace, 'events.jsonl'), JSON.stringify(event) + '\n');
    await fs.writeFile(path.join(workspace, 'output/draft.mp4'), bytes);
    await fs.writeFile(path.join(workspace, 'output/untrusted.html'), '<script>alert(1)</script>');
    await fs.symlink(path.join(root, 'package.json'), path.join(workspace, 'output/linked.json'));
    await fs.symlink(root, path.join(workspace, 'escape'));
    server = await serve({ port: 0, host: '127.0.0.1' });
    const port = server.address().port;
    const artifact = `/artifacts/${id}/output/draft.mp4`;

    await t.test('GET exposes saved state/events and exact video bytes', async () => {
      const listing = await request(port, '/api/runs');
      assert.equal(listing.status, 200);
      assert.ok(JSON.parse(listing.body).some(s => s.id === id));
      const detail = await request(port, `/api/runs/${id}`);
      assert.equal(detail.status, 200);
      assert.deepEqual(JSON.parse(detail.body), { state, events: [event] });
      const full = await request(port, artifact);
      assert.equal(full.status, 200);
      assert.deepEqual(full.body, bytes);
      assert.equal(full.headers['content-type'], 'video/mp4');
      assert.equal(full.headers['x-content-type-options'], 'nosniff');
      assert.match(full.headers['content-security-policy'], /sandbox/);
    });
    await t.test('byte ranges support seeking, suffixes and open ends', async () => {
      for (const [range, start, end] of [['bytes=2-5', 2, 5], ['bytes=-4', 12, 15], ['bytes=13-', 13, 15], ['bytes=12-999', 12, 15]]) {
        const r = await request(port, artifact, { headers: { Range: range } });
        assert.equal(r.status, 206, range);
        assert.equal(r.headers['content-range'], `bytes ${start}-${end}/${bytes.length}`);
        assert.deepEqual(r.body, bytes.subarray(start, end + 1));
      }
      for (const range of ['bytes=16-', 'bytes=5-2', 'bytes=-0', 'bytes=0-1,3-4', 'bytes=abc']) {
        const r = await request(port, artifact, { headers: { Range: range } });
        assert.equal(r.status, 416, range);
        assert.equal(r.headers['content-range'], `bytes */${bytes.length}`);
      }
    });
    await t.test('HEAD retains metadata with no payload; mutations are rejected', async () => {
      for (const pathname of ['/', '/api/runs', `/api/runs/${id}`, artifact]) {
        const r = await request(port, pathname, { method: 'HEAD' });
        assert.equal(r.status, 200); assert.equal(r.body.length, 0);
      }
      const head = await request(port, artifact, { method: 'HEAD' });
      assert.equal(Number(head.headers['content-length']), bytes.length);
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const r = await request(port, artifact, { method });
        assert.equal(r.status, 405); assert.equal(r.headers.allow, 'GET, HEAD');
      }
      assert.deepEqual(await fs.readFile(path.join(workspace, 'output/draft.mp4')), bytes);
    });
    await t.test('rejects traversal, encoded separators, nulls, symlinks and directories', async () => {
      for (const suffix of ['../state.json', '%2e%2e%2fstate.json', 'output/%2e%2e/state.json', 'output%5c..%5cstate.json', 'output/draft.mp4%00']) {
        const r = await request(port, `/artifacts/${id}/${suffix}`);
        assert.equal(r.status, 400, suffix);
      }
      for (const suffix of ['output/linked.json', 'escape/package.json', 'output']) {
        const r = await request(port, `/artifacts/${id}/${suffix}`);
        assert.equal(r.status, 404, suffix);
      }
      assert.equal((await request(port, '/assets/%2e%2e/package.json')).status, 400);
      assert.equal((await request(port, '/artifacts/%ZZ/output/draft.mp4')).status, 400);
      const html = await request(port, `/artifacts/${id}/output/untrusted.html`);
      assert.match(html.headers['content-type'], /^text\/plain/);
      assert.match(html.headers['content-security-policy'], /sandbox/);
    });
  } finally {
    if (server) await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
