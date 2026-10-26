
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// Server initialized with live Gmail SMTP support
require("dotenv").config();

const productRoutes = require("./routes/productRoutes");
const saleRoutes = require("./routes/saleRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const inventoryBatchRoutes = require("./routes/inventoryBatchRoutes");
const stockStatementRoutes = require("./routes/stockStatementRoutes");
const branchRoutes = require("./routes/branchRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/inventory-batches", inventoryBatchRoutes);
app.use("/api/stock-statements", stockStatementRoutes);
app.use("/api/branches", branchRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Business Management API is running"
  });
});

// Health-check route
app.get("/api/health", (req, res) => {
  res.json({
    server: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// Diagnostic route to inspect Telegram API connectivity directly from Render container
app.get("/api/bot-debug", async (req, res) => {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  try {
    const rawRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await rawRes.json().catch((e) => ({ jsonError: e.message }));
    res.json({
      success: true,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10),
      httpStatus: rawRes.status,
      telegramResponse: data
    });
  } catch (err) {
    res.json({
      success: false,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10),
      errorMessage: err.message,
      errorCode: err.code || null,
      errorCause: err.cause ? String(err.cause) : null
    });
  }
});

// Diagnostic route to check Render outbound SMTP port firewall status
app.get("/api/smtp-debug", async (req, res) => {
  const net = require("net");
  function testPort(host, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(4000);
      socket.on("connect", () => {
        socket.destroy();
        resolve({ port, status: "OPEN" });
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve({ port, status: "TIMEOUT_BLOCKED" });
      });
      socket.on("error", (err) => {
        socket.destroy();
        resolve({ port, status: "ERROR", error: err.message });
      });
      socket.connect(port, host);
    });
  }

  const [p465, p587] = await Promise.all([
    testPort("smtp.gmail.com", 465),
    testPort("smtp.gmail.com", 587)
  ]);

  res.json({
    emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{3})(.*)(@.*)/, "$1***$3") : "NOT_SET",
    hasEmailPass: Boolean(process.env.EMAIL_PASS),
    p465,
    p587
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      if (process.env.ENABLE_BOT === "true" || process.env.RUN_BOT === "true") {
        console.log("Starting Telegram bot service...");
        require("./bot");
      }
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
