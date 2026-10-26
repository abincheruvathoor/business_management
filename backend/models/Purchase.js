
const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    branchName: {
      type: String,
      default: "Mumbai Branch",
      trim: true
    },
    orderType: {
      type: String,
      enum: ["Manual", "Low Stock"],
      default: "Manual"
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["Pending", "Received"],
      default: "Pending"
    },
    source: {
      type: String,
      enum: ["website", "telegram", "whatsapp"],
      default: "website"
    },
    receivedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema);
