const express = require("express");
const Branch = require("../models/Branch");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let branches = await Branch.find({ isActive: true }).sort({ name: 1 });
    if (branches.length === 0) {
      await Branch.create({
        name: "Mumbai Branch",
        code: "MUM",
        address: "Sadanwadi, Lake Road, Bhandup West, Mumbai Suburban, Maharashtra 400078",
        isActive: true
      });
      branches = await Branch.find({ isActive: true }).sort({ name: 1 });
    }
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!name || !code) return res.status(400).json({ message: "Branch name and code are required." });
    const branch = await Branch.create({ name, code, address: req.body.address || "" });
    res.status(201).json(branch);
  } catch (error) { res.status(400).json({ message: error.code === 11000 ? "Branch name or code already exists." : error.message }); }
});

module.exports = router;
