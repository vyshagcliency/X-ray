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
  {
    // DEMO HERO BRAND — Consumer Electronics (real referral rate 8%). Planted
    // overcharges surface as "Amazon charged the default 15% on an 8% category" —
    // the sharpest referral-fee story for the LinkedIn demo. Safe synthetic data.
    slug: "halcyon-audio",
    name: "Halcyon Audio",
    seed: 909,
    prefix: "HA",
    categories: [
      { code: "HDP", items: ["Over-Ear ANC Headphones", "Wireless Studio Headphones", "Sport Headphones", "Audiophile Open-Back Headphones", "Kids Volume-Safe Headphones", "Gaming Headset Pro", "On-Ear Foldable Headphones", "Bone-Conduction Headphones"] },
      { code: "EAR", items: ["True Wireless Earbuds Pro", "Noise-Cancelling Earbuds", "Sport Earbuds Secure-Fit", "Mini Earbuds", "Open-Ear Clip Earbuds", "Budget Wireless Earbuds", "Earbuds Pro Max"] },
      { code: "SPK", items: ["Portable Bluetooth Speaker", "Waterproof Adventure Speaker", "Smart Home Speaker", "Compact Soundbar", "Party Speaker XL", "Bookshelf Speaker Pair", "Clip-On Shower Speaker"] },
      { code: "CHG", items: ["65W USB-C Charger", "Wireless Charge Pad", "Power Bank 10000mAh", "Power Bank 20000mAh", "3-in-1 Charging Dock", "Dual Car Charger", "GaN Wall Charger 100W"] },
      { code: "CBL", items: ["USB-C Cable 6ft 2pk", "Braided Lightning Cable", "HDMI 2.1 Cable 4K", "USB-C to USB-C 100W Cable", "Audio Aux Splitter", "Magnetic Cable Organizer"] },
      { code: "ACC", items: ["Aluminum Headphone Stand", "Hard Carrying Case", "Earbud Charging Case Cover", "Desk Phone Mount", "Screen Protector 3pk", "Microfiber Cleaning Kit", "Replacement Ear Cushions"] },
    ],
    // Premium audio = mid-high value, healthy volume, moderate returns
    returnCount: 2000,
    reimbCount: 1400,
    ledgerCount: 900,
    priceRange: [25, 249],
    damagedReturnRate: 0.30,
    reimbMatchRate: 0.55,
    inventoryLossRate: 0.35,
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

// --- Phase 1.5: payout-integrity reports ---
// Each brand maps to one Amazon referral category (drives the referral-rate check).
// Names match src/lib/rules/reference/referral-rates.ts exactly so the join lands.
const PRODUCT_GROUP_BY_SLUG = {
  "novapeak-outdoor": "Sports and Outdoors", // flat 15%
  "luxenest-home": "Home and Kitchen", // flat 15%
  "pureglow-beauty": "Beauty, Health and Personal Care", // 8% ≤$10 / 15% above
  "halcyon-audio": "Consumer Electronics", // flat 8% — overcharge shows as 15%
};

// P0.6: real Amazon Fee Preview `product-group` CODES (not the clean category labels).
// Emitting codes forces the referral rule through reference/product-group-map.ts instead
// of the identity/label path — so a broken/incomplete map surfaces as a loud smoke-test
// failure now (the D6 class), not silently on the first real CSV. Each code below MUST
// map to the referral category above in product-group-map.ts, or the planted overcharges
// stop reconciling. (Amazon's code enum isn't public; these are the well-known ones.)
const PRODUCT_GROUP_CODE_BY_SLUG = {
  "novapeak-outdoor": "sporting_goods", // → Sports and Outdoors
  "luxenest-home": "home_garden", // → Home and Kitchen
  "pureglow-beauty": "hpc", // → Beauty, Health and Personal Care
  "halcyon-audio": "ce", // → Consumer Electronics
};

// Mirrors the progressive model in referral-rates.ts so planted data is self-consistent.
// [t1_cents, t2_cents, rate1, rate2, rate3]
const REFERRAL_RATES = {
  "Sports and Outdoors": [0, 0, 0, 0, 0.15],
  "Home and Kitchen": [0, 0, 0, 0, 0.15],
  "Beauty, Health and Personal Care": [1000, 1000, 0.08, 0.08, 0.15],
  "Consumer Electronics": [0, 0, 0, 0, 0.08],
};
function correctCommissionCents(pg, revenueCents) {
  const [t1, t2, r1, r2, r3] = REFERRAL_RATES[pg];
  const fee =
    Math.min(revenueCents, t1) * r1 +
    Math.max(Math.min(revenueCents, t2) - t1, 0) * r2 +
    Math.max(revenueCents - t2, 0) * r3;
  return Math.max(Math.round(fee), 30);
}

// G1 fee-line economics (Phase 3). Amazon bills a per-unit fulfillment fee; items priced
// under $10 get an automatic ~$0.86/unit Low-Price FBA discount (P3.2). Coupons carry a
// $0.60 redemption fee (P3.6-D); Lightning/Best deals carry a per-run deal fee (P3.6-E).
const LOW_PRICE_THRESHOLD_CENTS = 1000;
const LOW_PRICE_DISCOUNT_CENTS = 86;
const COUPON_FEE_CENTS = 60;
const DEAL_FEE_CENTS = 15000;

// Standard (non-discounted) per-unit fulfillment fee by price band — a representative
// synthetic schedule so a tier's ≥$10 SKUs share a stable peer baseline the Low-Price
// rule self-calibrates against.
function standardFulfillmentFeeCents(priceCents) {
  if (priceCents < 2000) return 306;
  if (priceCents < 5000) return 450;
  return 600;
}

// Demo: one SKU per brand has a referral rate that JUMPS partway through its history —
// billed correctly before the cutoff, overcharged after. This trips the referral rule's
// Signal A (within-SKU temporal rate change) → a HIGH-confidence "you found what?" finding,
// where a steady-state overcharge only rates medium (it rests on the category-map guess).
// Chosen by index so no RNG draw is added (the rest of the dataset stays byte-stable).
const RATE_JUMP_SKU_INDEX = 2; // e.g. Halcyon HA-HDP-003 (Sport Headphones)
const RATE_JUMP_CUTOFF = "2025-07-15"; // ~midpoint of the DATE_START..DATE_END window

// Settlement V2 flat file. Charges the correct referral fee on most orders; inflates
// it on ~15% of SKUs (referral_fee_mismatch). Also supplies per-SKU unit volume that
// the size-tier and return-credit rules consume.
//
// G1 (Phase 3): also emits the billed fee lines real Settlement V2 carries under
// `amount-description` — FBAPerUnitFulfillmentFee, CouponRedemptionFee /
// ItemPromotionDiscount, and LightningDealFee — with planted leak knobs (missed low-price
// discount, coupon fee without a matching promo, double-booked deal fee). All fee-line
// randomness is drawn from an ISOLATED stream (`feeRng`) and every added row is
// non-Principal / non-Commission, so the main RNG sequence and every existing finding
// stay byte-stable — regenerating changes only settlement.csv (adds rows).
function generateSettlement(brand, catalog, rng) {
  const headers = [
    "settlement-id", "transaction-type", "order-id", "amount-type",
    "amount-description", "amount", "sku", "quantity-purchased", "posted-date",
  ];
  const rows = [csvRow(headers)];
  const pg = PRODUCT_GROUP_BY_SLUG[brand.slug];
  const settlementId = String(randInt(rng, 80000000, 89999999));
  // Posted dates come from an independent stream so adding them doesn't perturb the
  // amount/volume RNG (keeps existing findings stable). Orders spread across the
  // 18-month window, giving the report a real settlement date range to rate-per-month.
  const dateRng = mulberry32(brand.seed + 7);
  // Fully isolated fee-line stream (never touches the main rng) so G1's lines don't shift
  // any existing Principal/Commission byte.
  const feeRng = mulberry32(brand.seed + 11);

  catalog.forEach((item, idx) => {
    const priceCents = Math.round(item.price * 100);
    const stdFeeCents = standardFulfillmentFeeCents(priceCents);
    const isLowPrice = priceCents < LOW_PRICE_THRESHOLD_CENTS;
    // Leak knob: ~half of sub-$10 SKUs miss the auto-discount. Force the first eligible SKU
    // so the rule fires deterministically on any brand that has sub-$10 items.
    const missedDiscount = isLowPrice && (idx === 0 || feeRng() < 0.5);
    const billedFeeCents =
      isLowPrice && !missedDiscount ? stdFeeCents - LOW_PRICE_DISCOUNT_CENTS : stdFeeCents;

    // Realistic 18-month per-SKU order volume so fee overcharges accumulate to
    // believable dollars (a real mid-market brand has far more than a handful).
    const orderCount = randInt(rng, 40, 160);
    const overcharged = rng() < 0.15;
    const isRateJumpSku = idx === RATE_JUMP_SKU_INDEX;
    for (let o = 0; o < orderCount; o++) {
      const oid = orderId(rng);
      const qty = rng() < 0.85 ? 1 : randInt(rng, 2, 4);
      const revenueCents = Math.round(item.price * qty * 100);
      // postedDate is drawn up front (isolated dateRng) so the jump SKU can decide its
      // overcharge by date. Moving the draw here doesn't change the dateRng sequence.
      const postedDate = fmtDate(randDate(dateRng, DATE_START, DATE_END));
      // Jump SKU: correct before the cutoff, +7% after → an 8%→15% temporal rate change
      // (Signal A, high). Every other SKU keeps its steady per-SKU overcharge flag.
      const applyOvercharge = isRateJumpSku
        ? postedDate >= RATE_JUMP_CUTOFF
        : overcharged;
      let commissionCents = correctCommissionCents(pg, revenueCents);
      if (applyOvercharge) commissionCents += Math.round(revenueCents * 0.07);
      const revenue = (revenueCents / 100).toFixed(2);
      const commission = (-commissionCents / 100).toFixed(2);
      rows.push(csvRow([settlementId, "Order", oid, "ItemPrice", "Principal", revenue, item.sku, qty, postedDate]));
      rows.push(csvRow([settlementId, "Order", oid, "ItemFees", "Commission", commission, item.sku, qty, postedDate]));
      // G1: billed per-unit fulfillment fee (Low-Price FBA detection, P3.2).
      const fulfillmentCents = billedFeeCents * qty;
      rows.push(csvRow([settlementId, "Order", oid, "ItemFees", "FBAPerUnitFulfillmentFee", (-fulfillmentCents / 100).toFixed(2), item.sku, qty, postedDate]));
      // G1: coupon redemption fee (P3.6-D). ~10% of orders redeem a coupon; most carry a
      // matching ItemPromotionDiscount, a knobbed subset do NOT (the billing error).
      if (feeRng() < 0.1) {
        rows.push(csvRow([settlementId, "Order", oid, "ItemFees", "CouponRedemptionFee", (-COUPON_FEE_CENTS / 100).toFixed(2), item.sku, qty, postedDate]));
        const couponError = (idx === 0 && o === 0) || feeRng() < 0.25;
        if (!couponError) {
          const discountCents = Math.round(revenueCents * 0.1);
          rows.push(csvRow([settlementId, "Order", oid, "Promotion", "ItemPromotionDiscount", (-discountCents / 100).toFixed(2), item.sku, qty, postedDate]));
        }
      }
    }

    // G1: deal fees (P3.6-E). ~8% of SKUs run a deal; a knobbed subset are double-booked
    // (two deal fees for the same SKU in one window). Force the first SKU so the rule fires.
    const runsDeal = idx === 0 || feeRng() < 0.08;
    if (runsDeal) {
      const dealDate = fmtDate(randDate(feeRng, DATE_START, DATE_END));
      const dealOid = orderId(feeRng);
      rows.push(csvRow([settlementId, "Order", dealOid, "ItemFees", "LightningDealFee", (-DEAL_FEE_CENTS / 100).toFixed(2), item.sku, 1, dealDate]));
      if (idx === 0 || feeRng() < 0.4) {
        rows.push(csvRow([settlementId, "Order", dealOid, "ItemFees", "LightningDealFee", (-DEAL_FEE_CENTS / 100).toFixed(2), item.sku, 1, dealDate]));
      }
    }
  });
  return rows.join("\n");
}

// FBA Fee Preview. Dimensions genuinely fit Small or Large Standard; ~15% of SKUs are
// labelled one tier up (size_tier_misclassification). Returns { csv, dims } — the per-SKU
// measured dimensions are captured (NOT re-drawn) so the Monthly Storage generator can bill
// a consistent (or knob-inflated) cube against the same dims, without perturbing this RNG.
function generateFeePreview(brand, catalog, rng) {
  const headers = [
    "sku", "asin", "product-group", "longest-side", "median-side", "shortest-side",
    "item-package-weight", "unit-of-dimension", "unit-of-weight", "product-size-tier", "estimated-fee-total",
  ];
  const rows = [csvRow(headers)];
  const dims = [];
  // Emit the real product-group CODE (e.g. "ce"), not the category label — the rule must
  // translate it via product-group-map.ts to reach the correct referral rate (P0.6).
  const code = PRODUCT_GROUP_CODE_BY_SLUG[brand.slug];

  for (const item of catalog) {
    const small = rng() < 0.5;
    const longest = small ? randFloat(rng, 5, 14) : randFloat(rng, 15.5, 17.5);
    const median = small ? randFloat(rng, 3, 11) : randFloat(rng, 8, 13);
    const shortest = small ? randFloat(rng, 0.2, 0.7) : randFloat(rng, 1, 7);
    const weight = small ? randFloat(rng, 2, 15) : randFloat(rng, 20, 300);
    let tier = small ? "Small Standard" : "Large Standard";
    let fee = small ? 3.5 : 5.5;
    if (rng() < 0.15) {
      tier = small ? "Large Standard" : "Large Bulky";
      fee = small ? 5.5 : 9.5;
    }
    rows.push(csvRow([
      item.sku, item.asin, code, longest, median, shortest, weight,
      "inches", "ounces", tier, fee.toFixed(2),
    ]));
    dims.push({ sku: item.sku, asin: item.asin, fnsku: item.fnsku, title: item.title, longest, median, shortest, tier });
  }
  return { csv: rows.join("\n"), dims };
}

// G2 (Phase 3): Monthly Inventory Storage Fees report. Bills each SKU on a cubic-foot
// volume × ~$0.78/cu ft. Most SKUs are billed on their true cube (measured L×W×H ÷ 1,728
// from the fee-preview dims); a knobbed subset are billed on an INFLATED cube
// (storage_cube_overcharge). Isolated RNG (seed+17) so it never perturbs any other file.
const STORAGE_RATE_PER_CUFT = 0.78; // representative 2026 standard-size rate; report carries the real fee
function generateMonthlyStorage(brand, dims) {
  const headers = [
    "asin", "fnsku", "product-name", "item-volume", "volume-units",
    "average-quantity-on-hand", "product-size-tier", "base-rate",
    "estimated-monthly-storage-fee", "month-of-charge", "currency",
  ];
  const rows = [csvRow(headers)];
  const rng = mulberry32(brand.seed + 17);
  const MONTH = "2026-04-01";
  const MIN_FLAGGED = 5; // force the first few so the rule fires on every brand
  let flagged = 0;

  dims.forEach((d, idx) => {
    const measuredCuft = (d.longest * d.median * d.shortest) / 1728;
    const inflate = idx < MIN_FLAGGED || rng() < 0.12;
    if (inflate) flagged++;
    // Inflated: billed on 1.4–1.8× the true cube. Legit: within ±8% (packaging vs bare
    // dims) — below the rule's 25% tolerance, so it never false-flags.
    const billedCuft = +(
      measuredCuft * (inflate ? randFloat(rng, 1.4, 1.8) : randFloat(rng, 0.99, 1.08))
    ).toFixed(4);
    const qty = randInt(rng, 20, 300);
    const fee = (billedCuft * qty * STORAGE_RATE_PER_CUFT).toFixed(2);
    rows.push(csvRow([
      d.asin, d.fnsku, d.title, billedCuft, "cubic feet",
      qty, d.tier, STORAGE_RATE_PER_CUFT.toFixed(2), fee, MONTH, "USD",
    ]));
  });
  return { csv: rows.join("\n"), flagged };
}

// Aged Inventory Surcharge report. ~12% of SKUs are surcharged; ~60% of those also get a
// recent shipment injected into the ledger so the rule flags them as actively-selling
// (aged_surcharge_on_sold). Returns extra ledger Shipments rows to append.
function generateStorageFees(brand, catalog, rng) {
  const headers = [
    "snapshot-date", "sku", "fnsku", "asin", "qty-charged",
    "surcharge-type", "surcharge-amount", "currency",
  ];
  const rows = [csvRow(headers)];
  const extraShipments = [];
  const snapshot = "2026-04-15";
  const MIN_FLAGGED = 5; // guarantee the rule fires on every brand

  catalog.forEach((item, idx) => {
    const force = idx < MIN_FLAGGED;
    if (force || rng() < 0.12) {
      const qtyCharged = randInt(rng, 10, 60);
      const surcharge = (qtyCharged * randFloat(rng, 0.5, 1.2)).toFixed(2);
      rows.push(csvRow([snapshot, item.sku, item.fnsku, item.asin, qtyCharged, "Aged Inventory Surcharge", surcharge, "USD"]));
      if (force || rng() < 0.6) {
        const units = randInt(rng, qtyCharged, qtyCharged + 30);
        extraShipments.push([
          "2026-03-20", item.fnsku, item.asin, item.sku, item.title,
          "Shipments", refId(rng), -units, pick(rng, FCS), "SELLABLE", "", "US",
        ]);
      }
    }
  });
  return { csv: rows.join("\n"), extraShipments };
}

// Most sellable customer returns DO get credited back to inventory; only a fraction
// slip. Emit CustomerReturns credit events (same month as the return) for ~78% of
// sellable returns, leaving ~22% as genuine return_credit_unapplied gaps. Without this
// the rule treats nearly every sellable return as a gap, inflating the recoverable.
function generateReturnCredits(returns, rng, creditRate = 0.78) {
  const credits = [];
  for (const line of returns.split("\n").slice(1)) {
    const p = line.split(",");
    if (p[8] !== "SELLABLE") continue;
    if (rng() >= creditRate) continue; // this fraction stays uncredited = the gap
    credits.push([
      p[0], p[4], p[3], p[2], p[5],
      "CustomerReturns", refId(rng), p[6], pick(rng, FCS), "SELLABLE", "G", "US",
    ]);
  }
  return credits;
}

// --- Main ---
const outBase = join(process.cwd(), "tests", "smoke");

for (const brand of brands) {
  const rng = mulberry32(brand.seed);
  const catalog = generateCatalog(brand, rng);

  console.log(`\n${brand.name}: ${catalog.length} SKUs`);

  const dir = join(outBase, brand.slug);
  mkdirSync(dir, { recursive: true });

  // Generate ledger first so we know which FNSKUs have losses (write deferred until
  // after the aged-surcharge shipments are appended).
  const { csv: ledgerBase, lossFnskus } = generateInventoryLedger(brand, catalog, rng);

  const returns = generateReturns(brand, catalog, rng);
  writeFileSync(join(dir, "returns.csv"), returns);
  console.log(`  returns.csv: ${returns.split("\n").length - 1} rows`);

  const reimbursements = generateReimbursements(brand, catalog, rng, returns, lossFnskus);
  writeFileSync(join(dir, "reimbursements.csv"), reimbursements);
  console.log(`  reimbursements.csv: ${reimbursements.split("\n").length - 1} rows`);

  // Phase 1.5 payout-integrity reports. Generated after the Phase-1 files so their
  // RNG draws don't perturb the existing datasets.
  const settlement = generateSettlement(brand, catalog, rng);
  writeFileSync(join(dir, "settlement.csv"), settlement);
  console.log(`  settlement.csv: ${settlement.split("\n").length - 1} rows`);

  const { csv: feePreview, dims: skuDims } = generateFeePreview(brand, catalog, rng);
  writeFileSync(join(dir, "fba-fee-preview.csv"), feePreview);
  console.log(`  fba-fee-preview.csv: ${feePreview.split("\n").length - 1} rows`);

  // G2: Monthly Storage Fees report (billed cube per SKU, some inflated). Isolated RNG,
  // so it doesn't perturb any other file — regenerating only adds monthly-storage.csv.
  const { csv: monthlyStorage, flagged: storageFlagged } = generateMonthlyStorage(brand, skuDims);
  writeFileSync(join(dir, "monthly-storage.csv"), monthlyStorage);
  console.log(`  monthly-storage.csv: ${monthlyStorage.split("\n").length - 1} rows (${storageFlagged} inflated-cube)`);

  const { csv: storage, extraShipments } = generateStorageFees(brand, catalog, rng);
  writeFileSync(join(dir, "storage-fees.csv"), storage);
  console.log(`  storage-fees.csv: ${storage.split("\n").length - 1} rows`);

  // Append return-credit events (most sellable returns get credited back) + the
  // injected "actively selling" shipments, then write the ledger.
  const returnCredits = generateReturnCredits(returns, rng);
  const ledgerExtras = [...returnCredits, ...extraShipments];
  const ledger = ledgerExtras.length
    ? ledgerBase + "\n" + ledgerExtras.map(csvRow).join("\n")
    : ledgerBase;
  writeFileSync(join(dir, "inventory-ledger.csv"), ledger);
  console.log(`  inventory-ledger.csv: ${ledger.split("\n").length - 1} rows (${lossFnskus.size} FNSKUs with losses)`);

  writeFileSync(join(dir, "brand.json"), JSON.stringify({
    name: brand.name,
    slug: brand.slug,
    skuCount: catalog.length,
    priceRange: brand.priceRange,
    dateRange: [fmtDate(DATE_START), fmtDate(DATE_END)],
  }, null, 2));
}

console.log("\nDone. Datasets written to tests/smoke/*/");
