require("dotenv").config();

const { Telegraf, Markup, session } = require("telegraf");

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiBase = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const branchName = process.env.DEFAULT_BRANCH_NAME || "Mumbai Branch";

if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in backend/.env");
}

const bot = new Telegraf(token);
bot.use(session());

// Deduplication cache for Telegram update delivery
const processedUpdates = new Map();

bot.use((ctx, next) => {
  const updateId = ctx.update?.update_id;
  if (updateId) {
    if (processedUpdates.has(updateId)) {
      return;
    }
    processedUpdates.set(updateId, Date.now());

    // Clean updates older than 2 minutes
    const cutoff = Date.now() - 120000;
    for (const [id, timestamp] of processedUpdates.entries()) {
      if (timestamp < cutoff) processedUpdates.delete(id);
    }
  }
  return next();
});

const allowedIds = (process.env.ALLOWED_TELEGRAM_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

function isAllowed(ctx) {
  return allowedIds.includes(String(ctx.from?.id));
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `API error ${response.status}`);
  }

  return data;
}

// Clean product label: e.g. "Cashew - BBQ 80GM"
function cleanProductLabel(p) {
  const pack = p.packSize ? `${p.packSize}GM` : (p.unit === "pack" ? "80GM" : "");
  return `${p.name} ${pack}`.trim();
}

function formatProductStock(product, qty = product.stock) {
  const val = Number(qty) || 0;
  const packSize = Number(product.packSize) || (product.unit === "kg" ? 1000 : 80);
  const grams = val * packSize;
  const packUnit = product.packSizeUnit || "GM";
  return `${val} packs (${grams.toLocaleString("en-IN")} ${packUnit})`;
}

function getCompactMnemonic(product, qty = product.stock) {
  const code = (product.mnemonicCode || product.name.slice(0, 2)).toUpperCase();
  const val = Number(qty) || 0;
  if (/\d$/.test(code)) {
    return `I${code}-${val}`;
  }
  return `I${code}${val}`;
}

// Telegram Menu
function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Record Sale", "MENU_SALE"),
      Markup.button.callback("Check Inventory", "MENU_INVENTORY")
    ],
    [
      Markup.button.callback("Update Stock", "MENU_UPDATE")
    ]
  ]);
}

function cancelButtons() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Cancel", "CANCEL_FLOW")]
  ]);
}

async function showProducts(ctx, operation) {
  const products = await api("/api/products");

  if (!Array.isArray(products) || products.length === 0) {
    return ctx.reply("No products have been added yet.", mainMenu());
  }

  let eligibleProducts = products;

  // For sales, show products with available stock
  if (operation === "sale") {
    eligibleProducts = products.filter((p) => Number(p.stock) > 0);

    if (!eligibleProducts.length) {
      return ctx.reply(
        `No products with available stock found for ${branchName}.`,
        mainMenu()
      );
    }
  }

  ctx.session.flow = {
    ...(ctx.session?.flow || {}),
    operation,
    step: "selectProduct"
  };

  // Clean, uncluttered product buttons (2 columns if short, 1 if longer)
  const buttons = eligibleProducts.map((product) => [
    Markup.button.callback(cleanProductLabel(product), `PROD_${product._id}`)
  ]);

  buttons.push([Markup.button.callback("Cancel", "CANCEL_FLOW")]);

  const messages = {
    sale: ctx.session.flow.invoiceNumber
      ? `Invoice: ${ctx.session.flow.invoiceNumber}\nCustomer: ${ctx.session.flow.vendorName}\nSelect next product to add:`
      : "Select product to sell:",
    inventory: "Select product to check inventory:",
    inventoryUpdate: "Select product to update stock:"
  };

  return ctx.reply(messages[operation] || "Select product:", Markup.inlineKeyboard(buttons));
}

bot.command("myid", async (ctx) => {
  await ctx.reply(`Your Telegram user ID is: ${ctx.from.id}`);
});

