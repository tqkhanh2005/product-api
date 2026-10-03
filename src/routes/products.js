const express = require('express');
const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function validateProductBody(body, { partial = false } = {}) {
  const errors = [];
  const { pname, price, quantity } = body;

  if (!partial || pname !== undefined) {
    if (typeof pname !== 'string' || pname.trim().length === 0) {
      errors.push('pname is required and must be a non-empty string');
    }
  }
  if (!partial || price !== undefined) {
    if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
      errors.push('price is required and must be a non-negative number');
    }
  }
  if (!partial || quantity !== undefined) {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
      errors.push('quantity is required and must be a non-negative integer');
    }
  }
  return errors;
}

// GET /api/products
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const items = await Product.find().sort({ pid: 1 }).lean({ virtuals: false });
    const cleaned = items.map(({ _id: _omitId, __v: _omitV, ...rest }) => rest);
    res.json({ items: cleaned, count: cleaned.length });
  })
);

// GET /api/products/:pid
router.get(
  '/products/:pid',
  asyncHandler(async (req, res) => {
    const pid = Number(req.params.pid);
    if (!Number.isInteger(pid)) {
      throw new ApiError(400, 'pid must be an integer');
    }
    const product = await Product.findOne({ pid });
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    res.json(product.toJSON());
  })
);

// POST /api/products
router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const errors = validateProductBody(req.body);
    if (errors.length) {
      throw new ApiError(400, errors.join('; '));
    }

    const pid = req.body.pid !== undefined ? Number(req.body.pid) : await Product.getNextPid();
    const product = await Product.create({
      pid,
      pname: req.body.pname.trim(),
      price: req.body.price,
      quantity: req.body.quantity,
    });
    res.status(201).json(product.toJSON());
  })
);

// PUT /api/products/:pid
router.put(
  '/products/:pid',
  asyncHandler(async (req, res) => {
    const pid = Number(req.params.pid);
    if (!Number.isInteger(pid)) {
      throw new ApiError(400, 'pid must be an integer');
    }
    const errors = validateProductBody(req.body, { partial: true });
    if (errors.length) {
      throw new ApiError(400, errors.join('; '));
    }

    const update = {};
    if (req.body.pname !== undefined) update.pname = req.body.pname.trim();
    if (req.body.price !== undefined) update.price = req.body.price;
    if (req.body.quantity !== undefined) update.quantity = req.body.quantity;

    const product = await Product.findOneAndUpdate({ pid }, update, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({ message: 'Product updated successfully', pid: product.pid, product: product.toJSON() });
  })
);

// DELETE /api/products/:pid
router.delete(
  '/products/:pid',
  asyncHandler(async (req, res) => {
    const pid = Number(req.params.pid);
    if (!Number.isInteger(pid)) {
      throw new ApiError(400, 'pid must be an integer');
    }
    const product = await Product.findOneAndDelete({ pid });
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({ message: 'Product deleted successfully', pid });
  })
);

module.exports = router;
