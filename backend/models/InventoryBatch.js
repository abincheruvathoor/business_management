const mongoose = require("mongoose");

const inventoryBatchSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  branchName: { type: String, required: true, trim: true, default: "Mumbai Branch", index: true },
  batchNumber: { type: String, required: true, trim: true },
  packSize: { type: String, default: "" , trim: true },
  physicalQty: { type: Number, required: true, min: 0, default: 0 },
  stockLevel: { type: Number, min: 0, default: 0 },
  temporaryStock: { type: Number, min: 0, default: 0 },
  transitStock: { type: Number, min: 0, default: 0 },
  pendingOrder: { type: Number, min: 0, default: 0 },
  purchase: { type: Number, min: 0, default: 0 },
  purchaseRounded: { type: Number, min: 0, default: 0 },
  recycleRemarks: { type: String, default: "" },
  returnStock: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

inventoryBatchSchema.index(
  { product: 1, branchName: 1, batchNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("InventoryBatch", inventoryBatchSchema);
