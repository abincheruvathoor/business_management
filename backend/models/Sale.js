const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryBatch", default: null },
  batchNumber: { type: String, default: "", trim: true },
  vendorName: { type: String, default: "", trim: true },
  invoiceNumber: { type: String, default: "", trim: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  source: { type: String, enum: ["website", "telegram", "whatsapp"], default: "website" }
}, { timestamps: true });

module.exports = mongoose.model("Sale", saleSchema);
