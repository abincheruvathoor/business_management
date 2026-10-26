
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "General",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      default: "pieces",
    },
    minimumStock: {
      type: Number,
      default: 5,
      min: 0,
    },
    mnemonicCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Existing target-stock field; retained for compatibility.
    targetStock: {
      type: Number,
      default: 50,
      min: 0,
    },

    // Mumbai PO Generator fields.
    // These are optional so existing product records remain valid.
    stockLevel: {
      type: Number,
      min: 0,
    },
    tempStock: {
      type: Number,
    },
    pendingOrder1: {
      type: Number,
    },
    pendingOrder2: {
      type: Number,
    },
    pendingOrder3: {
      type: Number,
    },
    recycleStock: {
      type: Number,
    },
    transitStock1: {
      type: Number,
    },
    transitStock2: {
      type: Number,
    },
    branchStock: {
      type: Number,
      min: 0,
    },
    minimumOrderQty: {
      type: Number,
      min: 0,
    },
    packSize: {
  type: Number,
  default: null,
  min: 0,
},
packSizeUnit: {
  type: String,
  default: "GM",
  enum: ["GM"],
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