bot.command("stock", async (ctx) => {
  if (!isAllowed(ctx)) return;
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) {
    return ctx.reply("Usage: /stock <mnemonic_code>\nExample: /stock C or /stock CP80");
  }
  return handleMnemonicLookup(ctx, args);
});

bot.start(async (ctx) => {
  if (!isAllowed(ctx)) {
    return ctx.reply(
      `Your Telegram ID is ${ctx.from.id}. Ask the project administrator to authorize this ID.`
    );
  }

  ctx.session = {};
  return ctx.reply(
    "Welcome to Cashew Business Management!\n\n" +
    "Choose an option below or send a mnemonic code (e.g. C, CR, CP80, CC80, CS80, CO80, CB80) to quickly check stock:",
    mainMenu()
  );
});

bot.action(/^MENU_(SALE|INVENTORY|UPDATE)$/, async (ctx) => {
  await ctx.answerCbQuery();

  if (!isAllowed(ctx)) {
    return ctx.reply("You are not authorized to use this bot.");
  }

  const op = ctx.match[1];

  if (op === "SALE") {
    // Initiate sale flow: first ask for customer/vendor name
    ctx.session = {
      flow: {
        operation: "sale",
        step: "askVendorName"
      }
    };
    return ctx.reply("Enter Customer / Retailer name:", cancelButtons());
  }

  if (op === "INVENTORY") {
    return showProducts(ctx, "inventory");
  }

  if (op === "UPDATE") {
    return showProducts(ctx, "inventoryUpdate");
  }
});

bot.action("CANCEL_FLOW", async (ctx) => {
  await ctx.answerCbQuery("Cancelled");
  ctx.session = {};
  return ctx.reply("Operation cancelled.", mainMenu());
});

// Product selected handler
bot.action(/^PROD_([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCbQuery();

  if (!isAllowed(ctx)) {
    return ctx.reply("You are not authorized to use this bot.");
  }

  const productId = ctx.match[1];
  const flow = ctx.session?.flow;

  if (!flow || flow.step !== "selectProduct") {
    return ctx.reply("Please start again with /start.");
  }

  try {
    const products = await api("/api/products");
    const product = products.find((item) => String(item._id) === productId);

    if (!product) {
      ctx.session = {};
      return ctx.reply("Product not found. Please start again with /start.");
    }

    // CHECK INVENTORY OUTPUT
    if (flow.operation === "inventory") {
      const batches = product.batches || [];
      const batchSummary = batches.length > 0
        ? batches.map((b) => `${b.batchNumber} (${b.physicalQty} packs)`).join(", ")
        : "No active batches";

      const compact = getCompactMnemonic(product);

      ctx.session = {};
      return ctx.reply(
        `Product: ${cleanProductLabel(product)}\n` +
        `Compact Mnemonic: ${compact}\n` +
        `Current Stock: ${product.stock} packs\n` +
        `Batches: ${batchSummary}`,
        mainMenu()
      );
    }

    // SALE FLOW: Pick batch or enter quantity
    if (flow.operation === "sale") {
      const batchesResponse = await api(
        `/api/inventory-batches?branchName=${encodeURIComponent(branchName)}&productId=${encodeURIComponent(productId)}`
      );
      const batches = Array.isArray(batchesResponse) ? batchesResponse : (batchesResponse.value || []);
      const availableBatches = batches.filter((b) => Number(b.physicalQty) > 0);

      if (!availableBatches.length) {
        return ctx.reply(
          `No available stock found for ${cleanProductLabel(product)}. Please select another product.`,
          cancelButtons()
        );
      }

      // If only 1 batch, automatically select it!
      if (availableBatches.length === 1) {
        const b = availableBatches[0];
        ctx.session.flow = {
          ...flow,
          productId,
          productName: cleanProductLabel(product),
          batchId: String(b._id),
          batchNumber: b.batchNumber,
          batchAvailable: Number(b.physicalQty),
          step: "quantity"
        };

        return ctx.reply(
          `Selected: ${cleanProductLabel(product)}\n` +
          `Batch: ${b.batchNumber} (Available: ${b.physicalQty} packs)\n` +
          `Enter number of packs sold:`,
          cancelButtons()
        );
      }

      // Multiple batches: let staff pick batch
      ctx.session.flow = {
        ...flow,
        productId,
        productName: cleanProductLabel(product),
        step: "selectBatch"
      };

      const buttons = availableBatches.map((b) => [
        Markup.button.callback(`Batch ${b.batchNumber} (${b.physicalQty} packs)`, `BATCH_${b._id}`)
      ]);
      buttons.push([Markup.button.callback("Cancel", "CANCEL_FLOW")]);

      return ctx.reply(
        `Product: ${cleanProductLabel(product)}\nSelect batch:`,
        Markup.inlineKeyboard(buttons)
      );
    }

    // UPDATE STOCK FLOW
    if (flow.operation === "inventoryUpdate") {
      ctx.session.flow = {
        ...flow,
        productId,
        productName: cleanProductLabel(product),
        step: "adjustmentType"
      };

      return ctx.reply(
        `Product: ${cleanProductLabel(product)}\nCurrent Stock: ${product.stock} packs\nChoose action:`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("➕ Add Stock", "ADJUST_ADD"),
            Markup.button.callback("➖ Reduce Stock", "ADJUST_REDUCE")
          ],
          [Markup.button.callback("Cancel", "CANCEL_FLOW")]
        ])
      );
    }
  } catch (error) {
    console.error("Product selection error:", error);
    return ctx.reply(`Operation failed: ${error.message}`, mainMenu());
  }
});

