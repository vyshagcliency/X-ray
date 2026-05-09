#!/usr/bin/env node
/**
 * Generates 3 realistic Amazon FBA brand datasets for smoke testing.
 * Each brand has a different leakage profile to stress different detection rules.
 *
 * Usage: node scripts/generate-smoke-data.mjs
 * Output: tests/smoke/{brand-slug}/{returns,reimbursements,inventory-ledger}.csv
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// --- Deterministic pseudo-random (mulberry32) ---
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Helpers ---
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function pickWeighted(rng, items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}
function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function randFloat(rng, min, max) {
  return +(rng() * (max - min) + min).toFixed(2);
}
function randDate(rng, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  return new Date(s + rng() * (e - s));
}
function fmtDate(d) {
  return d.toISOString().split("T")[0];
}
function orderId(rng) {
  const p1 = String(randInt(rng, 100, 999));
  const p2 = String(randInt(rng, 1000000, 9999999));
  const p3 = String(randInt(rng, 1000000, 9999999));
  return `${p1}-${p2}-${p3}`;
}
function fnsku(rng) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "X00";
  for (let i = 0; i < 7; i++) s += chars[randInt(rng, 0, chars.length - 1)];
  return s;
}
function asin(rng) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "B0";
  for (let i = 0; i < 8; i++) s += chars[randInt(rng, 0, chars.length - 1)];
  return s;
}
function reimbursementId(rng) {
  return String(randInt(rng, 2900000000, 2999999999));
}
function caseId(rng) {
  return rng() > 0.3 ? String(randInt(rng, 1000000000, 9999999999)) : "";
}
function refId(rng) {
  return String(randInt(rng, 1000000000, 9999999999));
}
function licensePlate(rng) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "LPn";
  for (let i = 0; i < 7; i++) s += chars[randInt(rng, 0, chars.length - 1)];
  return s;
}
function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function csvRow(fields) {
  return fields.map(csvEscape).join(",");
}

const FCS = [
  "PHX7", "ONT8", "SBD2", "TEB9", "DFW7", "MQJ1", "JAX4", "ATL6",
  "MDW2", "BFI4", "RIC2", "CLT2", "IND5", "LGB8", "SMF3",
];

const RETURN_REASONS = [
  { value: "DEFECTIVE", weight: 20 },
  { value: "CUSTOMER_RETURN", weight: 35 },
  { value: "BETTER_PRICE_AVAILABLE", weight: 15 },
  { value: "NOT_AS_DESCRIBED", weight: 15 },
  { value: "NO_REASON", weight: 5 },
  { value: "SWITCHEROO", weight: 3 },
  { value: "UNAUTHORIZED_PURCHASE", weight: 4 },
  { value: "MISSED_ESTIMATED_DELIVERY", weight: 3 },
];

const DISPOSITIONS_WEIGHTED = [
  { value: "SELLABLE", weight: 40 },
  { value: "CUSTOMER_DAMAGED", weight: 25 },
  { value: "DEFECTIVE", weight: 20 },
  { value: "CARRIER_DAMAGED", weight: 10 },
  { value: "DAMAGED", weight: 5 },
];

const STATUSES_WEIGHTED = [
  { value: "Refunded", weight: 55 },
  { value: "Unit returned", weight: 35 },
  { value: "Processing", weight: 5 },
  { value: "", weight: 5 },
];

const REIMB_REASONS = [
  { value: "CUSTOMER_RETURN", weight: 40 },
  { value: "WAREHOUSE_LOST", weight: 15 },
  { value: "WAREHOUSE_DAMAGED", weight: 10 },
  { value: "LOST_INBOUND", weight: 10 },
  { value: "INVENTORY_LOST", weight: 8 },
  { value: "INBOUND_DAMAGE", weight: 5 },
  { value: "CARRIER_DAMAGED", weight: 5 },
  { value: "FEE_CORRECTION", weight: 4 },
  { value: "MISSING_FROM_INBOUND", weight: 3 },
];

const REIMB_CONDITIONS = [
  { value: "Sellable", weight: 45 },
  { value: "Damaged", weight: 30 },
  { value: "Defective", weight: 20 },
  { value: "Customer Damaged", weight: 5 },
];

const ADJ_REASONS_LOSS = ["E", "M", "D", "U"];
const ADJ_REASONS_FOUND = ["G", "R", "E", "M"];
const ADJ_DISPOSITIONS = [
  { value: "SELLABLE", weight: 60 },
  { value: "DEFECTIVE", weight: 20 },
  { value: "DAMAGED", weight: 15 },
  { value: "CUSTOMER_DAMAGED", weight: 5 },
];

// --- Brand definitions ---
const DATE_START = new Date("2024-10-01");
const DATE_END = new Date("2026-04-30");

const brands = [
  {
    slug: "novapeak-outdoor",
    name: "NovaPeak Outdoor",
    seed: 42,
    prefix: "NP",
    categories: [
      { code: "TNT", items: ["4-Season Tent 3P", "Ultralight Tent 2P", "Family Tent 6P", "Hammock Tent", "Pop-Up Shelter", "Tent Footprint", "Tent Stakes Set 12pk", "Repair Kit Tent"] },
      { code: "SLP", items: ["Sleeping Bag 20F", "Sleeping Bag 40F", "Sleeping Pad Self-Inflate", "Camping Pillow", "Emergency Bivvy", "Sleeping Bag Liner Silk", "Double Sleeping Bag", "Kid Sleeping Bag"] },
      { code: "CKW", items: ["Camp Stove Portable", "Titanium Cookset 4pc", "Collapsible Kettle", "Insulated Mug 16oz", "Spork Set 4pk", "Camp Grill Foldable", "Water Filter Pump", "Water Bottle 32oz"] },
      { code: "PAK", items: ["Daypack 30L", "Backpack 55L", "Stuff Sack Set 3pk", "Dry Bag 20L", "Compression Sack", "Hip Belt Pouch", "Rain Cover 50L", "Trekking Poles Pair"] },
      { code: "LGT", items: ["Headlamp 800lm", "Lantern Rechargeable", "Flashlight Tactical", "Solar Panel 21W", "Power Bank 20000mAh", "Camp String Lights", "Fire Starter Kit", "Emergency Whistle"] },
      { code: "ACC", items: ["Camping Chair Compact", "Camp Table Foldable", "Hammock Double", "Carabiner Set 6pk", "Paracord 100ft", "Multi-Tool 18in1", "First Aid Kit", "Insect Repellent Bracelet 10pk", "Compass Lensatic", "Camp Towel Quick-Dry"] },
    ],
    // Outdoor gear = high return rate (wrong size, didn't work as expected), moderate value
    returnCount: 2400,
    reimbCount: 1600,
    ledgerCount: 800,
    priceRange: [15, 189],
    // Heavy on damaged returns not reimbursed (returns_gap)
    damagedReturnRate: 0.45,
    reimbMatchRate: 0.55, // Many returns NOT reimbursed
    inventoryLossRate: 0.35,
  },
  {
    slug: "luxenest-home",
    name: "LuxeNest Home",
    seed: 137,
    prefix: "LN",
    categories: [
      { code: "LMP", items: ["Crystal Table Lamp", "Brass Floor Lamp", "Pendant Light Globe", "Wall Sconce Pair", "LED Strip Kit 32ft", "Desk Lamp Adjustable"] },
      { code: "DCR", items: ["Velvet Throw Pillow 20x20", "Faux Fur Throw Blanket", "Linen Curtain Panel 84in", "Macramé Wall Hanging", "Decorative Tray Gold", "Ceramic Vase Set 3pc", "Photo Frame Set 7pc", "Floating Shelf Set 3pk"] },
      { code: "BED", items: ["Egyptian Cotton Sheet Set Queen", "Duvet Cover Linen King", "Memory Foam Pillow 2pk", "Weighted Blanket 15lb", "Mattress Protector Queen", "Silk Pillowcase Set 2pk"] },
      { code: "RUG", items: ["Area Rug 5x7 Moroccan", "Runner Rug 2x8 Vintage", "Bath Mat Set 2pk", "Doormat Coir Natural", "Outdoor Rug 4x6 Stripe"] },
      { code: "ORG", items: ["Closet Organizer System", "Drawer Dividers 8pk", "Storage Ottoman Tufted", "Woven Basket Set 3pk", "Jewelry Organizer Wall", "Shoe Rack 4-Tier"] },
    ],
    // Premium home = moderate returns, high value items, big inventory losses
    returnCount: 1200,
    reimbCount: 900,
    ledgerCount: 1000,
    priceRange: [24, 349],
    damagedReturnRate: 0.30,
    reimbMatchRate: 0.65,
    inventoryLossRate: 0.45, // Heavy inventory loss
  },
  {
    slug: "pureglow-beauty",
    name: "PureGlow Beauty",
    seed: 271,
    prefix: "PG",
    categories: [
      { code: "SKN", items: ["Vitamin C Serum 1oz", "Retinol Night Cream", "Hyaluronic Acid Moisturizer", "Gentle Cleanser 6oz", "Toner Rose Water 8oz", "Eye Cream Anti-Aging", "Sunscreen SPF50 3oz", "Face Oil Rosehip 1oz", "Exfoliating Scrub 4oz", "Sheet Mask Pack 10pk"] },
      { code: "HAR", items: ["Argan Oil Shampoo 16oz", "Deep Conditioner 8oz", "Hair Serum Anti-Frizz", "Heat Protectant Spray", "Scalp Scrub 6oz", "Hair Mask Keratin", "Leave-In Conditioner", "Dry Shampoo Powder"] },
      { code: "BDY", items: ["Body Lotion Shea 12oz", "Body Wash Lavender 16oz", "Sugar Scrub Coffee 8oz", "Body Oil Coconut 4oz", "Hand Cream Set 3pk", "Lip Balm Set 5pk", "Deodorant Natural 2pk", "Bath Bomb Set 12pk"] },
      { code: "MKP", items: ["Foundation Liquid Medium", "Concealer Stick Light", "Setting Powder Translucent", "Mascara Volumizing", "Eyeliner Waterproof", "Lip Gloss Set 4pk", "Blush Palette 6 Shades", "Makeup Brush Set 12pk", "Setting Spray 4oz"] },
      { code: "NLS", items: ["Nail Polish Set 8pk", "Nail Strengthener", "Cuticle Oil Pen", "Gel Top Coat", "Nail File Set 6pk", "Nail Art Kit", "Acetone-Free Remover"] },
      { code: "TOL", items: ["Jade Roller & Gua Sha Set", "Facial Steamer", "LED Face Mask", "Derma Roller 0.25mm", "Makeup Mirror LED", "Hair Dryer Ionic", "Flat Iron Ceramic", "Eyelash Curler", "Tweezers Set 4pk", "Makeup Bag Travel"] },
    ],
    // Beauty = very high volume, low-mid value, lots of refund-not-reimbursed
    returnCount: 3600,
    reimbCount: 2200,
    ledgerCount: 600,
    priceRange: [8, 79],
    damagedReturnRate: 0.25,
    reimbMatchRate: 0.45, // Lots of unmatched refunds
    inventoryLossRate: 0.25,
  },
];

// --- Generate SKU catalog for a brand ---
function generateCatalog(brand, rng) {
  const skus = [];
  for (const cat of brand.categories) {
    for (let i = 0; i < cat.items.length; i++) {
      const num = String(i + 1).padStart(3, "0");
      skus.push({
        sku: `${brand.prefix}-${cat.code}-${num}`,
        fnsku: fnsku(rng),
        asin: asin(rng),
        title: `${brand.name} ${cat.items[i]}`,
        price: randFloat(rng, brand.priceRange[0], brand.priceRange[1]),
      });
    }
  }
  return skus;
}

// --- Generate returns CSV ---
function generateReturns(brand, catalog, rng) {
  const headers = [
    "return-date", "order-id", "sku", "asin", "fnsku", "product-name",
    "quantity", "fulfillment-center-id", "detailed-disposition", "reason",
    "status", "license-plate-number", "customer-comments",
  ];
  const rows = [csvRow(headers)];

  // We need a certain % to be damaged (to trigger returns_gap)
  // and a certain % to be Refunded (to trigger refund_reimbursement_mismatch)
  for (let i = 0; i < brand.returnCount; i++) {
    const item = pick(rng, catalog);
    const date = randDate(rng, DATE_START, DATE_END);
    const isDamaged = rng() < brand.damagedReturnRate;
    const disposition = isDamaged
      ? pick(rng, ["CUSTOMER_DAMAGED", "DEFECTIVE", "CARRIER_DAMAGED", "DAMAGED"])
      : pickWeighted(rng, [
          { value: "SELLABLE", weight: 80 },
          { value: "CUSTOMER_DAMAGED", weight: 10 },
          { value: "DEFECTIVE", weight: 10 },
        ]);
    const status = pickWeighted(rng, STATUSES_WEIGHTED);
    const reason = pickWeighted(rng, RETURN_REASONS);
    const qty = rng() < 0.9 ? 1 : randInt(rng, 2, 4);
    const comment = rng() < 0.08
      ? pick(rng, [
          "Product arrived damaged",
          "Not as described",
          "Wrong color",
          "Missing parts",
          "Stopped working after 2 weeks",
          "Received wrong item",
          "Package was open",
          "Smaller than expected",
          "",
        ])
      : "";

    rows.push(csvRow([
      fmtDate(date), orderId(rng), item.sku, item.asin, item.fnsku, item.title,
      qty, pick(rng, FCS), disposition, reason, status,
      licensePlate(rng), comment,
    ]));
  }
  return rows.join("\n");
}

// --- Generate reimbursements CSV ---
function generateReimbursements(brand, catalog, rng, returns, ledgerLossFnskus) {
  const headers = [
    "approval-date", "reimbursement-id", "case-id", "amazon-order-id",
    "reason", "sku", "fnsku", "asin", "condition", "currency-unit",
    "amount-per-unit", "amount-total", "quantity-reimbursed-cash",
    "quantity-reimbursed-inventory", "quantity-reimbursed-total",
  ];
  const rows = [csvRow(headers)];

  // Generate reimbursements that partially match returns
  // Some are customer_return reimbursements (match orders from returns)
  // Some are warehouse-type reimbursements (no order match)
  const returnLines = returns.split("\n").slice(1).map((line) => {
    const parts = line.split(",");
    return { date: parts[0], orderId: parts[1], sku: parts[2], fnsku: parts[4], asin: parts[3] };
  });

  // Match some returns with reimbursements
  const matchedCount = Math.floor(returnLines.length * brand.reimbMatchRate);
  const shuffled = [...returnLines].sort(() => rng() - 0.5);
  const matched = new Set();

  for (let i = 0; i < matchedCount && i < shuffled.length; i++) {
    const ret = shuffled[i];
    const item = catalog.find((c) => c.sku === ret.sku);
    if (!item) continue;
    matched.add(i);

    const approvalDate = new Date(ret.date);
    approvalDate.setDate(approvalDate.getDate() + randInt(rng, 3, 60));
    if (approvalDate > DATE_END) continue;

    const isCash = rng() < 0.6;
    const amount = isCash ? randFloat(rng, item.price * 0.5, item.price * 1.1) : 0;

    rows.push(csvRow([
      fmtDate(approvalDate), reimbursementId(rng), caseId(rng), ret.orderId,
      "CUSTOMER_RETURN", ret.sku, ret.fnsku, ret.asin,
      pickWeighted(rng, REIMB_CONDITIONS), "USD",
      amount.toFixed(2), amount.toFixed(2),
      isCash ? 1 : 0, isCash ? 0 : 1, 1,
    ]));
  }

  // Add warehouse-type reimbursements (no order, WAREHOUSE_LOST/DAMAGED/etc)
  // IMPORTANT: Only reimburse a subset of FNSKUs that have inventory losses,
  // so the inventory_lost rule can find unreimbursed losses.
  const reimbursedFnskus = new Set();
  const lossFnskuArr = [...ledgerLossFnskus];
  // Only reimburse ~20% of FNSKUs that had losses
  for (const fn of lossFnskuArr) {
    if (rng() < 0.2) reimbursedFnskus.add(fn);
  }

  const warehouseCount = Math.floor(brand.reimbCount * 0.25);
  for (let i = 0; i < warehouseCount; i++) {
    // Pick from the reimbursed subset, or from catalog items without losses
    const useReimbursed = rng() < 0.5 && reimbursedFnskus.size > 0;
    let item;
    if (useReimbursed) {
      const fn = pick(rng, [...reimbursedFnskus]);
      item = catalog.find((c) => c.fnsku === fn) ?? pick(rng, catalog);
    } else {
      // Pick a catalog item whose FNSKU is NOT in the loss set
      const nonLoss = catalog.filter((c) => !ledgerLossFnskus.has(c.fnsku));
      item = nonLoss.length > 0 ? pick(rng, nonLoss) : pick(rng, catalog);
    }

    const date = randDate(rng, DATE_START, DATE_END);
    const reason = pick(rng, ["WAREHOUSE_LOST", "WAREHOUSE_DAMAGED", "INVENTORY_LOST", "LOST_INBOUND", "INBOUND_DAMAGE"]);
    const amount = randFloat(rng, item.price * 0.4, item.price * 0.9);

    rows.push(csvRow([
      fmtDate(date), reimbursementId(rng), caseId(rng), "",
      reason, item.sku, item.fnsku, item.asin,
      pickWeighted(rng, REIMB_CONDITIONS), "USD",
      amount.toFixed(2), amount.toFixed(2),
      1, 0, 1,
    ]));
  }

  // Add some reimbursements with $0 (inventory return, no cash)
  const zeroCount = Math.floor(brand.reimbCount * 0.1);
  for (let i = 0; i < zeroCount; i++) {
    const item = pick(rng, catalog);
    const date = randDate(rng, DATE_START, DATE_END);

    rows.push(csvRow([
      fmtDate(date), reimbursementId(rng), "", "",
      "CUSTOMER_RETURN", item.sku, item.fnsku, item.asin,
      "Sellable", "USD", "0.00", "0.00", 0, 1, 1,
    ]));
  }

  return rows.join("\n");
}

// --- Generate inventory ledger CSV ---
// Returns { csv, lossFnskus } so reimbursement generator can avoid covering all lost FNSKUs
function generateInventoryLedger(brand, catalog, rng) {
  const headers = [
    "Date", "FNSKU", "ASIN", "MSKU", "Title", "Event Type",
    "Reference ID", "Quantity", "Fulfillment Center", "Disposition", "Reason", "Country",
  ];
  const rows = [csvRow(headers)];
  const lossFnskus = new Set();

  // Generate loss events (negative qty)
  const lossCount = Math.floor(brand.ledgerCount * brand.inventoryLossRate);
  for (let i = 0; i < lossCount; i++) {
    const item = pick(rng, catalog);
    const date = randDate(rng, DATE_START, DATE_END);
    const qty = -(randInt(rng, 1, 3));
    const reason = pick(rng, ADJ_REASONS_LOSS);
    const disposition = pickWeighted(rng, ADJ_DISPOSITIONS);
    lossFnskus.add(item.fnsku);

    rows.push(csvRow([
      fmtDate(date), item.fnsku, item.asin, item.sku, item.title,
      "Adjustments", refId(rng), qty, pick(rng, FCS), disposition, reason, "US",
    ]));
  }

  // Generate found events (positive qty) — only for a subset of FNSKUs
  // to ensure some FNSKUs remain with net losses (no recovery)
  const foundFnskus = new Set();
  const lossFnskuArr = [...lossFnskus];
  // Only allow ~30% of loss FNSKUs to have found events
  for (const fn of lossFnskuArr) {
    if (rng() < 0.3) foundFnskus.add(fn);
  }

  const foundCount = Math.floor(lossCount * 0.3);
  for (let i = 0; i < foundCount; i++) {
    // Only pick items whose FNSKU is in the foundFnskus set
    const eligible = catalog.filter((c) => foundFnskus.has(c.fnsku));
    if (eligible.length === 0) break;
    const item = pick(rng, eligible);
    const date = randDate(rng, DATE_START, DATE_END);
    const qty = randInt(rng, 1, 2);
    const reason = pick(rng, ADJ_REASONS_FOUND);

    rows.push(csvRow([
      fmtDate(date), item.fnsku, item.asin, item.sku, item.title,
      "Adjustments", refId(rng), qty, pick(rng, FCS), "SELLABLE", reason, "US",
    ]));
  }

  // Generate misc events (receipts, transfers — noise that rules should ignore)
  const miscCount = brand.ledgerCount - lossCount - foundCount;
  for (let i = 0; i < miscCount; i++) {
    const item = pick(rng, catalog);
    const date = randDate(rng, DATE_START, DATE_END);
    const eventType = pick(rng, ["Receipts", "Shipments", "Customer Returns"]);
    const qty = eventType === "Shipments" ? -(randInt(rng, 1, 10)) : randInt(rng, 1, 10);
    const reason = pick(rng, ["", "CUSTOMER_RETURN", "TRANSFER", ""]);

    rows.push(csvRow([
      fmtDate(date), item.fnsku, item.asin, item.sku, item.title,
      eventType, refId(rng), qty, pick(rng, FCS),
      pickWeighted(rng, ADJ_DISPOSITIONS), reason, "US",
    ]));
  }

  return { csv: rows.join("\n"), lossFnskus };
}

// --- Main ---
const outBase = join(process.cwd(), "tests", "smoke");

for (const brand of brands) {
  const rng = mulberry32(brand.seed);
  const catalog = generateCatalog(brand, rng);

  console.log(`\n${brand.name}: ${catalog.length} SKUs`);

  const dir = join(outBase, brand.slug);
  mkdirSync(dir, { recursive: true });

  // Generate ledger first so we know which FNSKUs have losses
  const { csv: ledger, lossFnskus } = generateInventoryLedger(brand, catalog, rng);
  writeFileSync(join(dir, "inventory-ledger.csv"), ledger);
  const ledLines = ledger.split("\n").length - 1;
  console.log(`  inventory-ledger.csv: ${ledLines} rows (${lossFnskus.size} FNSKUs with losses)`);

  const returns = generateReturns(brand, catalog, rng);
  writeFileSync(join(dir, "returns.csv"), returns);
  const retLines = returns.split("\n").length - 1;
  console.log(`  returns.csv: ${retLines} rows`);

  const reimbursements = generateReimbursements(brand, catalog, rng, returns, lossFnskus);
  writeFileSync(join(dir, "reimbursements.csv"), reimbursements);
  const rmbLines = reimbursements.split("\n").length - 1;
  console.log(`  reimbursements.csv: ${rmbLines} rows`);

  writeFileSync(join(dir, "brand.json"), JSON.stringify({
    name: brand.name,
    slug: brand.slug,
    skuCount: catalog.length,
    priceRange: brand.priceRange,
    dateRange: [fmtDate(DATE_START), fmtDate(DATE_END)],
  }, null, 2));
}

console.log("\nDone. Datasets written to tests/smoke/*/");
