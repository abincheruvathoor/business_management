const express = require("express");
const mongoose = require("mongoose");
const InventoryBatch = require("../models/InventoryBatch");
const Product = require("../models/Product");
const Branch = require("../models/Branch");
const router = express.Router();

async function getOrCreateMumbaiBranch() {
  let branch = await Branch.findOne({ code: "MUM" });
  if (!branch) branch = await Branch.create({ name: "Mumbai Branch", code: "MUM" });
  return branch;
}

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.productId && mongoose.isValidObjectId(req.query.productId)) filter.product = req.query.productId;
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) filter.branch = req.query.branchId;
    if (req.query.available === "true") filter.stock = { $gt: 0 };
    const batches = await InventoryBatch.find(filter).populate("product", "name category unit price minimumStock").populate("branch", "name code").sort({ createdAt: -1 });
    res.json(batches);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { productId, batchNumber, stock } = req.body;
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Valid productId is required." });
    if (!String(batchNumber || "").trim()) return res.status(400).json({ message: "Batch number is required." });
    if (!Number.isFinite(stock) || stock < 0) return res.status(400).json({ message: "Stock must be zero or greater." });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });
    let branch;
    if (req.body.branchId && mongoose.isValidObjectId(req.body.branchId)) branch = await Branch.findById(req.body.branchId);
    else branch = await getOrCreateMumbaiBranch();
    if (!branch) return res.status(404).json({ message: "Branch not found." });
    const batch = await InventoryBatch.create({
      product: product._id, branch: branch._id, batchNumber: String(batchNumber).trim(),
      stock, temporaryStock: Number(req.body.temporaryStock || 0),
      transitStock: Number(req.body.transitStock || 0),
      pendingOrderStock: Number(req.body.pendingOrderStock || 0),
      recycleRemarks: req.body.recycleRemarks || "", returnStock: Number(req.body.returnStock || 0)
    });
    // Product.stock remains the legacy aggregate used by the existing dashboard/bot.
    await Product.updateOne({ _id: product._id }, { $inc: { stock } });
    res.status(201).json(await InventoryBatch.findById(batch._id).populate("product", "name unit").populate("branch", "name code"));
  } catch (error) {
    res.status(400).json({ message: error.code === 11000 ? "That batch already exists for this product and branch." : error.message });
  }
});

router.patch("/:id/adjust", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid batch ID." });
    const { operation, quantity } = req.body;
    if (!["add", "reduce"].includes(operation) || !Number.isFinite(quantity) || quantity <= 0)
      return res.status(400).json({ message: "Provide operation add/reduce and a positive quantity." });
    const condition = { _id: req.params.id };
    if (operation === "reduce") condition.stock = { $gte: quantity };
    const batch = await InventoryBatch.findOneAndUpdate(condition, { $inc: { stock: operation === "add" ? quantity : -quantity } }, { new: true });
    if (!batch) return res.status(400).json({ message: "Batch not found or insufficient batch stock." });
    await Product.updateOne({ _id: batch.product }, { $inc: { stock: operation === "add" ? quantity : -quantity } });
    res.json({ message: "Batch stock adjusted.", batch });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
