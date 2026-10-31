/**
 * Integration test suite — hits a REAL MongoDB instance (no mocks).
 * Requires MONGO_URI to point at a reachable MongoDB (e.g. the `mongodb`
 * service container started by .github/workflows/test-productci-prod.yml,
 * or a local `docker compose up nammongodb`).
 *
 * Kept separate from npm test so unit tests do not require a database.
 * Run through the Compose test profile, or npm run test:integration with
 * MONGO_URI pointing at a dedicated product-api-test database. CI supplies
 * its own real MongoDB service; cleanup is restricted to the test database.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const Product = require('../src/models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product-api-test';
const app = createApp();

beforeAll(async () => {
  const database = new URL(MONGO_URI).pathname.slice(1);
  if (!/^product-api-test(?:-|$)/.test(database)) throw new Error('Integration tests require a separate product-api-test database');
  await connectDB(MONGO_URI);
  await Product.init();
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1 && /^product-api-test(?:-|$)/.test(mongoose.connection.name)) await mongoose.connection.dropDatabase();
  await disconnectDB();
});

beforeEach(async () => {
  await Product.deleteMany({});
});

describe('Product API — real MongoDB integration', () => {
  it('GET /api/health reports UP when the real DB is connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('creates, reads, updates and deletes a product end-to-end against real MongoDB', async () => {
    const create = await request(app)
      .post('/api/products')
      .send({ pname: 'Integration Laptop', price: 1200, quantity: 5 });
    expect(create.status).toBe(201);
    const { pid } = create.body;

    const read = await request(app).get(`/api/products/${pid}`);
    expect(read.status).toBe(200);
    expect(read.body.pname).toBe('Integration Laptop');

    const update = await request(app)
      .put(`/api/products/${pid}`)
      .send({ price: 999 });
    expect(update.status).toBe(200);

    const readAfterUpdate = await request(app).get(`/api/products/${pid}`);
    expect(readAfterUpdate.body.price).toBe(999);

    const del = await request(app).delete(`/api/products/${pid}`);
    expect(del.status).toBe(200);

    const readAfterDelete = await request(app).get(`/api/products/${pid}`);
    expect(readAfterDelete.status).toBe(404);
  });

  it('rejects a duplicate pid with a real unique index violation -> 409', async () => {
    await Product.create({ pid: 42, pname: 'First', price: 1, quantity: 1 });
    const res = await request(app)
      .post('/api/products')
      .send({ pid: 42, pname: 'Second', price: 2, quantity: 2 });
    expect(res.status).toBe(409);
  });

  it('handles missing record with a real database query -> 404', async () => {
    const res = await request(app).get('/api/products/123456');
    expect(res.status).toBe(404);
  });

  it('parallel creates allocate distinct numeric pids', async () => {
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => request(app).post('/api/products').send({ pname: `Parallel ${i}`, price: 1, quantity: 1 })));
    expect(responses.map(r => r.status)).toEqual(Array(12).fill(201));
    expect(new Set(responses.map(r => r.body.pid)).size).toBe(12);
  });

  it('explicit pid advances automatic ids; deleting does not reuse a pid', async () => {
    const created = await request(app).post('/api/products').send({ pid: 5000, pname: 'Explicit', price: 1, quantity: 1 });
    expect(created.status).toBe(201);
    await request(app).delete('/api/products/5000');
    const next = await request(app).post('/api/products').send({ pname: 'Automatic', price: 1, quantity: 1 });
    expect(next.status).toBe(201); expect(next.body.pid).toBeGreaterThan(5000);
  });

  it.each([0, -1, 1.5, 'abc'])('rejects invalid explicit pid %s', async pid => {
    expect((await request(app).post('/api/products').send({ pid, pname: 'Invalid', price: 1, quantity: 1 })).status).toBe(400);
  });

  it('rejects empty updates, null body, unknown fields and malformed JSON', async () => {
    const p = (await request(app).post('/api/products').send({ pname: 'X', price: 1, quantity: 1 })).body;
    expect((await request(app).put(`/api/products/${p.pid}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/products').set('Content-Type', 'application/json').send('null')).status).toBe(400);
    expect((await request(app).post('/api/products').send({ pname: 'X', price: 1, quantity: 1, unexpected: 1 })).status).toBe(400);
    expect((await request(app).post('/api/products').set('Content-Type', 'application/json').send('{broken')).status).toBe(400);
  });
});