// Batch selection for sale
bot.action(/^BATCH_([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCbQuery();

  const flow = ctx.session?.flow;
  if (!flow || flow.operation !== "sale" || flow.step !== "selectBatch") {
    return ctx.reply("Selection expired. Please start again with /start.");
  }

  try {
    const batchesResponse = await api(
      `/api/inventory-batches?branchName=${encodeURIComponent(branchName)}&productId=${encodeURIComponent(flow.productId)}`
    );
    const batches = Array.isArray(batchesResponse) ? batchesResponse : (batchesResponse.value || []);
    const batch = batches.find((item) => String(item._id) === ctx.match[1]);

    if (!batch || Number(batch.physicalQty) <= 0) {
      return ctx.reply("That batch has no available stock. Please choose another.", cancelButtons());
    }

    ctx.session.flow = {
      ...flow,
      batchId: String(batch._id),
      batchNumber: batch.batchNumber,
      batchAvailable: Number(batch.physicalQty),
      step: "quantity"
    };

    return ctx.reply(
      `Batch: ${batch.batchNumber} (Available: ${batch.physicalQty} packs)\n` +
      `Enter number of packs sold:`,
      cancelButtons()
    );
  } catch (error) {
    console.error("Batch selection error:", error);
    return ctx.reply(`Could not load batch: ${error.message}`, mainMenu());
  }
});

// Multi-product sale continuation action
bot.action("ADD_ANOTHER_PRODUCT_SAME_INVOICE", async (ctx) => {
  await ctx.answerCbQuery();
  const flow = ctx.session?.flow;
  if (!flow || !flow.invoiceNumber) {
    return ctx.reply("Sale session ended. Start a new sale with /start.", mainMenu());
  }

  // Keep same invoiceNumber and vendorName, return to product selection!
  ctx.session.flow = {
    operation: "sale",
    invoiceNumber: flow.invoiceNumber,
    vendorName: flow.vendorName,
    step: "selectProduct"
  };

  return showProducts(ctx, "sale");
});

bot.action("COMPLETE_SALE_SESSION", async (ctx) => {
  await ctx.answerCbQuery("Sale Completed");
  const invoice = ctx.session?.flow?.invoiceNumber || "";
  ctx.session = {};
  return ctx.reply(
    `✅ Sale session completed${invoice ? ` for Invoice ${invoice}` : ""}!\nAll records saved to database.`,
    mainMenu()
  );
});

// Update stock: Add or Reduce
bot.action(/^ADJUST_(ADD|REDUCE)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const flow = ctx.session?.flow;
  if (!flow || flow.step !== "adjustmentType") {
    return ctx.reply("Please start again with /start.");
  }

  const op = ctx.match[1] === "ADD" ? "add" : "reduce";
  ctx.session.flow = { ...flow, adjustment: op, step: "adjustmentQuantity" };

  return ctx.reply(
    `${op === "add" ? "Adding" : "Reducing"} stock for ${flow.productName}.\nEnter number of packs:`,
    cancelButtons()
  );
});

