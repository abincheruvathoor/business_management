const express = require("express");
const mongoose = require("mongoose");
const InventoryBatch = require("../models/InventoryBatch");
const Product = require("../models/Product");

const router = express.Router();

// List batch records; optionally filter by branch or product.
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.branchName) filter.branchName = req.query.branchName;
    if (req.query.productId) {
      if (!mongoose.isValidObjectId(req.query.productId)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }
      filter.product = req.query.productId;
    }
    const batches = await InventoryBatch.find(filter)
      .populate("product", "name category unit price minimumStock mnemonicCode")
      .sort({ branchName: 1, batchNumber: 1 });
    res.json(batches);
  } catch (error) {
    console.error("Batch list error:", error);
    res.status(500).json({ message: "Could not load batch inventory." });
  }
});

// Create or update a batch record. This does not change the legacy product stock total.
router.post("/", async (req, res) => {
  try {
    const {
      productId, branchName = "Mumbai Branch", batchNumber, packSize = "",
      physicalQty, stockLevel = 0, temporaryStock = 0, transitStock = 0,
      pendingOrder = 0, purchase = 0, purchaseRounded = 0,
      recycleRemarks = "", returnStock = 0
    } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Valid productId is required." });
    }
    if (!String(batchNumber || "").trim()) {
      return res.status(400).json({ message: "Batch number is required." });
    }
    if (typeof physicalQty !== "number" || !Number.isFinite(physicalQty) || physicalQty < 0) {
      return res.status(400).json({ message: "physicalQty must be a non-negative number." });
    }
    const numericFields = { stockLevel, temporaryStock, transitStock, pendingOrder, purchase, purchaseRounded, returnStock };
    for (const [field, value] of Object.entries(numericFields)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return res.status(400).json({ message: `${field} must be a non-negative number.` });
      }
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });

    const batch = await InventoryBatch.findOneAndUpdate(
      { product: productId, branchName: String(branchName).trim(), batchNumber: String(batchNumber).trim() },
      { $set: {
        packSize, physicalQty, stockLevel, temporaryStock, transitStock, pendingOrder,
        purchase, purchaseRounded, recycleRemarks, returnStock
      }, $setOnInsert: { product: productId, branchName: String(branchName).trim(), batchNumber: String(batchNumber).trim() } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("product", "name category unit price minimumStock");

    res.status(201).json({
      message: "Batch inventory saved. Product-level stock was not changed; reconcile totals before relying on reports.",
      batch
    });
  } catch (error) {
    console.error("Batch save error:", error);
    res.status(error.code === 11000 ? 409 : 400).json({
      message: error.code === 11000 ? "This product, branch and batch already exists." : error.message
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid batch ID." });
    }
    const allowed = [
      "packSize", "physicalQty", "stockLevel", "temporaryStock", "transitStock",
      "pendingOrder", "purchase", "purchaseRounded", "recycleRemarks", "returnStock"
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const batch = await InventoryBatch.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    ).populate("product", "name category unit price minimumStock");
    if (!batch) return res.status(404).json({ message: "Batch not found." });
    res.json({ message: "Batch updated.", batch });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
