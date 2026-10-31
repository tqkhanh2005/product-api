const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const healthRoutes = require('./routes/health');
const productRoutes = require('./routes/products');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      if (process.env.NODE_ENV !== 'test') console.log(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started })); // eslint-disable-line no-console
    });
    next();
  });
  app.use(express.json({ limit: '100kb' }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', healthRoutes);
  if (process.env.NODE_ENV !== 'test') app.use(limiter);

  app.use('/api', productRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