// Choose batch for Add Stock
bot.action(/^SET_BATCH_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const flow = ctx.session?.flow;
  if (!flow || flow.step !== "selectUpdateBatch") {
    return ctx.reply("Adjustment session expired. Please start again with /start.");
  }

  const batchChoice = ctx.match[1];
  if (batchChoice === "NEW") {
    ctx.session.flow = { ...flow, step: "askNewBatchNumber" };
    return ctx.reply("Enter new batch number (e.g. MUM-2026-02):", cancelButtons());
  }

  // Existing batch selected
  ctx.session.flow = { ...flow, batchNumber: batchChoice, step: "confirmAdjustment" };
  return confirmAdjustmentMessage(ctx, flow.productName, flow.adjustment, flow.quantity, batchChoice);
});

async function confirmAdjustmentMessage(ctx, productName, adjustment, quantity, batchNumber) {
  return ctx.reply(
    `Confirm stock adjustment:\n\n` +
    `Product: ${productName}\n` +
    `Action: ${adjustment === "add" ? "➕ Add" : "➖ Reduce"} ${quantity} packs\n` +
    `Batch: ${batchNumber || "Default Branch Batch"}\n\n` +
    `Proceed?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Confirm", "CONFIRM_ADJUST")],
      [Markup.button.callback("Cancel", "CANCEL_FLOW")]
    ])
  );
}

bot.action("CONFIRM_ADJUST", async (ctx) => {
  await ctx.answerCbQuery();

  const flow = ctx.session?.flow;
  if (!flow || flow.step !== "confirmAdjustment") {
    return ctx.reply("This adjustment is no longer pending. Please start again.");
  }

  try {
    const result = await api(`/api/products/${flow.productId}/adjust-stock`, {
      method: "PATCH",
      body: JSON.stringify({
        operation: flow.adjustment,
        quantity: flow.quantity,
        batchNumber: flow.batchNumber
      })
    });

    ctx.session = {};
    return ctx.reply(
      `✅ Stock updated successfully!\n\n` +
      `Product: ${result.product.name}\n` +
      `Batch: ${flow.batchNumber || result.batch?.batchNumber || "Updated"}\n` +
      `Adjustment: ${flow.adjustment === "add" ? "+" : "-"}${flow.quantity} packs\n` +
      `Total Stock: ${result.product.stock} packs`,
      mainMenu()
    );
  } catch (error) {
    console.error("Inventory adjustment error:", error);
    ctx.session = {};
    return ctx.reply(`Could not update stock: ${error.message}`, mainMenu());
  }
});

async function handleMnemonicLookup(ctx, rawCode) {
  try {
    let cleanCode = String(rawCode).trim().toUpperCase();
    if (cleanCode.startsWith("I") && cleanCode.length > 1) {
      cleanCode = cleanCode.slice(1);
    }

    const products = await api("/api/products");
    const product = products.find(
      (p) => p.mnemonicCode && p.mnemonicCode.trim().toUpperCase() === cleanCode
    );

    if (!product) {
      const validCodes = products
        .filter((p) => p.mnemonicCode)
        .map((p) => `${p.mnemonicCode} (${cleanProductLabel(p)})`)
        .join("\n• ");

      return ctx.reply(
        `❌ Mnemonic "${rawCode}" not recognized.\n\nAvailable codes:\n• ${validCodes}\n\nExample: send "C" or "CP80"`,
        mainMenu()
      );
    }

    const batches = product.batches || [];
    const batchSummary = batches.length > 0
      ? batches.map((b) => `${b.batchNumber} (${b.physicalQty} packs)`).join(", ")
      : "No active batches";

    const compact = getCompactMnemonic(product);

    return ctx.reply(
      `Product: ${cleanProductLabel(product)}\n` +
      `Compact Mnemonic: ${compact}\n` +
      `Current Stock: ${product.stock} packs\n` +
      `Batches: ${batchSummary}`,
      mainMenu()
    );
  } catch (error) {
    console.error("Mnemonic lookup error:", error);
    return ctx.reply(`Could not perform stock lookup: ${error.message}`, mainMenu());
  }
}

bot.on("text", async (ctx) => {
  if (!isAllowed(ctx)) return;

  const text = ctx.message.text.trim();
  const flow = ctx.session?.flow;

  // If no interactive flow, check if input is a mnemonic code
  if (!flow) {
    const isMnemonicCandidate = /^[A-Za-z0-9]{1,8}$/.test(text) && !text.startsWith("/");
    if (isMnemonicCandidate) {
      return handleMnemonicLookup(ctx, text);
    }
    return ctx.reply(
      "Welcome to Cashew Business Management!\n\n" +
      "Choose an operation below, or send a product mnemonic (e.g. C, CR, CP80, CC80, CS80, CO80, CB80) to check stock:",
      mainMenu()
    );
  }

  try {
    // Step: Ask Customer/Vendor Name
    if (flow.step === "askVendorName" && flow.operation === "sale") {
      if (!text || text.length > 160) {
        return ctx.reply("Enter customer/vendor name (up to 160 characters):");
      }
      ctx.session.flow = { ...flow, vendorName: text, step: "askInvoiceNumber" };
      return ctx.reply(`Customer: ${text}\nNow enter Invoice Number (e.g. INV-1001):`, cancelButtons());
    }

    // Step: Ask Invoice Number
    if (flow.step === "askInvoiceNumber" && flow.operation === "sale") {
      if (!text || text.length > 50) {
        return ctx.reply("Enter valid invoice number (e.g. INV-1001):");
      }
      ctx.session.flow = { ...flow, invoiceNumber: text.toUpperCase(), step: "selectProduct" };
      return showProducts(ctx, "sale");
    }

    // Step: Sale Quantity
    if (flow.step === "quantity" && flow.operation === "sale") {
      const val = Number(text);
      if (!Number.isFinite(val) || val <= 0) {
        return ctx.reply("Enter a valid quantity greater than zero:");
      }
      if (val > flow.batchAvailable) {
        return ctx.reply(`Only ${flow.batchAvailable} packs available in this batch. Enter smaller quantity:`);
      }

      // Record Sale directly
      const result = await api("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          productId: flow.productId,
          batchId: flow.batchId,
          batchNumber: flow.batchNumber,
          branchName,
          quantity: val,
          vendorName: flow.vendorName,
          invoiceNumber: flow.invoiceNumber,
          source: "telegram"
        })
      });

      const currentInvoice = flow.invoiceNumber;
      const currentVendor = flow.vendorName;

      // Ask if user wants to add another product to the same invoice
      ctx.session.flow = {
        operation: "sale",
        invoiceNumber: currentInvoice,
        vendorName: currentVendor
      };

      return ctx.reply(
        `✅ Sale Recorded!\n\n` +
        `Invoice: ${currentInvoice}\n` +
        `Customer: ${currentVendor}\n` +
        `Product: ${flow.productName}\n` +
        `Batch: ${result.sale.batchNumber || flow.batchNumber}\n` +
        `Quantity: ${val} packs\n` +
        `Remaining Stock: ${result.remainingStock} packs\n\n` +
        `Do you want to add another product for Invoice ${currentInvoice}?`,
        Markup.inlineKeyboard([
          [Markup.button.callback(`➕ Add Another Product to ${currentInvoice}`, "ADD_ANOTHER_PRODUCT_SAME_INVOICE")],
          [Markup.button.callback("✅ Complete Sale", "COMPLETE_SALE_SESSION")]
        ])
      );
    }

    // Step: Adjustment Quantity
    if (flow.step === "adjustmentQuantity" && flow.operation === "inventoryUpdate") {
      const val = Number(text);
      if (!Number.isFinite(val) || val <= 0) {
        return ctx.reply("Enter a valid number greater than zero:");
      }

      ctx.session.flow = { ...flow, quantity: val };

      // Fetch active batches for this product
      const batchesResponse = await api(
        `/api/inventory-batches?branchName=${encodeURIComponent(branchName)}&productId=${encodeURIComponent(flow.productId)}`
      );
      const batches = Array.isArray(batchesResponse) ? batchesResponse : (batchesResponse.value || []);

      if (flow.adjustment === "add") {
        // Ask for batch number: either pick existing or enter new
        ctx.session.flow.step = "selectUpdateBatch";

        const batchButtons = batches.map((b) => [
          Markup.button.callback(`Batch ${b.batchNumber} (${b.physicalQty} packs)`, `SET_BATCH_${b.batchNumber}`)
        ]);
        batchButtons.push([Markup.button.callback("➕ Enter New Batch Number", "SET_BATCH_NEW")]);
        batchButtons.push([Markup.button.callback("Cancel", "CANCEL_FLOW")]);

        return ctx.reply(
          `Adding ${val} packs for ${flow.productName}.\nSelect existing batch or create a new one:`,
          Markup.inlineKeyboard(batchButtons)
        );
      } else {
        // Reduce: pick which batch to reduce from
        if (!batches.length) {
          ctx.session = {};
          return ctx.reply("No batches found to reduce from.", mainMenu());
        }

        ctx.session.flow.step = "selectUpdateBatch";
        const batchButtons = batches.map((b) => [
          Markup.button.callback(`Batch ${b.batchNumber} (${b.physicalQty} packs)`, `SET_BATCH_${b.batchNumber}`)
        ]);
        batchButtons.push([Markup.button.callback("Cancel", "CANCEL_FLOW")]);

        return ctx.reply(
          `Reducing ${val} packs from ${flow.productName}.\nSelect batch to reduce from:`,
          Markup.inlineKeyboard(batchButtons)
        );
      }
    }

    // Step: New Batch Number input for Add Stock
    if (flow.step === "askNewBatchNumber" && flow.operation === "inventoryUpdate") {
      if (!text || text.length > 50) {
        return ctx.reply("Enter a valid batch number (e.g. MUM-2026-02):");
      }
      ctx.session.flow = { ...flow, batchNumber: text.toUpperCase(), step: "confirmAdjustment" };
      return confirmAdjustmentMessage(ctx, flow.productName, flow.adjustment, flow.quantity, text.toUpperCase());
    }

    return ctx.reply("Please follow the prompt or send /start.", cancelButtons());
  } catch (error) {
    console.error("Telegram error:", error);
    return ctx.reply(`Error: ${error.message}`, mainMenu());
  }
});

bot.catch((error) => {
  console.error("Telegram bot error:", error);
});

bot.launch()
  .then(() => console.log("Telegram bot is running"))
  .catch((error) => {
    console.error("Failed to start Telegram bot:", error.message);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
