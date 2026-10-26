const express = require("express");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const InventoryBatch = require("../models/InventoryBatch");
const Branch = require("../models/Branch");

const router = express.Router();

function calculateEquivalentWeightKg(product, quantity = product.stock) {
  const qty = Number(quantity) || 0;
  const unit = String(product.unit || "").toLowerCase();
  const packSize = Number(product.packSize) || (unit === "kg" ? 1000 : 80);

  if (unit === "kg") {
    return qty;
  }
  // Pack-based: packs * packSize in grams / 1000
  return Number(((qty * packSize) / 1000).toFixed(2));
}

// GET /api/dashboard - Dashboard summary with company-level and branch-level support
router.get("/", async (req, res) => {
  try {
    const { branchName } = req.query;
    const isAllBranches = !branchName || branchName === "all" || branchName === "All Branches";

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Start of seven-day chart
    const chartStart = new Date(startOfToday);
    chartStart.setDate(chartStart.getDate() - 6);

    // Build branch filters
    const purchaseFilter = {};
    if (!isAllBranches) {
      purchaseFilter.branchName = String(branchName).trim();
    }

    const [
      products,
      todaySalesResult,
      monthSalesResult,
      todayPurchasesResult,
      monthPurchasesResult,
      pendingPurchases,
      recentSales,
      chartSales,
      batchBreakdown,
      branches
    ] = await Promise.all([
      Product.find().sort({ name: 1 }),

      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lte: endOfToday }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            packs: { $sum: "$quantity" },
            count: { $sum: 1 }
          }
        }
      ]),

      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            packs: { $sum: "$quantity" },
            count: { $sum: 1 }
          }
        }
      ]),

      Purchase.aggregate([
        {
          $match: {
            status: "Received",
            receivedAt: { $gte: startOfToday, $lte: endOfToday },
            ...(isAllBranches ? {} : { branchName: String(branchName).trim() })
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalCost" },
            count: { $sum: 1 }
          }
        }
      ]),

      Purchase.aggregate([
        {
          $match: {
            status: "Received",
            receivedAt: { $gte: startOfMonth, $lte: endOfMonth },
            ...(isAllBranches ? {} : { branchName: String(branchName).trim() })
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalCost" },
            count: { $sum: 1 }
          }
        }
      ]),

      Purchase.find({
        status: "Pending",
        ...purchaseFilter
      })
        .populate("product", "name unit packSize packSizeUnit")
        .sort({ createdAt: -1 }),

      Sale.find()
        .populate("product", "name unit packSize packSizeUnit")
        .populate("batch", "batchNumber branchName")
        .sort({ createdAt: -1 })
        .limit(8),

      Sale.find({
        createdAt: { $gte: chartStart, $lte: endOfToday }
      }).select("totalAmount quantity createdAt"),

      InventoryBatch.aggregate([
        {
          $group: {
            _id: "$branchName",
            totalPhysicalQty: { $sum: "$physicalQty" },
            batchCount: { $sum: 1 }
          }
        }
      ]),

      Branch.find({ isActive: true }).sort({ name: 1 })
    ]);

    // Product stock evaluations (All products are packet based in DCC)
    const lowStockProducts = [];

    products.forEach((p) => {
      const stock = Number(p.stock) || 0;
      const minStock = Number(p.minimumStock) || 50;
      const weightKg = calculateEquivalentWeightKg(p, stock);

      if (stock <= minStock) {
        lowStockProducts.push({
          _id: p._id,
          name: p.name,
          category: p.category,
          stock,
          unit: p.unit || "pack",
          packSize: p.packSize,
          packSizeUnit: p.packSizeUnit || "GM",
          minimumStock: minStock,
          weightKg
        });
      }
    });

    // 7-day sales overview tracking recorded sales count and packets sold
    const salesOverview = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(chartStart);
      date.setDate(chartStart.getDate() + i);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const daySales = chartSales.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= date && saleDate < nextDate;
      });

      const salesCount = daySales.length;
      const packsSold = daySales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
      const total = daySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

      salesOverview.push({
        date: date.toISOString().slice(0, 10),
        day: date.toLocaleDateString("en-IN", { weekday: "short" }),
        salesCount,
        packsSold,
        total
      });
    }

    // Branch breakdown for company monitoring
    const branchNames = new Set([
      "Mumbai Branch",
      ...branches.map((b) => b.name),
      ...batchBreakdown.map((b) => b._id)
    ]);

    const branchSummary = Array.from(branchNames).map((bName) => {
      const batchData = batchBreakdown.find((b) => b._id === bName);
      const pendingCount = pendingPurchases.filter((p) => (p.branchName || "Mumbai Branch") === bName).length;

      return {
        branchName: bName,
        totalPhysicalQty: batchData?.totalPhysicalQty || 0,
        batchCount: batchData?.batchCount || 0,
        pendingPOCount: pendingCount
      };
    });

    res.json({
      selectedBranch: isAllBranches ? "All Branches" : branchName,
      isAllBranches,
      todaySales: todaySalesResult[0]?.total || 0,
      todaySalesCount: todaySalesResult[0]?.count || 0,
      todayPacksSold: todaySalesResult[0]?.packs || 0,
      monthSales: monthSalesResult[0]?.total || 0,
      monthPacksSold: monthSalesResult[0]?.packs || 0,
      todayPurchases: todayPurchasesResult[0]?.total || 0,
      monthPurchases: monthPurchasesResult[0]?.total || 0,
      totalProducts: products.length,
      lowStockItems: lowStockProducts.length,
      lowStockProducts,
      criticalBelow5kgCount: 0,
      criticalBelow5kgProducts: [],
      pendingPOCount: pendingPurchases.length,
      pendingPurchaseOrders: pendingPurchases.map((p) => ({
        id: p._id,
        productName: p.product?.name || "Product unavailable",
        quantity: p.quantity,
        unit: p.product?.unit || "units",
        branchName: p.branchName || "Mumbai Branch",
        orderType: p.orderType,
        source: p.source,
        createdAt: p.createdAt
      })),
      branchSummary,
      salesOverview,
      recentTransactions: recentSales.map((sale) => ({
        id: sale._id,
        invoiceNumber: sale.invoiceNumber || "—",
        product: sale.product?.name || "Deleted product",
        type: "Sale",
        quantity: sale.quantity,
        unit: sale.product?.unit || "units",
        packSize: sale.product?.packSize,
        packSizeUnit: sale.product?.packSizeUnit,
        amount: sale.totalAmount,
        source: sale.source,
        branch: sale.batch?.branchName || "Mumbai Branch",
        time: sale.createdAt
      }))
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});

