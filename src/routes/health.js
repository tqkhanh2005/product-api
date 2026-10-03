const express = require('express');
const { getDbHealth } = require('../config/db');

const router = express.Router();

// GET /api/health — checks the app itself AND the MongoDB dependency,
// per Prompt 1 item 9 and API-HEALTH-01 ("can be extended to check ... MongoDB").
router.get('/health', (req, res) => {
  const db = getDbHealth();
  const status = db.connected ? 'UP' : 'DOWN';
  const httpCode = db.connected ? 200 : 503;

  res.status(httpCode).json({
    status,
    message: status === 'UP' ? 'Product API is running' : 'Product API is running but MongoDB is unreachable',
    dependencies: {
      mongodb: db.state,
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
