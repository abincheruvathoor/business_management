const express = require("express");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const InventoryBatch = require("../models/InventoryBatch");

const router = express.Router();

const DEFAULT_BRANCH = "Mumbai Branch";
const DEFAULT_STOCK_LEVEL = 50;
const ROUNDING_MULTIPLE = 10;

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return value !== undefined &&
    value !== null &&
    value !== "" &&
    Number.isFinite(number)
    ? number
    : fallback;
}

function calculatePO(product, branchName) {
  const stockLevel = numberOr(
    product.stockLevel,
    numberOr(product.targetStock, DEFAULT_STOCK_LEVEL)
  );

  const tempStock = numberOr(product.tempStock);
  const pendingOrder1 = numberOr(product.pendingOrder1);
  const pendingOrder2 = numberOr(product.pendingOrder2);
  const pendingOrder3 = numberOr(product.pendingOrder3);
  const transitStock1 = numberOr(product.transitStock1);
  const transitStock2 = numberOr(product.transitStock2);
  const branchStock = numberOr(product.stock);

  const totalStock =
    transitStock1 + transitStock2 + branchStock;

  const purchase =
    stockLevel +
    tempStock +
    pendingOrder1 +
    pendingOrder2 +
    pendingOrder3 -
    totalStock;

  const roundedPurchase =
    purchase < 0
      ? 0
      : Math.round(purchase / ROUNDING_MULTIPLE) *
        ROUNDING_MULTIPLE;

  return {
    productId: product._id,
    name: product.name,
    category: product.category || "",
    packSize: product.packSize,
    packSizeUnit: product.packSizeUnit || "GM",
    branchName,
    stockLevel,
    tempStock,
    pendingOrder1,
    pendingOrder2,
    pendingOrder3,
    transitStock1,
    transitStock2,
    branchStock,
    totalStock,
    purchase,
    roundedPurchase,
    finalPurchase: roundedPurchase,
    recycleStock: numberOr(product.recycleStock),
    recycleRemarks: "",
    returnStock: 0,
  };
}

async function getPOData(branchName = DEFAULT_BRANCH) {
  const products = await Product.find({}).sort({ name: 1 });
  const rows = products.map((product) =>
    calculatePO(product, branchName)
  );

  return {
    branchName,
    generatedAt: new Date(),
    rows,
    totalProducts: rows.length,
    totalQuantity: rows.reduce(
      (sum, row) => sum + row.finalPurchase,
      0
    ),
  };
}

// GET /api/purchases
router.get("/", async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate(
        "product",
        "name category unit price stock minimumStock targetStock packSize packSizeUnit"
      )
      .sort({ createdAt: -1 });

    res.json(purchases);
  } catch (error) {
    console.error("Fetch purchases error:", error);
    res.status(500).json({
      message: "Failed to fetch purchases",
    });
  }
});

