require('dotenv').config();
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || `http://localhost:${process.env.HOST_PORT || 3000}`;
async function api(method, route, body) {
  const r = await fetch(base + route, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  return { status: r.status, body: await r.json() };
}
async function main() {
  assert.equal((await api('GET', '/api/health')).status, 200);
  const created = await api('POST', '/api/products', { pname: 'Demo Laptop', price: 1500, quantity: 10 });
  assert.equal(created.status, 201); const pid = created.body.pid;
  console.log('Created:', created.body);
  const stored = JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'nammongodb', 'mongosh', 'product-api', '--quiet', '--eval', `JSON.stringify(db.products.findOne({pid:${pid}},{_id:0}))`], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 30000 }).trim());
  assert.equal(stored.pid, pid); assert.equal(stored.quantity, 10);
  assert.equal((await api('PUT', '/api/products/' + pid, { price: 1400 })).status, 200);
  assert.equal((await api('GET', '/api/products/' + pid)).body.price, 1400);
  assert.equal((await api('DELETE', '/api/products/' + pid)).status, 200);
  assert.equal((await api('GET', '/api/products/' + pid)).status, 404);
  const summary = { result: 'PASS', pid, mongoCliVerified: true, crud: true, health: 'UP' };
  fs.mkdirSync(path.join(__dirname, '../artifacts'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../artifacts/demo.json'), JSON.stringify(summary, null, 2));
  console.log('PASS: health, CRUD and MongoDB CLI verification.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
