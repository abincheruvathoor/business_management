const express = require("express");
const User = require("../models/User");

const router = express.Router();

// Helper to ensure initial admin user exists in MongoDB Atlas
async function ensureAdminUser() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("Seeding initial admin user with bcrypt hashing...");
      await User.create({
        username: "admin",
        password: process.env.ADMIN_INITIAL_PASSWORD || "admin123",
        displayName: "Admin Manager",
        role: "Authorized Administrator",
        branchName: "Mumbai Branch"
      });
      console.log("Initial admin user created successfully.");
    }
  } catch (error) {
    console.error("Failed to seed initial admin user:", error.message);
  }
}

// POST: Login endpoint
router.post("/login", async (req, res) => {
  try {
    await ensureAdminUser();

    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        branchName: user.branchName
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error during authentication." });
  }
});

// POST: Change password endpoint (authenticated users)
router.post("/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const user = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password does not match." });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
