const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const InventoryBatch = require("../models/InventoryBatch");

const router = express.Router();

// GET: View all products with their active batches and counts
router.get("/", async (req, res) => {
  try {
    const [products, batches] = await Promise.all([
      Product.find().sort({ createdAt: -1 }),
      InventoryBatch.find().sort({ batchNumber: 1 })
    ]);

    const productsWithBatches = products.map((p) => {
      const pBatches = batches.filter((b) => String(b.product) === String(p._id));
      return {
        ...p.toObject(),
        batches: pBatches.map((b) => ({
          id: b._id,
          batchNumber: b.batchNumber,
          physicalQty: Number(b.physicalQty) || 0,
          branchName: b.branchName
        }))
      };
    });

    res.json(productsWithBatches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Add a product
router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const mnemonicCode = String(req.body.mnemonicCode || "").trim().toUpperCase();

    if (!name) {
      return res.status(400).json({ message: "Product name is required." });
    }

    // Check duplicate name
    const existingName = await Product.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") }
    });
    if (existingName) {
      return res.status(400).json({ message: `A product with name "${name}" already exists.` });
    }

    // Check duplicate mnemonic code if provided
    if (mnemonicCode) {
      const existingCode = await Product.findOne({ mnemonicCode });
      if (existingCode) {
        return res.status(400).json({ message: `Mnemonic code "${mnemonicCode}" is already in use by ${existingCode.name}.` });
      }
    }

    const initialStock = Number(req.body.stock) || 0;
    const packSize = req.body.packSize != null ? Number(req.body.packSize) : 80;

    const payload = {
      ...req.body,
      name,
      ...(mnemonicCode ? { mnemonicCode } : {}),
      price: Number(req.body.price) || 0,
      stock: initialStock,
      branchStock: initialStock,
      minimumStock: Number(req.body.minimumStock) || 50,
      unit: "pack",
      packSize,
      packSizeUnit: req.body.packSizeUnit || "GM"
    };

    const product = await Product.create(payload);

    // Create initial inventory batch if initial stock > 0
    if (initialStock > 0) {
      const batchNumber = `MUM-${mnemonicCode || "B1"}-01`;
      await InventoryBatch.create({
        product: product._id,
        branchName: "Mumbai Branch",
        batchNumber,
        physicalQty: initialStock,
        packSize: `${packSize}GM`
      });
    }

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET: View one product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const batches = await InventoryBatch.find({ product: product._id }).sort({ batchNumber: 1 });

    res.json({
      ...product.toObject(),
      batches: batches.map((b) => ({
        id: b._id,
        batchNumber: b.batchNumber,
        physicalQty: Number(b.physicalQty) || 0,
        branchName: b.branchName
      }))
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT: Update a product
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE: Delete a product
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await InventoryBatch.deleteMany({ product: req.params.id });
    res.json({ message: "Product and associated batches deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH: Adjust stock and synchronize batch + product stock
router.patch("/:id/adjust-stock", async (req, res) => {
  try {
    const { operation, quantity, batchNumber, batchId, branchName = "Mumbai Branch" } = req.body;

    if (!["add", "reduce"].includes(operation)) {
      return res.status(400).json({ message: 'Operation must be "add" or "reduce".' });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "Quantity must be a number greater than zero." });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    let batch = null;
    if (batchId && mongoose.isValidObjectId(batchId)) {
      batch = await InventoryBatch.findById(batchId);
    } else if (batchNumber && String(batchNumber).trim()) {
      batch = await InventoryBatch.findOne({
        product: product._id,
        branchName,
        batchNumber: String(batchNumber).trim()
      });
    }

    if (operation === "add") {
      if (!batch) {
        const bNum = batchNumber && String(batchNumber).trim()
          ? String(batchNumber).trim()
          : `MUM-${product.mnemonicCode || "BATCH"}-${new Date().getFullYear()}`;
        batch = await InventoryBatch.create({
          product: product._id,
          branchName,
          batchNumber: bNum,
          physicalQty: qty,
          packSize: product.packSize ? `${product.packSize}GM` : "80g"
        });
      } else {
        batch.physicalQty = (Number(batch.physicalQty) || 0) + qty;
        await batch.save();
      }
    } else {
      // Reduce
      if (!batch) {
        batch = await InventoryBatch.findOne({
          product: product._id,
          branchName,
          physicalQty: { $gte: qty }
        });
      }

      if (!batch || (Number(batch.physicalQty) || 0) < qty) {
        return res.status(400).json({
          message: batch ? `Batch ${batch.batchNumber} has only ${batch.physicalQty} packs.` : "No batch found with sufficient stock."
        });
      }

      batch.physicalQty = (Number(batch.physicalQty) || 0) - qty;
      await batch.save();
    }

    // Keep Product.stock strictly equal to sum of all batches
    const batchTotals = await InventoryBatch.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: null, total: { $sum: "$physicalQty" } } }
    ]);
    const totalBatchStock = batchTotals[0]?.total || 0;
    product.stock = totalBatchStock;
    product.branchStock = totalBatchStock;
    await product.save();

    return res.json({
      message: `Inventory updated successfully. Batch ${batch.batchNumber} is now ${batch.physicalQty} packs.`,
      adjustment: { operation, quantity: qty, batchNumber: batch.batchNumber },
      product,
      batch
    });
  } catch (error) {
    console.error("Inventory adjustment error:", error);
    return res.status(500).json({ message: "Failed to update inventory." });
  }
});

module.exports = router;
