require('dotenv').config();
const { createApp } = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product-api';

async function main() {
  const app = createApp();

  try {
    await connectDB(MONGO_URI);
    // eslint-disable-next-line no-console
    console.log(`[product-api] Connected to MongoDB at ${MONGO_URI}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[product-api] Failed to connect to MongoDB on startup:', err.message);
    // We still start the HTTP server so /api/health can report DOWN instead of the
    // process being unreachable entirely — this matches "healthcheck must really
    // check dependency status" rather than crashing the container on first boot race.
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[product-api] Listening on port ${PORT}`);
  });
}

main();
