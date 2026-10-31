require('dotenv').config();
const { createApp } = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const Product = require('./models/Product');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product-api';

async function main() {
  const app = createApp();

  try {
    await connectDB(MONGO_URI);
    await Product.init();
    // eslint-disable-next-line no-console
    console.log('[product-api] Connected to MongoDB; product indexes ready');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[product-api] Failed to connect to MongoDB on startup:', err.message);
    // We still start the HTTP server so /api/health can report DOWN instead of the
    // process being unreachable entirely — this matches "healthcheck must really
    // check dependency status" rather than crashing the container on first boot race.
  }

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[product-api] Listening on port ${PORT}`);
  });
  const stop = () => server.close(() => disconnectDB().then(() => process.exit(0)));
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

main();