// GET /api/purchases/low-stock
router.get("/low-stock", async (req, res) => {
  try {
    const products = await Product.find({
      $expr: {
        $lte: [
          "$stock",
          { $ifNull: ["$minimumStock", 2] },
        ],
      },
    }).sort({ name: 1 });

    res.json({
      branchName: req.query.branchName || DEFAULT_BRANCH,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Low-stock error:", error);
    res.status(500).json({
      message: "Failed to fetch low-stock products",
    });
  }
});

// GET /api/purchases/replenishment/preview
router.get("/replenishment/preview", async (req, res) => {
  try {
    res.json(
      await getPOData(req.query.branchName || DEFAULT_BRANCH)
    );
  } catch (error) {
    console.error("PO preview error:", error);
    res.status(500).json({
      message: "Failed to generate PO preview",
    });
  }
});


// GET /api/purchases/manual/preview
// Separate preview containing only pending manual purchase requests.
router.get("/manual/preview", async (req, res) => {
  try {
    const branchName = req.query.branchName || DEFAULT_BRANCH;

    const requests = await Purchase.find({
      branchName,
      orderType: "Manual",
      status: "Pending",
    })
      .populate(
        "product",
        "name category unit stock packSize packSizeUnit"
      )
      .sort({ createdAt: -1 });

    const rows = requests.map((request) => {
      const product = request.product;

      return {
        purchaseId: request._id,
        productId: product?._id || null,
        productName: product?.name || "Product unavailable",
        packSize: product?.packSize ?? null,
        packSizeUnit: product?.packSizeUnit || "GM",
        quantity: request.quantity,
        unit: product?.unit || "units",
        branchName: request.branchName || branchName,
        status: request.status,
        source: request.source || "website",
        createdAt: request.createdAt,
      };
    });

    res.json({ branchName, count: rows.length, rows });
  } catch (error) {
    console.error("Manual PO preview error:", error);
    res.status(500).json({
      message: "Failed to load Manual PO preview",
    });
  }
});

// GET /api/purchases/manual/excel
// Generates company-format Manual PO Excel matching the Automatic PO generator template exactly
router.get("/manual/excel", async (req, res) => {
  try {
    const branchName = req.query.branchName || DEFAULT_BRANCH;

    const [products, requests] = await Promise.all([
      Product.find({}).sort({ name: 1 }),
      Purchase.find({
        branchName,
        orderType: "Manual",
        status: "Pending",
      })
        .populate("product", "name category unit packSize packSizeUnit")
        .sort({ createdAt: -1 })
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties = {
      calcMode: "auto",
      fullCalcOnLoad: true,
      forceFullCalc: true,
    };
    workbook.creator = "Delicious Cashew Company";
    workbook.created = new Date();

    // Sheet 1: Company Format Manual Purchase Order
    const sheet = workbook.addWorksheet("Mumbai Manual PO");

    sheet.columns = [
      { width: 8 },  // SL NO
      { width: 32 }, // Items
      { width: 14 }, // Pack Size
      { width: 12 }, // Stock Level
      { width: 12 }, // Temp. Stock
      { width: 14 }, // Pending Order 1
      { width: 14 }, // Pending Order 2
      { width: 14 }, // Pending Order 3
      { width: 14 }, // Transit Stock 1
      { width: 14 }, // Transit Stock 2
      { width: 14 }, // Branch Stock
      { width: 12 }, // Total Stock
      { width: 12 }, // Purchase
      { width: 16 }, // Purchase Rounded
      { width: 14 }, // Final Purchase
      { width: 14 }, // Recycle Stock
      { width: 30 }, // Recycle Remarks
      { width: 14 }, // Return Stock
    ];

    sheet.mergeCells("A1:C1");
    sheet.getCell("A1").value = `P.O. DATE: ${new Date().toLocaleDateString("en-GB")}`;

    sheet.mergeCells("D1:R1");
    sheet.getCell("D1").value = "Mumbai Branch Manual Purchase Order";

    sheet.getCell("A1").font = {
      bold: true,
      size: 16,
      color: { argb: "FFFF0000" },
    };

    sheet.getCell("D1").font = {
      bold: true,
      size: 16,
      color: { argb: "FF3333CC" },
      underline: true,
    };

    sheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    sheet.getCell("D1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    sheet.getRow(1).height = 32;

    sheet.mergeCells("F2:H2");
    sheet.getCell("F2").value = "Pending Order";

    sheet.mergeCells("I2:L2");
    sheet.getCell("I2").value = "Branch Stock";

    const headers = [
      "SL NO",
      "Items",
      "Pack Size",
      "Stock Level",
      "Temp. Stock",
      "Pending Order 1",
      "Pending Order 2",
      "Pending Order 3",
      "Transit Stock 1",
      "Transit Stock 2",
      "Branch Stock",
      "Total Stock",
      "Purchase",
      "Purchase Rounded",
      "Final Purchase",
      "Recycle Stock",
      "Recycle Remarks",
      "Return Stock",
    ];

    headers.forEach((heading, index) => {
      sheet.getCell(3, index + 1).value = heading;
    });

    [2, 3].forEach((rowNumber) => {
      const row = sheet.getRow(rowNumber);
      row.font = { bold: true, size: 10 };
      row.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    sheet.getRow(2).height = 24;
    sheet.getRow(3).height = 38;

    products.forEach((product, index) => {
      const r = index + 4;
      const matchingRequests = requests.filter(
        (req) => String(req.product?._id || req.product) === String(product._id)
      );
      const manualQty = matchingRequests.reduce(
        (sum, req) => sum + (Number(req.quantity) || 0),
        0
      );

      const stockLevel = numberOr(product.stockLevel, DEFAULT_STOCK_LEVEL);
      const tempStock = numberOr(product.tempStock);
      const pendingOrder1 = numberOr(product.pendingOrder1);
      const pendingOrder2 = numberOr(product.pendingOrder2);
      const pendingOrder3 = numberOr(product.pendingOrder3);
      const transitStock1 = numberOr(product.transitStock1);
      const transitStock2 = numberOr(product.transitStock2);
      const branchStock = numberOr(product.stock);

      sheet.getCell(`A${r}`).value = index + 1;
      sheet.getCell(`B${r}`).value = product.name;
      sheet.getCell(`C${r}`).value =
        product.packSize != null
          ? `${product.packSize} ${product.packSizeUnit || "GM"}`
          : "Not set";

      sheet.getCell(`D${r}`).value = stockLevel;
      sheet.getCell(`E${r}`).value = tempStock;
      sheet.getCell(`F${r}`).value = pendingOrder1;
      sheet.getCell(`G${r}`).value = pendingOrder2;
      sheet.getCell(`H${r}`).value = pendingOrder3;
      sheet.getCell(`I${r}`).value = transitStock1;
      sheet.getCell(`J${r}`).value = transitStock2;
      sheet.getCell(`K${r}`).value = branchStock;

      sheet.getCell(`L${r}`).value = {
        formula: `SUM(I${r}:K${r})`,
      };

      sheet.getCell(`M${r}`).value = manualQty;
      sheet.getCell(`N${r}`).value = manualQty;
      sheet.getCell(`O${r}`).value = manualQty;

      sheet.getCell(`P${r}`).value = numberOr(product.recycleStock);
      sheet.getCell(`Q${r}`).value = matchingRequests.length > 0 ? "Manual Request" : "";
      sheet.getCell(`R${r}`).value = 0;

      // Color fills matching company template
      sheet.getCell(`D${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };

      ["I", "J", "K"].forEach((column) => {
        sheet.getCell(`${column}${r}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF66FFFF" },
        };
      });

      sheet.getCell(`L${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF99FFCC" },
      };

      sheet.getCell(`O${r}`).font = { bold: true };
    });

    const firstProductRow = 4;
    const lastProductRow = products.length + 3;
    const totalRowNumber = lastProductRow + 1;
    const totalRow = sheet.getRow(totalRowNumber);

    totalRow.getCell(2).value = "TOTAL";

    if (products.length > 0) {
      [
        "D", "E", "F", "G", "H",
        "I", "J", "K", "L", "M",
        "N", "O", "P", "R",
      ].forEach((column) => {
        const colNumber = column.charCodeAt(0) - 64;
        totalRow.getCell(colNumber).value = {
          formula: `SUM(${column}${firstProductRow}:${column}${lastProductRow})`,
        };
      });
    }

    totalRow.font = { bold: true };
    totalRow.height = 24;

    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF999999" } },
          left: { style: "thin", color: { argb: "FF999999" } },
          bottom: { style: "thin", color: { argb: "FF999999" } },
          right: { style: "thin", color: { argb: "FF999999" } },
        };

        if (rowNumber >= 4) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
      });
    });

    totalRow.eachCell((cell) => {
      cell.border = {
        ...cell.border,
        top: { style: "medium", color: { argb: "FF333333" } },
      };
    });

    sheet.views = [{ state: "frozen", ySplit: 3 }];
    sheet.autoFilter = { from: "A3", to: "R3" };

    // Sheet 2: Detailed Request Log
    const logSheet = workbook.addWorksheet("Request Log");
    logSheet.columns = [
      { width: 8 },
      { width: 30 },
      { width: 16 },
      { width: 14 },
      { width: 18 },
      { width: 22 },
      { width: 14 },
    ];

    logSheet.mergeCells("A1:G1");
    logSheet.getCell("A1").value = "MANUAL PURCHASE ORDER - REQUEST LOG";
    logSheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF3333CC" } };
    logSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    logSheet.getRow(1).height = 28;

    const logHeaders = ["SL NO", "Item", "Pack Size", "Quantity", "Branch", "Request Date", "Status"];
    logHeaders.forEach((h, i) => {
      logSheet.getCell(2, i + 1).value = h;
    });
    logSheet.getRow(2).font = { bold: true };
    logSheet.getRow(2).alignment = { horizontal: "center", vertical: "middle" };
    logSheet.getRow(2).height = 24;

    requests.forEach((req, idx) => {
      const p = req.product;
      const pack = p?.packSize != null ? `${p.packSize} ${p.packSizeUnit || "GM"}` : "—";
      logSheet.addRow([
        idx + 1,
        p?.name || "Product unavailable",
        pack,
        req.quantity,
        req.branchName || branchName,
        req.createdAt ? new Date(req.createdAt).toLocaleString("en-IN") : "",
        req.status || "Pending",
      ]);
    });

    if (requests.length === 0) {
      logSheet.mergeCells("A3:G3");
      logSheet.getCell("A3").value = "No pending manual purchase requests.";
      logSheet.getCell("A3").alignment = { horizontal: "center" };
    }

    logSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } },
        };
        if (rowNumber >= 2) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Mumbai_Manual_PO_${new Date().toISOString().slice(0, 10)}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Manual PO Excel export error:", error);
    res.status(500).json({
      message: "Failed to download Manual PO Excel",
    });
  }
});

// POST /api/purchases/replenishment/generate
router.post("/replenishment/generate", async (req, res) => {
  try {
    const branchName = req.body.branchName || DEFAULT_BRANCH;
    const data = await getPOData(branchName);
    const orderRows = data.rows.filter(
      (row) => row.finalPurchase > 0
    );
    const savedPurchases = [];

    for (const row of orderRows) {
      let purchase = await Purchase.findOne({
        product: row.productId,
        branchName,
        orderType: "Low Stock",
        status: "Pending",
      });

      if (purchase) {
        purchase.quantity = row.finalPurchase;
        purchase.unitCost = 0;
        purchase.totalCost = 0;
        await purchase.save();
      } else {
        purchase = await Purchase.create({
          product: row.productId,
          branchName,
          orderType: "Low Stock",
          quantity: row.finalPurchase,
          unitCost: 0,
          totalCost: 0,
          status: "Pending",
          source: "website",
        });
      }

      savedPurchases.push(purchase);
    }

    res.status(201).json({
      message: savedPurchases.length
        ? "Mumbai purchase orders generated successfully."
        : "No products require ordering under the current PO rules.",
      created: savedPurchases.length,
      purchases: savedPurchases,
      totalQuantity: orderRows.reduce(
        (sum, row) => sum + row.finalPurchase,
        0
      ),
    });
  } catch (error) {
    console.error("Generate PO error:", error);
    res.status(500).json({
      message: "Failed to generate purchase orders",
    });
  }
});

// GET /api/purchases/replenishment/excel
router.get("/replenishment/excel", async (req, res) => {
  try {
    const branchName = req.query.branchName || DEFAULT_BRANCH;
    const data = await getPOData(branchName);
    const workbook = buildAutomaticPOWorkbook(data);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Mumbai_PO_Generator.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("PO Excel export error:", error);
    res.status(500).json({
      message: "Failed to download PO Excel",
    });
  }
});

function buildAutomaticPOWorkbook(data) {
  const workbook = new ExcelJS.Workbook();

  workbook.calcProperties = {
    calcMode: "auto",
    fullCalcOnLoad: true,
    forceFullCalc: true,
  };

  workbook.creator = "Delicious Cashew Company";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Mumbai PO Generator");

  sheet.columns = [
    { width: 8 },
    { width: 32 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 30 },
    { width: 14 },
  ];

  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value =
    `P.O. DATE: ${new Date().toLocaleDateString("en-GB")}`;

  sheet.mergeCells("D1:R1");
  sheet.getCell("D1").value = "Mumbai Branch P. O Generator";

  sheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FFFF0000" },
  };

  sheet.getCell("D1").font = {
    bold: true,
    size: 16,
    color: { argb: "FF3333CC" },
    underline: true,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  sheet.getCell("D1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  sheet.getRow(1).height = 32;

  sheet.mergeCells("F2:H2");
  sheet.getCell("F2").value = "Pending Order";

  sheet.mergeCells("I2:L2");
  sheet.getCell("I2").value = "Branch Stock";

  const headers = [
    "SL NO",
    "Items",
    "Pack Size",
    "Stock Level",
    "Temp. Stock",
    "Pending Order 1",
    "Pending Order 2",
    "Pending Order 3",
    "Transit Stock 1",
    "Transit Stock 2",
    "Branch Stock",
    "Total Stock",
    "Purchase",
    "Purchase Rounded",
    "Final Purchase",
    "Recycle Stock",
    "Recycle Remarks",
    "Return Stock",
  ];

  headers.forEach((heading, index) => {
    sheet.getCell(3, index + 1).value = heading;
  });

  [2, 3].forEach((rowNumber) => {
    const row = sheet.getRow(rowNumber);
    row.font = { bold: true, size: 10 };
    row.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });

  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 38;

  data.rows.forEach((row, index) => {
    const r = index + 4;

    sheet.getCell(`A${r}`).value = index + 1;
    sheet.getCell(`B${r}`).value = row.name;
    sheet.getCell(`C${r}`).value =
      row.packSize != null
        ? `${row.packSize} ${row.packSizeUnit}`
        : "Not set";

    sheet.getCell(`D${r}`).value = row.stockLevel;
    sheet.getCell(`E${r}`).value = row.tempStock;
    sheet.getCell(`F${r}`).value = row.pendingOrder1;
    sheet.getCell(`G${r}`).value = row.pendingOrder2;
    sheet.getCell(`H${r}`).value = row.pendingOrder3;
    sheet.getCell(`I${r}`).value = row.transitStock1;
    sheet.getCell(`J${r}`).value = row.transitStock2;
    sheet.getCell(`K${r}`).value = row.branchStock;

    sheet.getCell(`L${r}`).value = {
      formula: `SUM(I${r}:K${r})`,
    };

    sheet.getCell(`M${r}`).value = {
      formula: `SUM(D${r}:H${r})-L${r}`,
    };

    sheet.getCell(`N${r}`).value = {
      formula: `IF(M${r}<0,0,ROUND(M${r}/10,0)*10)`,
    };

    sheet.getCell(`O${r}`).value = {
      formula: `N${r}`,
    };

    sheet.getCell(`P${r}`).value = row.recycleStock;
    sheet.getCell(`Q${r}`).value = row.recycleRemarks;
    sheet.getCell(`R${r}`).value = row.returnStock;

    sheet.getCell(`D${r}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    };

    ["I", "J", "K"].forEach((column) => {
      sheet.getCell(`${column}${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF66FFFF" },
      };
    });

    sheet.getCell(`L${r}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF99FFCC" },
    };

    sheet.getCell(`N${r}`).font = { bold: true };
  });

  const firstProductRow = 4;
  const lastProductRow = data.rows.length + 3;
  const totalRowNumber = lastProductRow + 1;
  const totalRow = sheet.getRow(totalRowNumber);

  totalRow.getCell(2).value = "TOTAL";

  if (data.rows.length > 0) {
    [
      "D", "E", "F", "G", "H",
      "I", "J", "K", "L", "M",
      "N", "O", "P", "R",
    ].forEach((column) => {
      const colNumber = column.charCodeAt(0) - 64;
      totalRow.getCell(colNumber).value = {
        formula: `SUM(${column}${firstProductRow}:${column}${lastProductRow})`,
      };
    });
  }

  totalRow.font = { bold: true };
  totalRow.height = 24;

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF999999" } },
        left: { style: "thin", color: { argb: "FF999999" } },
        bottom: { style: "thin", color: { argb: "FF999999" } },
        right: { style: "thin", color: { argb: "FF999999" } },
      };

      if (rowNumber >= 4) {
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      }
    });
  });

  totalRow.eachCell((cell) => {
    cell.border = {
      ...cell.border,
      top: { style: "medium", color: { argb: "FF333333" } },
    };
  });

  sheet.views = [{ state: "frozen", ySplit: 3 }];
  sheet.autoFilter = { from: "A3", to: "R3" };

  return workbook;
}

// POST /api/purchases/replenishment/send-email: One-click email delivery of Automatic PO
router.post("/replenishment/send-email", async (req, res) => {
  try {
    const branchName = req.body.branchName || DEFAULT_BRANCH;
    const recipientEmail = req.body.recipientEmail;
    const data = await getPOData(branchName);
    const workbook = buildAutomaticPOWorkbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Mumbai_PO_Generator_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const emailService = require("../utils/emailService");
    const result = await emailService.sendExcelEmail({
      to: recipientEmail,
      subject: `Automatic Purchase Order - ${branchName} (${new Date().toLocaleDateString("en-GB")})`,
      filename,
      buffer: Buffer.from(buffer),
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #1e3a8a;">DELICIOUS CASHEW COMPANY</h2>
          <p>Please find attached the Automatic Purchase Order calculation workbook for <strong>${branchName}</strong>.</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #f3f4f6;">
              <th>Branch</th>
              <th>Total Products</th>
              <th>Total Recommended Purchase Qty</th>
              <th>Generated At</th>
            </tr>
            <tr>
              <td>${branchName}</td>
              <td align="center">${data.totalProducts}</td>
              <td align="center"><strong>${data.totalQuantity}</strong></td>
              <td>${new Date().toLocaleString("en-IN")}</td>
            </tr>
          </table>
          <p>This workbook was generated automatically under the DCC replenishment rules.</p>
        </div>
      `
    });

    res.json(result);
  } catch (error) {
    console.error("PO send email error:", error);
    res.status(500).json({
      message: error.message || "Failed to email Purchase Order"
    });
  }
});

// POST /api/purchases
// Create a manual purchase request. It does not change stock.
router.post("/", async (req, res) => {
  try {
    const { productId, quantity, source, branchName } = req.body;
    const qty = Number(quantity);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than zero",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const purchase = await Purchase.create({
      product: product._id,
      branchName: branchName || DEFAULT_BRANCH,
      orderType: "Manual",
      quantity: qty,
      unitCost: 0,
      totalCost: 0,
      source: ["website", "telegram", "whatsapp"].includes(source)
        ? source
        : "website",
      status: "Pending",
    });

    res.status(201).json({
      message: "Purchase request created. Stock has not changed.",
      purchase,
    });
  } catch (error) {
    console.error("Create purchase error:", error);
    res.status(500).json({
      message: "Failed to create purchase request",
    });
  }
});

// POST /api/purchases/generate
router.post("/generate", async (req, res) => {
  try {
    const { productId, quantity, branchName } = req.body;
    const qty = Number(quantity);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than zero",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const purchase = await Purchase.create({
      product: product._id,
      branchName: branchName || DEFAULT_BRANCH,
      orderType: "Low Stock",
      quantity: qty,
      unitCost: 0,
      totalCost: 0,
      source: "website",
      status: "Pending",
    });

    res.status(201).json({
      message: "Purchase request created. Stock has not changed.",
      purchase,
    });
  } catch (error) {
    console.error("Generate purchase error:", error);
    res.status(500).json({
      message: "Failed to create purchase request",
    });
  }
});

// PATCH /api/purchases/:id/receive
// Stock is updated only when a pending purchase is received.
router.patch("/:id/receive", async (req, res) => {
  let purchase;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid purchase ID",
      });
    }

    purchase = await Purchase.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "Pending",
      },
      {
        $set: {
          status: "Received",
          receivedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!purchase) {
      return res.status(404).json({
        message: "Pending purchase not found or already received",
      });
    }

    const product = await Product.findById(purchase.product);

    if (!product) {
      await Purchase.findByIdAndUpdate(purchase._id, {
        $set: {
          status: "Pending",
          receivedAt: null,
        },
      });

      return res.status(404).json({
        message: "Product not found; order remains pending",
      });
    }

    const branch = purchase.branchName || DEFAULT_BRANCH;
    const requestedBatchNumber = req.body?.batchNumber ? String(req.body.batchNumber).trim() : null;

    let batch = null;
    if (requestedBatchNumber) {
      batch = await InventoryBatch.findOne({
        product: product._id,
        branchName: branch,
        batchNumber: requestedBatchNumber
      });

      if (!batch) {
        batch = await InventoryBatch.create({
          product: product._id,
          branchName: branch,
          batchNumber: requestedBatchNumber,
          physicalQty: purchase.quantity,
          packSize: product.packSize ? `${product.packSize}GM` : "80g"
        });
      } else {
        batch.physicalQty = (Number(batch.physicalQty) || 0) + purchase.quantity;
        await batch.save();
      }
    } else {
      // Find latest active batch for this product
      batch = await InventoryBatch.findOne({
        product: product._id,
        branchName: branch
      }).sort({ updatedAt: -1 });

      if (batch) {
        batch.physicalQty = (Number(batch.physicalQty) || 0) + purchase.quantity;
        await batch.save();
      } else {
        const defaultBatchNo = `MUM-${product.mnemonicCode || "BATCH"}-${new Date().getFullYear()}`;
        batch = await InventoryBatch.create({
          product: product._id,
          branchName: branch,
          batchNumber: defaultBatchNo,
          physicalQty: purchase.quantity,
          packSize: product.packSize ? `${product.packSize}GM` : "80g"
        });
      }
    }

    // Keep product.stock equal to sum of all batches
    const batchTotals = await InventoryBatch.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: null, total: { $sum: "$physicalQty" } } }
    ]);
    const totalBatchStock = batchTotals[0]?.total || 0;
    product.stock = totalBatchStock;
    product.branchStock = totalBatchStock;
    await product.save();

    res.json({
      message: `Purchase marked received. Batch ${batch.batchNumber} updated (+${purchase.quantity}). Total stock is now ${product.stock} packs.`,
      product: product.name,
      updatedStock: product.stock,
      batchNumber: batch.batchNumber,
      purchase,
    });
  } catch (error) {
    console.error("Receive purchase error:", error);

    if (purchase) {
      await Purchase.findOneAndUpdate(
        {
          _id: purchase._id,
          status: "Received",
        },
        {
          $set: {
            status: "Pending",
            receivedAt: null,
          },
        }
      ).catch(() => {});
    }

    res.status(500).json({
      message: "Failed to receive purchase",
    });
  }
});

module.exports = router;