const request = require('supertest');

// No MongoDB server is reachable from this environment (documented in
// docs/REQUIREMENTS_CHECKLIST.md), so the Mongoose Product model is mocked here.
// This still exercises the real Express app, real route/validation/error-handling
// code — only the persistence layer is a test double. Live-DB integration is run
// by the GitHub Actions workflow (test-productci-prod.yml), which has a real
// `mongodb` service container.
jest.mock('../src/models/Product');
const Product = require('../src/models/Product');
const { createApp } = require('../src/app');

const app = createApp();

function mockDoc(data) {
  return { ...data, toJSON: () => data };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/health', () => {
  it('returns 503 with DOWN status when MongoDB is not connected (real dependency check, no live DB here)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('DOWN');
    expect(res.body.dependencies.mongodb).toBe('disconnected');
  });
});

describe('GET /api/products', () => {
  it('returns 200 and a list of products', async () => {
    Product.find.mockReturnValue({
      sort: () => ({
        lean: async () => [
          { pid: 1, pname: 'Laptop', price: 1500, quantity: 10 },
          { pid: 2, pname: 'Mouse', price: 25, quantity: 100 },
        ],
      }),
    });

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.items[0]).toEqual({ pid: 1, pname: 'Laptop', price: 1500, quantity: 10 });
  });
});

describe('GET /api/products/:pid', () => {
  it('returns 200 for an existing product', async () => {
    Product.findOne.mockResolvedValue(mockDoc({ pid: 1, pname: 'Laptop', price: 1500, quantity: 10 }));
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body.pname).toBe('Laptop');
  });

  it('returns 404 for a non-existent product', async () => {
    Product.findOne.mockResolvedValue(null);
    const res = await request(app).get('/api/products/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Product not found');
  });

  it('returns 400 for a non-integer pid', async () => {
    const res = await request(app).get('/api/products/abc');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/products', () => {
  it('creates a product and returns 201', async () => {
    Product.getNextPid = jest.fn().mockResolvedValue(3);
    Product.create.mockResolvedValue(
      mockDoc({ pid: 3, pname: 'Keyboard', price: 45, quantity: 30 })
    );

    const res = await request(app)
      .post('/api/products')
      .send({ pname: 'Keyboard', price: 45, quantity: 30 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ pid: 3, pname: 'Keyboard', price: 45, quantity: 30 });
  });

  it('returns 400 for invalid data (missing pname)', async () => {
    const res = await request(app).post('/api/products').send({ price: 10, quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ pname: 'Bad', price: -5, quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer quantity', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ pname: 'Bad', price: 5, quantity: 1.5 });
    expect(res.status).toBe(400);
  });

  it('returns 409 when the database reports a duplicate key error', async () => {
    Product.getNextPid = jest.fn().mockResolvedValue(1);
    const dupErr = new Error('duplicate');
    dupErr.code = 11000;
    Product.create.mockRejectedValue(dupErr);

    const res = await request(app)
      .post('/api/products')
      .send({ pname: 'Dup', price: 1, quantity: 1 });

    expect(res.status).toBe(409);
  });
});

describe('PUT /api/products/:pid', () => {
  it('updates an existing product', async () => {
    Product.findOneAndUpdate.mockResolvedValue(
      mockDoc({ pid: 1, pname: 'Laptop Pro', price: 1700, quantity: 15 })
    );
    const res = await request(app)
      .put('/api/products/1')
      .send({ pname: 'Laptop Pro', price: 1700, quantity: 15 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product updated successfully');
    expect(res.body.pid).toBe(1);
  });

  it('returns 404 when updating a non-existent product', async () => {
    Product.findOneAndUpdate.mockResolvedValue(null);
    const res = await request(app).put('/api/products/999').send({ price: 1 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/products/:pid', () => {
  it('deletes an existing product', async () => {
    Product.findOneAndDelete.mockResolvedValue(mockDoc({ pid: 1 }));
    const res = await request(app).delete('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product deleted successfully');
  });

  it('returns 404 when deleting a non-existent product', async () => {
    Product.findOneAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/products/999');
    expect(res.status).toBe(404);
  });
});

describe('Unhandled route', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
