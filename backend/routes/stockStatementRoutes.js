
const express = require("express");
const ExcelJS = require("exceljs");
const InventoryBatch = require("../models/InventoryBatch");

const router = express.Router();

// Prepare the existing batch records for both preview and Excel export.
async function getStatementData(query) {
  const branchName = String(
    query.branchName || "Mumbai Branch"
  ).trim();

  const dateText =
    query.date || new Date().toISOString().slice(0, 10);

  const parsedDate = new Date(`${dateText}T00:00:00.000Z`);

  if (
    !branchName ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateText) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateText
  ) {
    const error = new Error(
      "A valid branchName and date are required."
    );
    error.status = 400;
    throw error;
  }

  const batches = await InventoryBatch.find({ branchName })
    .populate("product", "name category unit minimumStock packSize packSizeUnit");

  const validBatches = batches.filter((batch) => batch.product);

  // Group batches by product ID
  const productMap = new Map();

  for (const batch of validBatches) {
    const prodId = String(batch.product._id);
    if (!productMap.has(prodId)) {
      productMap.set(prodId, {
        product: batch.product,
        batches: []
      });
    }
    productMap.get(prodId).batches.push(batch);
  }

  // Sort products alphabetically by name
  const productGroups = Array.from(productMap.values());
  productGroups.sort((a, b) => {
    const nameA = (a.product?.name || "").trim().toLowerCase();
    const nameB = (b.product?.name || "").trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const rows = productGroups.map((group, index) => {
    const product = group.product;
    const prodBatches = group.batches;

    // Sort batches within product by batchNumber
    prodBatches.sort((a, b) =>
      String(a.batchNumber || "").localeCompare(String(b.batchNumber || ""))
    );

    // If multiple batches, format as "ABC 1112 (28), XYZ-02 (15)"
    // If single batch, format as batch.batchNumber
    const batchNumberDisplay = prodBatches.length > 1
      ? prodBatches.map((b) => `${b.batchNumber} (${Number(b.physicalQty) || 0})`).join(", ")
      : (prodBatches[0]?.batchNumber || "—");

    const batchList = prodBatches.map((b) => ({
      batchNumber: b.batchNumber,
      physicalQty: Number(b.physicalQty) || 0
    }));

    const physicalQtyTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.physicalQty) || 0),
      0
    );
    const transitStockTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.transitStock) || 0),
      0
    );
    const stockLevelTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.stockLevel) || 0),
      0
    ) || product.stockLevel || 0;
    const temporaryStockTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.temporaryStock) || 0),
      0
    );
    const pendingOrderTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.pendingOrder) || 0),
      0
    );
    const purchaseTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.purchase) || 0),
      0
    );
    const purchaseRoundedTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.purchaseRounded) || 0),
      0
    );
    const returnStockTotal = prodBatches.reduce(
      (sum, b) => sum + (Number(b.returnStock) || 0),
      0
    );
    const recycleRemarksJoined = prodBatches
      .map((b) => b.recycleRemarks)
      .filter(Boolean)
      .join("; ");

    const packSizeDisplay = product.packSize
      ? `${product.packSize} ${product.packSizeUnit || "GM"}`
      : (prodBatches[0]?.packSize ? prodBatches[0].packSize.toUpperCase() : "80 GM");

    return {
      slNo: index + 1,
      item: `${product.name}, ${packSizeDisplay}`,
      productName: product.name,
      packSize: packSizeDisplay,
      category: product.category,
      unit: product.unit,
      batchNumber: batchNumberDisplay,
      batches: batchList,
      hasMultipleBatches: prodBatches.length > 1,
      stockLevel: stockLevelTotal,
      temporaryStock: temporaryStockTotal,
      pendingOrder: pendingOrderTotal,
      transitStock: transitStockTotal,
      branchStock: physicalQtyTotal,
      totalStock: physicalQtyTotal + transitStockTotal,
      purchase: purchaseTotal,
      purchaseRounded: purchaseRoundedTotal,
      recycleRemarks: recycleRemarksJoined,
      returnStock: returnStockTotal,
      minimumStock: product.minimumStock || 0
    };
  });

  const totalKeys = [
    "stockLevel",
    "temporaryStock",
    "pendingOrder",
    "transitStock",
    "branchStock",
    "totalStock",
    "purchase",
    "purchaseRounded",
    "returnStock"
  ];

  const totals = {};

  for (const key of totalKeys) {
    totals[key] = rows.reduce(
      (sum, row) => sum + (Number(row[key]) || 0),
      0
    );
  }

  return {
    branchName,
    statementDate: dateText,
    rows,
    totals
  };
}

// Existing website preview API — keep this endpoint working.
router.get("/preview", async (req, res) => {
  try {
    const statement = await getStatementData(req.query);
    return res.json(statement);
  } catch (error) {
    console.error("Stock statement preview error:", error);

    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "Could not generate stock statement preview."
    });
  }
});

