const mongoose = require('mongoose');
const { Schema } = mongoose;
const Counter = mongoose.model('Counter', new Schema({ _id: String, value: { type: Number, required: true } }, { versionKey: false }));

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
      min: 1,
      validate: { validator: Number.isSafeInteger, message: 'pid must be a positive safe integer' },
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
        validator: Number.isSafeInteger,
        message: 'quantity must be an integer',
      },
    },
  },
  { timestamps: true, versionKey: false }
);

productSchema.index({ pid: 1 }, { unique: true });

// Indexed single-document counter: parallel creates never select the same next id.
// Advance past existing/explicit ids as well, preserving compatibility with old data.
productSchema.statics.advancePid = async function advancePid(value) {
  try { await Counter.findOneAndUpdate({ _id: 'product' }, { $max: { value } }, { upsert: true, new: true }); }
  catch (e) {
    if (e.code !== 11000) throw e;
    await Counter.findOneAndUpdate({ _id: 'product' }, { $max: { value } });
  }
};
productSchema.statics.getNextPid = async function getNextPid() {
  const last = await this.findOne().sort({ pid: -1 }).select('pid').lean();
  await this.advancePid(last ? last.pid : 0);
  const counter = await Counter.findOneAndUpdate({ _id: 'product' }, { $inc: { value: 1 } }, { new: true });
  return counter.value;
};

productSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
