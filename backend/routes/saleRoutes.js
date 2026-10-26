const express = require("express");
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const InventoryBatch = require("../models/InventoryBatch");

const router = express.Router();

router.post("/", async (req, res) => {
  const {
    productId, quantity, source = "website", batchId,
    batchNumber, vendorName = "", invoiceNumber = "", branchName = "Mumbai Branch"
  } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Quantity must be greater than zero." });
  }
  if (!["website", "telegram", "whatsapp"].includes(source)) {
    return res.status(400).json({ message: "Invalid sale source." });
  }
  if (typeof vendorName !== "string" || vendorName.trim().length > 160) {
    return res.status(400).json({ message: "Vendor/customer name must be 160 characters or fewer." });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });

    // Pack-based products must specify batchId or batchNumber
    if (product.unit === "pack" && !batchId && !batchNumber) {
      return res.status(400).json({
        message: "Select a batch before recording a sale for pack-based inventory."
      });
    }

    let batch = null;
    let remainingStock;

    if (batchId || batchNumber) {
      if (batchId && !mongoose.isValidObjectId(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID." });
      }

      const batchFilter = {
        product: productId,
        branchName: String(branchName).trim()
      };
      if (batchId) batchFilter._id = batchId;
      else batchFilter.batchNumber = String(batchNumber).trim();

      batch = await InventoryBatch.findOneAndUpdate(
        { ...batchFilter, physicalQty: { $gte: quantity } },
        { $inc: { physicalQty: -quantity } },
        { new: true }
      );

      if (!batch) {
        return res.status(400).json({
          message: "Batch not found for this product and branch, or its physical stock is insufficient."
        });
      }

      remainingStock = batch.physicalQty;

      try {
        const totalAmount = Number((product.price * quantity).toFixed(2));
        const sale = await Sale.create({
          product: product._id,
          batch: batch._id,
          batchNumber: batch.batchNumber,
          vendorName: vendorName.trim(),
          invoiceNumber: invoiceNumber ? String(invoiceNumber).trim().toUpperCase() : "",
          quantity,
          unitPrice: product.price,
          totalAmount,
          source
        });

        // For pack products, keep Product.stock equal to the sum of all batch
        // quantities. Do not mix the legacy generic Cashew record measured in kg.
        if (product.unit === "pack") {
          const batchTotals = await InventoryBatch.aggregate([
            { $match: { product: product._id } },
            { $group: { _id: null, total: { $sum: "$physicalQty" } } }
          ]);
          const totalBatchStock = batchTotals[0]?.total || 0;
          await Product.updateOne(
            { _id: product._id },
            { $set: { stock: totalBatchStock, branchStock: totalBatchStock } }
          );
        }

        return res.status(201).json({
          message: "Sale recorded successfully.",
          sale,
          remainingStock: product.unit === "pack" ? (await Product.findById(product._id)).stock : remainingStock,
          batchRemainingStock: batch.physicalQty
        });
      } catch (error) {
        // Roll back the batch quantity if sale creation or follow-up fails.
        await InventoryBatch.updateOne(
          { _id: batch._id },
          { $inc: { physicalQty: quantity } }
        );
        throw error;
      }
    }

    // Backward-compatible product-level sales for legacy non-pack products.
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(400).json({ message: "Insufficient product-level stock." });
    }

    try {
      const totalAmount = Number((product.price * quantity).toFixed(2));
      const sale = await Sale.create({
        product: product._id,
        batch: null,
        batchNumber: "",
        vendorName: vendorName.trim(),
        invoiceNumber: invoiceNumber ? String(invoiceNumber).trim().toUpperCase() : "",
        quantity,
        unitPrice: product.price,
        totalAmount,
        source
      });

      return res.status(201).json({
        message: "Sale recorded successfully.",
        sale,
        remainingStock: updatedProduct.stock
      });
    } catch (error) {
      await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
      throw error;
    }
  } catch (error) {
    console.error("Sale error:", error);
    res.status(500).json({ message: error.message || "Could not record sale." });
  }
});

router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("product", "name unit price")
      .populate("batch", "batchNumber branchName")
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