// Excel export using the Physical Stock Statement layout.
router.get("/excel", async (req, res) => {
  try {
    const statement = await getStatementData(req.query);
    const workbook = await buildStockStatementWorkbook(statement);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename =
      `Physical-Stock-Statement-${statement.statementDate}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Physical stock statement Excel error:", error);

    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "Could not generate the physical stock statement."
    });
  }
});

// Helper to construct the official company-format workbook
async function buildStockStatementWorkbook(statement) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Delicious Cashew Company";
  workbook.title = "Physical Stock Statement";

  const sheet = workbook.addWorksheet(
    "Physical Stock Statement",
    { views: [{ state: "frozen", ySplit: 10 }] }
  );

  sheet.columns = [
    { width: 9 },   // A: Serial number
    { width: 14 },  // B: Weight
    { width: 19 },  // C: Variety
    { width: 19 },  // D: Merged with C
    { width: 30 },  // E: Batch number
    { width: 18 }   // F: Physical quantity
  ];

  // Company heading and address.
  const heading = [
    "DELICIOUS CASHEW COMPANY",
    "ROOM NO.2/39 SHARMA CHAWL",
    "SADANWADI, LAKE ROAD",
    "BHANDUP WEST, MUMBAI SUBURBAN",
    "MAHARASHTRA 400078",
    "Fssai:11521013000135",
    `Br ${statement.branchName.replace(/\s+Branch$/i, "")}`,
    "",
    `For ${new Date(
      `${statement.statementDate}T00:00:00.000Z`
    ).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    }).replace(/ /g, "-")}`
  ];

  heading.forEach((text, index) => {
    const rowNumber = index + 1;
    sheet.mergeCells(`C${rowNumber}:F${rowNumber}`);
    const cell = sheet.getCell(`C${rowNumber}`);
    cell.value = text;
    cell.alignment = {
      horizontal: "center",
      vertical: "middle"
    };

    if (rowNumber === 1) {
      cell.font = {
        bold: true,
        size: 14,
        color: { argb: "FFFF0000" }
      };
    } else if ([2, 3, 4, 5, 6, 7, 9].includes(rowNumber)) {
      cell.font = {
        size: rowNumber === 9 ? 11 : 10,
        color: { argb: "FFFF0000" },
        bold: rowNumber === 7 || rowNumber === 9
      };
    }
  });

  // Company column headings.
  sheet.mergeCells("C10:D10");

  const headers = [
    ["A10", "SR.NO."],
    ["B10", "WEIGHT"],
    ["C10", "VARIETY"],
    ["E10", "Batch No."],
    ["F10", "PHYSICAL QTY"]
  ];

  headers.forEach(([address, value]) => {
    const cell = sheet.getCell(address);
    cell.value = value;
    cell.font = { bold: true, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" }
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });

  sheet.getRow(10).height = 24;

  let physicalTotal = 0;

  statement.rows.forEach((item, index) => {
    const rowNumber = 11 + index;
    const itemText = item.item || item.productName || "";
    const weight = item.packSize || (itemText.includes(",")
      ? itemText.split(",").pop().trim()
      : "80 GM");
    const variety = (item.productName || itemText)
      .replace(
        /\s*\(\s*\d+(?:\.\d+)?\s*(?:g|kg)\s*\)\s*$/i,
        ""
      )
      .trim();

    sheet.mergeCells(`C${rowNumber}:D${rowNumber}`);

    const values = {
      A: index + 1,
      B: weight,
      C: variety,
      E: item.batchNumber || "",
      F: Number(item.branchStock) || 0
    };

    for (const [column, value] of Object.entries(values)) {
      const cell = sheet.getCell(`${column}${rowNumber}`);
      cell.value = value;
      cell.alignment = {
        vertical: "middle",
        horizontal:
          column === "A" || column === "F"
            ? "center"
            : "left",
        wrapText: true
      };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      };
    }

    physicalTotal += Number(item.branchStock) || 0;
    sheet.getRow(rowNumber).height = 24;
  });

  const totalRowNumber = 11 + statement.rows.length;
  sheet.mergeCells(`C${totalRowNumber}:E${totalRowNumber}`);
  sheet.getCell(`C${totalRowNumber}`).value = "TOTAL";
  sheet.getCell(`C${totalRowNumber}`).font = { bold: true };
  sheet.getCell(`F${totalRowNumber}`).value = physicalTotal;
  sheet.getCell(`F${totalRowNumber}`).font = { bold: true };

  for (let column = 1; column <= 6; column++) {
    sheet.getCell(totalRowNumber, column).border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  }

  sheet.getCell(`C${totalRowNumber}`).alignment = {
    horizontal: "right"
  };

  sheet.getCell(`F${totalRowNumber}`).alignment = {
    horizontal: "center"
  };

  sheet.pageSetup = {
    orientation: "portrait",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2
    }
  };

  return workbook;
}

// POST /api/stock-statements/send-email: One-click email delivery
router.post("/send-email", async (req, res) => {
  try {
    const { branchName, date, recipientEmail } = req.body;
    const statement = await getStatementData({
      branchName: branchName || "Mumbai Branch",
      date: date || new Date().toISOString().slice(0, 10)
    });

    const workbook = await buildStockStatementWorkbook(statement);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Physical-Stock-Statement-${statement.statementDate}.xlsx`;

    const emailService = require("../utils/emailService");
    const result = await emailService.sendExcelEmail({
      to: recipientEmail,
      subject: `Physical Stock Statement - ${statement.branchName} (${statement.statementDate})`,
      filename,
      buffer: Buffer.from(buffer),
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #b91c1c;">DELICIOUS CASHEW COMPANY</h2>
          <p>Please find attached the Physical Stock Statement for <strong>${statement.branchName}</strong> as on <strong>${statement.statementDate}</strong>.</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #f3f4f6;">
              <th>Branch</th>
              <th>Date</th>
              <th>Total Batches</th>
              <th>Total Physical Quantity</th>
            </tr>
            <tr>
              <td>${statement.branchName}</td>
              <td>${statement.statementDate}</td>
              <td align="center">${statement.rows.length}</td>
              <td align="center"><strong>${statement.totals.branchStock || 0}</strong></td>
            </tr>
          </table>
          <p>This statement has been automatically generated by DCC Business Management System.</p>
        </div>
      `
    });

    res.json(result);
  } catch (error) {
    console.error("Stock statement email error:", error);
    res.status(500).json({
      message: error.message || "Could not email the physical stock statement."
    });
  }
});

module.exports = router;
