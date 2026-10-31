class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Translates Mongoose/Mongo errors + ApiError into a consistent HTTP response.
// Never leaks stack traces or internal details in production.
function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Bad Request', message: 'Malformed JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload Too Large' });
  // Duplicate key (unique index violation) -> 409
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'A product with this pid already exists',
    });
  }

  // Mongoose validation error -> 400
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: 'Bad Request',
      message: messages.join('; '),
    });
  }

  // Mongoose bad ObjectId / cast error -> 400
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid value for field '${err.path}'`,
    });
  }

  // Mongo not connected / topology errors -> 503
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database is currently unreachable',
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.originalUrl} not found` });
}

module.exports = { errorHandler, notFoundHandler, ApiError };
