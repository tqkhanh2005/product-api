/**
 * Integration test suite — hits a REAL MongoDB instance (no mocks).
 * Requires MONGO_URI to point at a reachable MongoDB (e.g. the `mongodb`
 * service container started by .github/workflows/test-productci-prod.yml,
 * or a local `docker compose up nammongodb`).
 *
 * This file is intentionally NOT part of the default `npm test` run because
 * this sandbox has no reachable MongoDB server (documented in
 * docs/REQUIREMENTS_CHECKLIST.md) — running it here would either hang or
 * falsely report success/failure with no real backing database. It is wired
 * into package.json as `npm run test:integration` and is the suite the CI
 * workflow `test-productci-prod.yml` actually executes on GitHub's runner,
 * where a real `mongodb` service container is available.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const Product = require('../src/models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product-api-test';
const app = createApp();

beforeAll(async () => {
  await connectDB(MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
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
});