// GET /api/dashboard/reports - Real business analytics from database
router.get("/reports", async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      allProducts,
      currentMonthSales,
      prevMonthSales,
      currentMonthPurchases,
      totalSalesCount,
      totalPurchasesCount,
      salesBySource,
      topSellingProducts,
      batches
    ] = await Promise.all([
      Product.find().sort({ name: 1 }),

      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfCurrentMonth } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalQty: { $sum: "$quantity" },
            count: { $sum: 1 }
          }
        }
      ]),

      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" }
          }
        }
      ]),

      Purchase.aggregate([
        {
          $match: {
            status: "Received",
            receivedAt: { $gte: startOfCurrentMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalCost: { $sum: "$totalCost" },
            totalQty: { $sum: "$quantity" },
            count: { $sum: 1 }
          }
        }
      ]),

      Sale.countDocuments(),
      Purchase.countDocuments(),

      Sale.aggregate([
        {
          $group: {
            _id: "$source",
            revenue: { $sum: "$totalAmount" },
            count: { $sum: 1 }
          }
        }
      ]),

      Sale.aggregate([
        {
          $group: {
            _id: "$product",
            totalRevenue: { $sum: "$totalAmount" },
            totalSold: { $sum: "$quantity" }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 7 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } }
      ]),

      InventoryBatch.find().populate("product", "name unit packSize packSizeUnit")
    ]);

    const curRev = currentMonthSales[0]?.totalRevenue || 0;
    const prevRev = prevMonthSales[0]?.totalRevenue || 0;
    const growthPercent = prevRev > 0
      ? Number((((curRev - prevRev) / prevRev) * 100).toFixed(1))
      : 0;

    // Inventory weight and packaging totals
    let totalStockPacks = 0;
    let totalStockKg = 0;
    let totalEstimatedValue = 0;

    allProducts.forEach((p) => {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      totalEstimatedValue += stock * price;

      if (p.unit === "pack") {
        totalStockPacks += stock;
        totalStockKg += (stock * (Number(p.packSize) || 80)) / 1000;
      } else {
        totalStockKg += stock;
      }
    });

    res.json({
      monthName: now.toLocaleString("en-IN", { month: "long", year: "numeric" }),
      monthlySalesRevenue: curRev,
      monthlySalesCount: currentMonthSales[0]?.count || 0,
      monthlyPurchasesCost: currentMonthPurchases[0]?.totalCost || 0,
      monthlyPurchasesCount: currentMonthPurchases[0]?.count || 0,
      growthPercent,
      totalTransactions: totalSalesCount + totalPurchasesCount,
      totalSalesCount,
      totalPurchasesCount,
      inventorySummary: {
        totalProducts: allProducts.length,
        totalStockPacks,
        totalStockKg: Number(totalStockKg.toFixed(2)),
        totalEstimatedValue: Number(totalEstimatedValue.toFixed(2)),
        totalBatches: batches.length
      },
      salesBySource: salesBySource.map((s) => ({
        source: s._id || "website",
        revenue: s.revenue,
        count: s.count
      })),
      topProducts: topSellingProducts.map((item) => ({
        name: item.productDetails?.name || "Product",
        category: item.productDetails?.category || "Dry Fruits",
        totalRevenue: item.totalRevenue,
        totalSold: item.totalSold,
        unit: item.productDetails?.unit || "units"
      }))
    });
  } catch (error) {
    console.error("Reports API error:", error);
    res.status(500).json({ message: "Failed to generate business reports" });
  }
});

module.exports = router;
