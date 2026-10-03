const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Product schema — required fields per Prompt 1: pid, pname, price, quantity.
 * pid is exposed as a stable auto-incrementing integer-like field so API
 * consumers get a clean numeric id (in addition to Mongo's own _id),
 * matching the API_Specification_Ecommerce_MVP.xlsx examples ("pid":1).
 */
const productSchema = new Schema(
  {
    pid: {
      type: Number,
      required: true,
    },
    pname: {
      type: String,
      required: [true, 'pname is required'],
      trim: true,
      minlength: [1, 'pname must not be empty'],
      maxlength: [100, 'pname must be at most 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'price is required'],
      min: [0, 'price must be >= 0'],
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [0, 'quantity must be >= 0'],
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer',
      },
    },
  },
  { timestamps: true, versionKey: false }
);

productSchema.index({ pid: 1 }, { unique: true });

// Auto-assign the next pid on creation if not explicitly given.
productSchema.statics.getNextPid = async function getNextPid() {
  const last = await this.findOne().sort({ pid: -1 }).select('pid').lean();
  return last ? last.pid + 1 : 1;
};

productSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
