#!/usr/bin/env node
/**
 * Generates comprehensive test fixtures for X-ray detection rules.
 *
 * Covers:
 * - Zero-findings brand (IronClad Supplies) — every return reimbursed, every loss covered
 * - Dirty-data brand (GlitchWave Electronics) — BOM, mixed dates, unicode, quoted commas, empty rows
 * - Edge-case fixtures — day-90/91 boundary, SKU-level join bug, partial reimbursement, reason code H
 * - All Listings Reports for all brands (existing + new)
 * - High-volume stress test brand (MegaScale Wholesale) — 50K+ rows
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "fixtures");
const SMOKE = join(__dirname, "..", "smoke");

// --- Helpers ---

function randomId(prefix, len = 10) {
  const chars = "0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return prefix ? `${prefix}-${s}` : s;
}

function randomOrderId() {
  const a = String(Math.floor(100 + Math.random() * 900));
  const b = String(Math.floor(1000000 + Math.random() * 9000000));
  const c = String(Math.floor(1000000 + Math.random() * 9000000));
  return `${a}-${b}-${c}`;
}

function randomReimbursementId() {
  return String(2900000000 + Math.floor(Math.random() * 100000000));
}

function randomCaseId() {
  return String(1000000000 + Math.floor(Math.random() * 9000000000));
}

function randomRefId() {
  return String(1000000000 + Math.floor(Math.random() * 9000000000));
}

function randomLP() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "LPn";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function randomFC() {
  const fcs = ["PHX7", "ONT8", "JAX4", "DFW7", "BFI4", "RIC2", "ATL6", "CLT2", "SMF3", "TEB9", "LGB8", "SBD2", "IND5", "MDW2", "MQJ1"];
  return fcs[Math.floor(Math.random() * fcs.length)];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateUS(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function writeCSV(path, rows) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rows.join("\n") + "\n", "utf8");
  console.log(`  wrote ${path} (${rows.length - 1} data rows)`);
}

function writeBOMCSV(path, rows) {
  mkdirSync(dirname(path), { recursive: true });
  const BOM = "\uFEFF";
  writeFileSync(path, BOM + rows.join("\n") + "\n", "utf8");
  console.log(`  wrote ${path} (${rows.length - 1} data rows, with BOM)`);
}

// --- Headers ---
const RETURNS_HEADER = "return-date,order-id,sku,asin,fnsku,product-name,quantity,fulfillment-center-id,detailed-disposition,reason,status,license-plate-number,customer-comments";
const REIMBURSEMENTS_HEADER = "approval-date,reimbursement-id,case-id,amazon-order-id,reason,sku,fnsku,asin,condition,currency-unit,amount-per-unit,amount-total,quantity-reimbursed-cash,quantity-reimbursed-inventory,quantity-reimbursed-total";
const INVENTORY_HEADER = "Date,FNSKU,ASIN,MSKU,Title,Event Type,Reference ID,Quantity,Fulfillment Center,Disposition,Reason,Country";
const LISTINGS_HEADER = "item-name,listing-id,seller-sku,price,quantity,open-date,image-url,item-is-marketplace,product-id-type,zshop-shipping-fee,item-note,item-condition,zshop-category1,zshop-browse-path,zshop-storefront-feature,asin1,date-created,fulfillment-channel";

// ============================================================
// 1. IRONCLAD SUPPLIES — Zero Findings Brand
// ============================================================
console.log("\n=== IronClad Supplies (zero findings) ===");

function generateIronClad() {
  const dir = join(SMOKE, "ironclad-supplies");
  const skus = [];
  for (let i = 1; i <= 20; i++) {
    skus.push({
      sku: `IC-${String(i).padStart(3, "0")}`,
      asin: `B0IC${String(i).padStart(6, "0")}`,
      fnsku: `X00IC${String(i).padStart(5, "0")}`,
      name: `IronClad Industrial Widget ${i}`,
      price: (20 + Math.random() * 180).toFixed(2),
    });
  }

  const dispositions = ["CUSTOMER_DAMAGED", "DEFECTIVE", "CARRIER_DAMAGED", "DAMAGED"];
  const reasons = ["CUSTOMER_RETURN", "NOT_AS_DESCRIBED", "DEFECTIVE", "BETTER_PRICE_AVAILABLE"];

  const returnRows = [RETURNS_HEADER];
  const reimbRows = [REIMBURSEMENTS_HEADER];
  const invRows = [INVENTORY_HEADER];
  const listRows = [LISTINGS_HEADER];

  // Generate 100 returns, each with a matching reimbursement within 30 days
  for (let i = 0; i < 100; i++) {
    const s = skus[i % skus.length];
    const returnDate = `2025-${String(1 + Math.floor(i / 10)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
    const orderId = randomOrderId();
    const disp = dispositions[i % dispositions.length];
    const reason = reasons[i % reasons.length];
    const status = "Refunded";

    returnRows.push(`${returnDate},${orderId},${s.sku},${s.asin},${s.fnsku},${s.name},1,${randomFC()},${disp},${reason},${status},${randomLP()},`);

    // Matching reimbursement within 30 days
    const reimbDate = addDays(returnDate, 5 + Math.floor(Math.random() * 25));
    reimbRows.push(`${reimbDate},${randomReimbursementId()},${randomCaseId()},${orderId},CUSTOMER_RETURN,${s.sku},${s.fnsku},${s.asin},Damaged,USD,${s.price},${s.price},1,0,1`);
  }

  // Generate 30 SELLABLE returns (should never be flagged)
  for (let i = 0; i < 30; i++) {
    const s = skus[i % skus.length];
    const returnDate = `2025-${String(3 + Math.floor(i / 10)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
    const orderId = randomOrderId();
    returnRows.push(`${returnDate},${orderId},${s.sku},${s.asin},${s.fnsku},${s.name},1,${randomFC()},SELLABLE,CUSTOMER_RETURN,Unit returned,${randomLP()},`);
  }

  // Generate 50 inventory losses, each with a matching reimbursement
  const lossReasons = ["E", "M", "D", "U"];
  for (let i = 0; i < 50; i++) {
    const s = skus[i % skus.length];
    const lossDate = `2025-${String(1 + Math.floor(i / 5)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
    const qty = 1 + Math.floor(Math.random() * 3);
    const reason = lossReasons[i % lossReasons.length];

    invRows.push(`${lossDate},${s.fnsku},${s.asin},${s.sku},${s.name},Adjustments,${randomRefId()},-${qty},${randomFC()},SELLABLE,${reason},US`);

    // Matching reimbursement
    const reimbDate = addDays(lossDate, 3 + Math.floor(Math.random() * 20));
    const totalAmt = (parseFloat(s.price) * qty).toFixed(2);
    reimbRows.push(`${reimbDate},${randomReimbursementId()},${randomCaseId()},,INVENTORY_LOST,${s.sku},${s.fnsku},${s.asin},Damaged,USD,${s.price},${totalAmt},${qty},0,${qty}`);
  }

  // Some normal inventory events (shipments, receipts)
  for (let i = 0; i < 40; i++) {
    const s = skus[i % skus.length];
    const d = `2025-${String(1 + Math.floor(i / 4)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
    invRows.push(`${d},${s.fnsku},${s.asin},${s.sku},${s.name},Shipments,${randomRefId()},${1 + Math.floor(Math.random() * 10)},${randomFC()},SELLABLE,,US`);
    invRows.push(`${d},${s.fnsku},${s.asin},${s.sku},${s.name},Receipts,${randomRefId()},${1 + Math.floor(Math.random() * 20)},${randomFC()},SELLABLE,,US`);
  }

  // All Listings
  for (const s of skus) {
    listRows.push(`${s.name},${randomId("lst")},${s.sku},${s.price},${10 + Math.floor(Math.random() * 500)},,,,1,,,,,,${s.asin},,AMAZON_NA`);
  }

  writeCSV(join(dir, "returns.csv"), returnRows);
  writeCSV(join(dir, "reimbursements.csv"), reimbRows);
  writeCSV(join(dir, "inventory-ledger.csv"), invRows);
  writeCSV(join(dir, "all-listings.csv"), listRows);
  writeFileSync(
    join(dir, "brand.json"),
    JSON.stringify({ name: "IronClad Supplies", slug: "ironclad-supplies", skuCount: 20, priceRange: [20, 200], dateRange: ["2024-10-01", "2026-04-30"], expectedFindings: 0, purpose: "Zero-findings brand. Every return and inventory loss has a matching reimbursement. All 3 rules should produce 0 findings." }, null, 2) + "\n"
  );
}

generateIronClad();

// ============================================================
// 2. GLITCHWAVE ELECTRONICS — Dirty Data Brand
// ============================================================
console.log("\n=== GlitchWave Electronics (dirty data) ===");

function generateGlitchWave() {
  const dir = join(SMOKE, "glitchwave-electronics");
  const skus = [
    { sku: "GW-USB-001", asin: "B0GW000001", fnsku: "X00GW00001", name: 'GlitchWave USB-C Hub, 7-Port (Space Gray)', price: "49.99" },
    { sku: "GW-KBD-002", asin: "B0GW000002", fnsku: "X00GW00002", name: "GlitchWave Mech\u00e4nical Keyboard RGB", price: "129.99" },
    { sku: "GW-MON-003", asin: "B0GW000003", fnsku: "X00GW00003", name: 'GlitchWave 27" 4K Monitor, IPS Panel', price: "349.99" },
    { sku: "GW-CAM-004", asin: "B0GW000004", fnsku: "X00GW00004", name: "GlitchWave Webcam 1080p \u2014 Autofocus", price: "59.99" },
    { sku: "GW-SPK-005", asin: "B0GW000005", fnsku: "X00GW00005", name: "GlitchWave Bluetooth Speaker\u00ae 20W", price: "39.99" },
    { sku: "GW-CHG-006", asin: "B0GW000006", fnsku: "X00GW00006", name: 'GlitchWave Wireless Charger Pad, Qi-Certified\u2122', price: "24.99" },
    { sku: "GW-EAR-007", asin: "B0GW000007", fnsku: "X00GW00007", name: "GlitchWave Earbuds Pro (Black/Silver, 2-Pack)", price: "79.99" },
    { sku: "GW-SSD-008", asin: "B0GW000008", fnsku: "X00GW00008", name: "GlitchWave Portable SSD 1TB \u2013 USB 3.2", price: "89.99" },
    { sku: "GW-BAT-009", asin: "B0GW000009", fnsku: "X00GW00009", name: "GlitchWave Power Bank 20,000mAh", price: "44.99" },
    { sku: "GW-CBL-010", asin: "B0GW000010", fnsku: "X00GW00010", name: "GlitchWave Cable Kit (USB-C\u2192HDMI, DisplayPort\u00b2)", price: "19.99" },
  ];

  // Returns: mix of YYYY-MM-DD and MM/DD/YYYY dates, quoted fields, empty rows, unicode
  const returnRows = [RETURNS_HEADER];
  const reimbRows = [REIMBURSEMENTS_HEADER];
  const invRows = [INVENTORY_HEADER];
  const listRows = [LISTINGS_HEADER];

  const dispositions = ["CUSTOMER_DAMAGED", "DEFECTIVE", "CARRIER_DAMAGED", "DAMAGED", "SELLABLE"];
  const statuses = ["Refunded", "Unit returned", "Processing", ""];

  for (let i = 0; i < 80; i++) {
    const s = skus[i % skus.length];
    const baseDate = `2025-${String(1 + Math.floor(i / 8)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;

    // Alternate date formats: ~40% US format
    const dateStr = i % 5 === 0 ? formatDateUS(baseDate) : baseDate;
    const orderId = randomOrderId();
    const disp = dispositions[i % dispositions.length];
    const reason = ["CUSTOMER_RETURN", "NOT_AS_DESCRIBED", "DEFECTIVE", "SWITCHEROO", "BETTER_PRICE_AVAILABLE", "NO_REASON"][i % 6];
    const status = statuses[i % statuses.length];
    const qty = i % 7 === 0 ? 2 : 1;

    // Product name needs quoting if it contains commas
    const quotedName = s.name.includes(",") ? `"${s.name}"` : s.name;
    const comment = i % 12 === 0 ? '"Item arrived broken, scratched"' : i % 15 === 0 ? "Wrong color" : "";

    returnRows.push(`${dateStr},${orderId},${s.sku},${s.asin},${s.fnsku},${quotedName},${qty},${randomFC()},${disp},${reason},${status},${randomLP()},${comment}`);

    // Add empty rows every ~20 rows (simulating Amazon's export quirks)
    if (i % 20 === 19) {
      returnRows.push("");
    }

    // Add trailing comma rows occasionally
    if (i % 25 === 24) {
      returnRows.push(`${dateStr},${randomOrderId()},${s.sku},${s.asin},${s.fnsku},${quotedName},1,${randomFC()},SELLABLE,CUSTOMER_RETURN,Refunded,${randomLP()},,`);
    }

    // Only reimburse ~40% — leave plenty of gaps for detection
    if (i % 5 < 2 && disp !== "SELLABLE") {
      const reimbDate = addDays(baseDate, 10 + Math.floor(Math.random() * 40));
      // Also use mixed date formats in reimbursements
      const reimbDateStr = i % 3 === 0 ? formatDateUS(reimbDate) : reimbDate;
      reimbRows.push(`${reimbDateStr},${randomReimbursementId()},${randomCaseId()},${orderId},CUSTOMER_RETURN,${s.sku},${s.fnsku},${s.asin},Damaged,USD,${s.price},${s.price},1,0,1`);
    }
  }

  // Inventory: some with unicode, some with reason code H
  const lossReasons = ["E", "M", "D", "U", "H"];
  for (let i = 0; i < 40; i++) {
    const s = skus[i % skus.length];
    const d = `2025-${String(1 + Math.floor(i / 4)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
    const dateStr = i % 4 === 0 ? formatDateUS(d) : d;
    const reason = lossReasons[i % lossReasons.length];
    const quotedTitle = s.name.includes(",") ? `"${s.name}"` : s.name;
    const qty = -(1 + Math.floor(Math.random() * 3));

    invRows.push(`${dateStr},${s.fnsku},${s.asin},${s.sku},${quotedTitle},Adjustments,${randomRefId()},${qty},${randomFC()},DEFECTIVE,${reason},US`);

    // Only reimburse ~30% of inventory losses
    if (i % 10 < 3) {
      const reimbDate = addDays(d, 5 + Math.floor(Math.random() * 20));
      const amt = (parseFloat(s.price) * Math.abs(qty)).toFixed(2);
      reimbRows.push(`${reimbDate},${randomReimbursementId()},${randomCaseId()},,WAREHOUSE_LOST,${s.sku},${s.fnsku},${s.asin},Damaged,USD,${s.price},${amt},${Math.abs(qty)},0,${Math.abs(qty)}`);
    }

    // Add empty row in inventory too
    if (i % 15 === 14) {
      invRows.push("");
    }
  }

  // Normal events
  for (let i = 0; i < 20; i++) {
    const s = skus[i % skus.length];
    const d = `2025-${String(1 + Math.floor(i / 2)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
    const quotedTitle = s.name.includes(",") ? `"${s.name}"` : s.name;
    invRows.push(`${d},${s.fnsku},${s.asin},${s.sku},${quotedTitle},Receipts,${randomRefId()},${5 + Math.floor(Math.random() * 30)},${randomFC()},SELLABLE,,US`);
  }

  // All Listings
  for (const s of skus) {
    const quotedName = s.name.includes(",") ? `"${s.name}"` : s.name;
    listRows.push(`${quotedName},${randomId("lst")},${s.sku},${s.price},${10 + Math.floor(Math.random() * 200)},,,,1,,,,,,${s.asin},,AMAZON_NA`);
  }

  // Write with BOM
  writeBOMCSV(join(dir, "returns.csv"), returnRows);
  writeBOMCSV(join(dir, "reimbursements.csv"), reimbRows);
  writeBOMCSV(join(dir, "inventory-ledger.csv"), invRows);
  writeCSV(join(dir, "all-listings.csv"), listRows);
  writeFileSync(
    join(dir, "brand.json"),
    JSON.stringify({
      name: "GlitchWave Electronics",
      slug: "glitchwave-electronics",
      skuCount: 10,
      priceRange: [19, 350],
      dateRange: ["2024-10-01", "2026-04-30"],
      purpose: "Dirty data stress test. BOM encoding, mixed date formats (YYYY-MM-DD and MM/DD/YYYY), unicode in product names, quoted fields with embedded commas, empty rows, trailing commas, reason code H in inventory.",
      dirtyDataFeatures: [
        "UTF-8 BOM (byte order mark) on returns, reimbursements, inventory",
        "Mixed date formats: ~40% MM/DD/YYYY, ~60% YYYY-MM-DD",
        "Unicode: \u00e4, \u00ae, \u2122, \u2014, \u2013, \u00b2, \u2192 in product names",
        "Quoted fields with embedded commas in product names",
        "Empty rows scattered throughout",
        "Trailing commas on some rows",
        "Reason code H in inventory adjustments",
      ],
    }, null, 2) + "\n"
  );
}

generateGlitchWave();

// ============================================================
// 3. EDGE-CASE UNIT TEST FIXTURES
// ============================================================
console.log("\n=== Edge-case unit test fixtures ===");

// --- 3a. Day-90 boundary test ---
function generateBoundaryTest() {
  const returnDate = "2025-06-01";
  const orderId89 = "111-1111111-1111111";
  const orderId90 = "222-2222222-2222222";
  const orderId91 = "333-3333333-3333333";
  const orderIdNone = "444-4444444-4444444";

  const returns = [
    RETURNS_HEADER,
    `${returnDate},${orderId89},EDGE-001,B0EDGE0001,X00EDGE001,Edge Widget A,1,PHX7,DEFECTIVE,CUSTOMER_RETURN,Refunded,LPn00000001,`,
    `${returnDate},${orderId90},EDGE-002,B0EDGE0002,X00EDGE002,Edge Widget B,1,PHX7,CUSTOMER_DAMAGED,DEFECTIVE,Refunded,LPn00000002,`,
    `${returnDate},${orderId91},EDGE-003,B0EDGE0003,X00EDGE003,Edge Widget C,1,PHX7,DAMAGED,NOT_AS_DESCRIBED,Refunded,LPn00000003,`,
    `${returnDate},${orderIdNone},EDGE-004,B0EDGE0004,X00EDGE004,Edge Widget D,1,PHX7,CARRIER_DAMAGED,CUSTOMER_RETURN,Refunded,LPn00000004,`,
  ];

  const reimb = [
    REIMBURSEMENTS_HEADER,
    // Day 89 — WITHIN window (should NOT be flagged)
    `${addDays(returnDate, 89)},2900000001,1000000001,${orderId89},CUSTOMER_RETURN,EDGE-001,X00EDGE001,B0EDGE0001,Damaged,USD,25.00,25.00,1,0,1`,
    // Day 90 — exact boundary (WITHIN window, should NOT be flagged — rule uses <=90 via BETWEEN)
    `${addDays(returnDate, 90)},2900000002,1000000002,${orderId90},CUSTOMER_RETURN,EDGE-002,X00EDGE002,B0EDGE0002,Damaged,USD,30.00,30.00,1,0,1`,
    // Day 91 — OUTSIDE window (should BE flagged as gap)
    `${addDays(returnDate, 91)},2900000003,1000000003,${orderId91},CUSTOMER_RETURN,EDGE-003,X00EDGE003,B0EDGE0003,Damaged,USD,35.00,35.00,1,0,1`,
    // orderId4 — no reimbursement at all (should BE flagged)
  ];

  // Empty inventory ledger (no sellable adjustments to complicate things)
  const inv = [
    INVENTORY_HEADER,
    `2025-06-15,X00EDGE001,B0EDGE0001,EDGE-001,Edge Widget A,Receipts,${randomRefId()},10,PHX7,SELLABLE,,US`,
  ];

  writeCSV(join(FIXTURES, "boundary-returns.csv"), returns);
  writeCSV(join(FIXTURES, "boundary-reimbursements.csv"), reimb);
  writeCSV(join(FIXTURES, "boundary-inventory.csv"), inv);
}

generateBoundaryTest();

// --- 3b. SKU-level join bug exposure ---
function generateSkuCollision() {
  // 5 damaged returns for SKU "COLLIDE-A", different order IDs
  // Only 1 gets an inventory adjustment back to sellable
  // Bug: returned_to_sellable CTE joins on MSKU, so ALL 5 get excluded
  // Expected correct behavior: 4 should be flagged (orders 2-5)

  const returns = [
    RETURNS_HEADER,
    "2025-07-01,AAA-1000001-0000001,COLLIDE-A,B0COLLIDE1,X00COLLID1,Collider Widget,1,PHX7,DEFECTIVE,CUSTOMER_RETURN,Refunded,LPnCOL00001,",
    "2025-07-03,AAA-1000002-0000002,COLLIDE-A,B0COLLIDE1,X00COLLID1,Collider Widget,1,PHX7,CUSTOMER_DAMAGED,DEFECTIVE,Refunded,LPnCOL00002,",
    "2025-07-05,AAA-1000003-0000003,COLLIDE-A,B0COLLIDE1,X00COLLID1,Collider Widget,1,PHX7,DAMAGED,NOT_AS_DESCRIBED,Refunded,LPnCOL00003,",
    "2025-07-07,AAA-1000004-0000004,COLLIDE-A,B0COLLIDE1,X00COLLID1,Collider Widget,1,PHX7,CARRIER_DAMAGED,CUSTOMER_RETURN,Refunded,LPnCOL00004,",
    "2025-07-09,AAA-1000005-0000005,COLLIDE-A,B0COLLIDE1,X00COLLID1,Collider Widget,1,PHX7,DEFECTIVE,CUSTOMER_RETURN,Refunded,LPnCOL00005,",
    // Different SKU, no issues — control case
    "2025-07-02,AAA-2000001-0000001,CONTROL-B,B0CONTRL2,X00CONTRL2,Control Widget,1,ONT8,DEFECTIVE,CUSTOMER_RETURN,Refunded,LPnCTL00001,",
  ];

  // No reimbursements at all
  const reimb = [
    REIMBURSEMENTS_HEADER,
  ];

  // One sellable adjustment for COLLIDE-A (only 1 of the 5 should be excluded)
  // But the bug means ALL 5 get excluded because the CTE joins on MSKU
  const inv = [
    INVENTORY_HEADER,
    // This adjustment matches COLLIDE-A SKU and falls within 30 days of return on 2025-07-01
    "2025-07-10,X00COLLID1,B0COLLIDE1,COLLIDE-A,Collider Widget,Adjustments,9999999991,1,PHX7,SELLABLE,G,US",
    // Negative adjustment (loss) for CONTROL-B — should be flagged by inventory_lost rule
    "2025-07-05,X00CONTRL2,B0CONTRL2,CONTROL-B,Control Widget,Adjustments,9999999992,-2,ONT8,SELLABLE,M,US",
  ];

  writeCSV(join(FIXTURES, "sku-collision-returns.csv"), returns);
  writeCSV(join(FIXTURES, "sku-collision-reimbursements.csv"), reimb);
  writeCSV(join(FIXTURES, "sku-collision-inventory.csv"), inv);
}

generateSkuCollision();

// --- 3c. Partial reimbursement (underpaid) ---
function generatePartialReimbursement() {
  // Returns where reimbursement exists but at wrong amount
  // Rule 5.2 (PRD): "If reimbursement exists but at a value < recent average sale price → finding (under-reimbursement)"
  // Current inventory_lost rule doesn't check amounts, only presence. This exposes that gap.

  const returns = [
    RETURNS_HEADER,
    "2025-08-01,BBB-1000001-0000001,PARTIAL-A,B0PARTIAL1,X00PARTL01,Partial Widget Expensive,1,DFW7,DEFECTIVE,CUSTOMER_RETURN,Refunded,LPnPRT00001,",
    "2025-08-03,BBB-1000002-0000002,PARTIAL-B,B0PARTIAL2,X00PARTL02,Partial Widget Mid,1,DFW7,CUSTOMER_DAMAGED,DEFECTIVE,Refunded,LPnPRT00002,",
  ];

  // Reimbursements exist but at much lower amounts than product price
  const reimb = [
    REIMBURSEMENTS_HEADER,
    // PARTIAL-A: product costs $149.99, reimbursed only $30.00 (Amazon's cost basis)
    "2025-08-15,2900000010,1000000010,BBB-1000001-0000001,CUSTOMER_RETURN,PARTIAL-A,X00PARTL01,B0PARTIAL1,Damaged,USD,30.00,30.00,1,0,1",
    // PARTIAL-B: product costs $89.99, reimbursed only $0.00 (inventory return instead of cash)
    "2025-08-20,2900000011,1000000011,BBB-1000002-0000002,CUSTOMER_RETURN,PARTIAL-B,X00PARTL02,B0PARTIAL2,Sellable,USD,0.00,0.00,0,1,1",
  ];

  // Inventory losses with partial reimbursement
  const inv = [
    INVENTORY_HEADER,
    // Lost 5 units of PARTIAL-A
    "2025-08-05,X00PARTL01,B0PARTIAL1,PARTIAL-A,Partial Widget Expensive,Adjustments,8888888881,-5,DFW7,SELLABLE,E,US",
    // Lost 3 units of PARTIAL-B
    "2025-08-07,X00PARTL02,B0PARTIAL2,PARTIAL-B,Partial Widget Mid,Adjustments,8888888882,-3,DFW7,DAMAGED,M,US",
  ];

  // All Listings with actual prices — needed to calculate the delta
  const listings = [
    LISTINGS_HEADER,
    "Partial Widget Expensive,lst-001,PARTIAL-A,149.99,50,,,,1,,,,,,B0PARTIAL1,,AMAZON_NA",
    "Partial Widget Mid,lst-002,PARTIAL-B,89.99,30,,,,1,,,,,,B0PARTIAL2,,AMAZON_NA",
  ];

  writeCSV(join(FIXTURES, "partial-returns.csv"), returns);
  writeCSV(join(FIXTURES, "partial-reimbursements.csv"), reimb);
  writeCSV(join(FIXTURES, "partial-inventory.csv"), inv);
  writeCSV(join(FIXTURES, "partial-all-listings.csv"), listings);
}

generatePartialReimbursement();

// --- 3d. Reason code H test ---
function generateReasonCodeH() {
  const inv = [
    INVENTORY_HEADER,
    // Reason H = "Damaged - Other" in some Amazon reports
    "2025-09-01,X00RCODEH1,B0RCODEH01,HCODE-001,Reason H Widget 1,Adjustments,7777777771,-3,JAX4,DAMAGED,H,US",
    "2025-09-05,X00RCODEH2,B0RCODEH02,HCODE-002,Reason H Widget 2,Adjustments,7777777772,-1,JAX4,DEFECTIVE,H,US",
    "2025-09-10,X00RCODEH3,B0RCODEH03,HCODE-003,Reason H Widget 3,Adjustments,7777777773,-2,ONT8,CUSTOMER_DAMAGED,H,US",
    // Control: reason E (already handled)
    "2025-09-15,X00RCODEE1,B0RCODEE01,ECODE-001,Reason E Widget,Adjustments,7777777774,-1,ONT8,SELLABLE,E,US",
  ];

  // No reimbursements — all should be flagged
  const reimb = [REIMBURSEMENTS_HEADER];

  writeCSV(join(FIXTURES, "reason-h-inventory.csv"), inv);
  writeCSV(join(FIXTURES, "reason-h-reimbursements.csv"), reimb);
}

generateReasonCodeH();

// --- 3e. Cross-rule overlap: same order hits multiple rules ---
function generateCrossRuleOverlap() {
  // Same order appears in returns (damaged, not reimbursed)
  // AND the same FNSKU has an inventory loss
  // Both rules should independently flag this

  const orderId = "CCC-9999999-0000001";

  const returns = [
    RETURNS_HEADER,
    `2025-10-01,${orderId},OVERLAP-A,B0OVERLAP1,X00OVRLP01,Overlap Widget,1,RIC2,DEFECTIVE,CUSTOMER_RETURN,Refunded,LPnOVR00001,`,
  ];

  const reimb = [REIMBURSEMENTS_HEADER]; // No reimbursements

  const inv = [
    INVENTORY_HEADER,
    // Same FNSKU lost in warehouse on same day
    "2025-10-01,X00OVRLP01,B0OVERLAP1,OVERLAP-A,Overlap Widget,Adjustments,6666666661,-2,RIC2,SELLABLE,E,US",
    // Different FNSKU also lost — should only trigger inventory_lost
    "2025-10-03,X00OVRLP02,B0OVERLAP2,OVERLAP-B,Overlap Widget 2,Adjustments,6666666662,-1,RIC2,DAMAGED,D,US",
  ];

  writeCSV(join(FIXTURES, "overlap-returns.csv"), returns);
  writeCSV(join(FIXTURES, "overlap-reimbursements.csv"), reimb);
  writeCSV(join(FIXTURES, "overlap-inventory.csv"), inv);
}

generateCrossRuleOverlap();

// ============================================================
// 4. ALL LISTINGS REPORTS FOR EXISTING BRANDS
// ============================================================
console.log("\n=== All Listings Reports for existing brands ===");

function generateListingsFromExisting(brandDir, brandName, prefix) {
  // Read returns and reimbursements to extract SKU/ASIN/price data
  const returnsFile = readFileSync(join(brandDir, "returns.csv"), "utf8");
  const reimbFile = readFileSync(join(brandDir, "reimbursements.csv"), "utf8");

  const skuMap = new Map(); // sku -> { asin, fnsku, name, price }

  // Extract from returns
  for (const line of returnsFile.split("\n").slice(1)) {
    if (!line.trim()) continue;
    // Handle quoted fields
    const parts = parseCSVLine(line);
    if (parts.length < 6) continue;
    const sku = parts[2];
    const asin = parts[3];
    const fnsku = parts[4];
    const name = parts[5];
    if (sku && !skuMap.has(sku)) {
      skuMap.set(sku, { asin, fnsku, name, price: null });
    }
  }

  // Extract prices from reimbursements (amount-per-unit)
  for (const line of reimbFile.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const parts = parseCSVLine(line);
    if (parts.length < 12) continue;
    const sku = parts[5];
    const amt = parseFloat(parts[10]);
    if (sku && skuMap.has(sku) && amt > 0) {
      const existing = skuMap.get(sku);
      if (!existing.price || amt > existing.price) {
        existing.price = amt;
      }
    }
  }

  // Fill missing prices with reasonable estimates based on brand
  const defaultPrices = { "NP": 45, "LN": 120, "PG": 25 };
  const dp = defaultPrices[prefix] || 50;

  const rows = [LISTINGS_HEADER];
  for (const [sku, data] of skuMap) {
    const price = data.price || (dp + Math.random() * dp).toFixed(2);
    const quotedName = data.name.includes(",") ? `"${data.name}"` : data.name;
    rows.push(`${quotedName},${randomId("lst")},${sku},${typeof price === "number" ? price.toFixed(2) : price},${10 + Math.floor(Math.random() * 500)},,,,1,,,,,,${data.asin},,AMAZON_NA`);
  }

  writeCSV(join(brandDir, "all-listings.csv"), rows);
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

generateListingsFromExisting(join(SMOKE, "novapeak-outdoor"), "NovaPeak Outdoor", "NP");
generateListingsFromExisting(join(SMOKE, "luxenest-home"), "LuxeNest Home", "LN");
generateListingsFromExisting(join(SMOKE, "pureglow-beauty"), "PureGlow Beauty", "PG");

// ============================================================
// 5. MEGASCALE WHOLESALE — High Volume Stress Test
// ============================================================
console.log("\n=== MegaScale Wholesale (50K+ rows stress test) ===");

function generateMegaScale() {
  const dir = join(SMOKE, "megascale-wholesale");
  const skuCount = 200;
  const skus = [];
  for (let i = 1; i <= skuCount; i++) {
    skus.push({
      sku: `MS-${String(i).padStart(4, "0")}`,
      asin: `B0MS${String(i).padStart(6, "0")}`,
      fnsku: `X00MS${String(i).padStart(5, "0")}`,
      name: `MegaScale Product ${i}`,
      price: (5 + Math.random() * 295).toFixed(2),
    });
  }

  const dispositions = ["CUSTOMER_DAMAGED", "DEFECTIVE", "CARRIER_DAMAGED", "DAMAGED", "SELLABLE"];
  const returnReasons = ["CUSTOMER_RETURN", "NOT_AS_DESCRIBED", "DEFECTIVE", "SWITCHEROO", "BETTER_PRICE_AVAILABLE", "NO_REASON", "UNAUTHORIZED_PURCHASE", "MISSED_ESTIMATED_DELIVERY"];
  const statuses = ["Refunded", "Unit returned", "Processing", ""];
  const fcs = ["PHX7", "ONT8", "JAX4", "DFW7", "BFI4", "RIC2", "ATL6", "CLT2", "SMF3", "TEB9", "LGB8", "SBD2", "IND5", "MDW2", "MQJ1"];
  const lossReasons = ["E", "M", "D", "U", "H"];
  const invDispositions = ["SELLABLE", "DEFECTIVE", "DAMAGED", "CUSTOMER_DAMAGED"];

  // Target: 55K return rows
  const RETURN_COUNT = 55000;
  const returnRows = [RETURNS_HEADER];
  const reimbOrderIds = new Set(); // Track which orders get reimbursed

  console.log(`  generating ${RETURN_COUNT} return rows...`);
  const reimbTargetOrders = [];

  for (let i = 0; i < RETURN_COUNT; i++) {
    const s = skus[i % skuCount];
    // Spread across 18 months
    const monthOffset = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const year = monthOffset < 3 ? 2024 : monthOffset < 15 ? 2025 : 2026;
    const month = monthOffset < 3 ? 10 + monthOffset : monthOffset < 15 ? monthOffset - 2 : monthOffset - 14;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const orderId = randomOrderId();
    const disp = dispositions[Math.floor(Math.random() * dispositions.length)];
    const reason = returnReasons[Math.floor(Math.random() * returnReasons.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const qty = Math.random() < 0.15 ? (2 + Math.floor(Math.random() * 3)) : 1;
    const fc = fcs[Math.floor(Math.random() * fcs.length)];

    returnRows.push(`${dateStr},${orderId},${s.sku},${s.asin},${s.fnsku},${s.name},${qty},${fc},${disp},${reason},${status},${randomLP()},`);

    // ~50% of damaged/refunded returns get reimbursed
    if (disp !== "SELLABLE" && status === "Refunded" && Math.random() < 0.5) {
      reimbTargetOrders.push({ orderId, sku: s.sku, fnsku: s.fnsku, asin: s.asin, price: s.price, date: dateStr });
    }
  }

  // Reimbursements: from returns + some warehouse/inbound
  const reimbRows = [REIMBURSEMENTS_HEADER];
  console.log(`  generating ${reimbTargetOrders.length} return-matched reimbursements...`);

  for (const o of reimbTargetOrders) {
    const daysLater = 3 + Math.floor(Math.random() * 85);
    const reimbDate = addDays(o.date, daysLater);
    const isCash = Math.random() < 0.6;
    reimbRows.push(`${reimbDate},${randomReimbursementId()},${randomCaseId()},${o.orderId},CUSTOMER_RETURN,${o.sku},${o.fnsku},${o.asin},${isCash ? "Damaged" : "Sellable"},USD,${isCash ? o.price : "0.00"},${isCash ? o.price : "0.00"},${isCash ? 1 : 0},${isCash ? 0 : 1},1`);
  }

  // Add warehouse/inbound reimbursements
  const warehouseReasons = ["WAREHOUSE_LOST", "WAREHOUSE_DAMAGED", "INVENTORY_LOST", "LOST_INBOUND", "INBOUND_DAMAGE"];
  for (let i = 0; i < 2000; i++) {
    const s = skus[Math.floor(Math.random() * skuCount)];
    const monthOffset = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const year = monthOffset < 3 ? 2024 : monthOffset < 15 ? 2025 : 2026;
    const month = monthOffset < 3 ? 10 + monthOffset : monthOffset < 15 ? monthOffset - 2 : monthOffset - 14;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const reason = warehouseReasons[Math.floor(Math.random() * warehouseReasons.length)];
    const qty = 1 + Math.floor(Math.random() * 5);
    const amt = (parseFloat(s.price) * qty).toFixed(2);
    reimbRows.push(`${dateStr},${randomReimbursementId()},${Math.random() < 0.3 ? "" : randomCaseId()},,${reason},${s.sku},${s.fnsku},${s.asin},Damaged,USD,${s.price},${amt},${qty},0,${qty}`);
  }

  // Inventory ledger: adjustments + receipts + shipments + customer returns
  const invRows = [INVENTORY_HEADER];
  console.log("  generating inventory ledger rows...");

  // 15K adjustment rows
  for (let i = 0; i < 15000; i++) {
    const s = skus[Math.floor(Math.random() * skuCount)];
    const monthOffset = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const year = monthOffset < 3 ? 2024 : monthOffset < 15 ? 2025 : 2026;
    const month = monthOffset < 3 ? 10 + monthOffset : monthOffset < 15 ? monthOffset - 2 : monthOffset - 14;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isLoss = Math.random() < 0.7;
    const qty = isLoss ? -(1 + Math.floor(Math.random() * 4)) : (1 + Math.floor(Math.random() * 3));
    const reason = isLoss ? lossReasons[Math.floor(Math.random() * lossReasons.length)] : ["G", "R", "M"][Math.floor(Math.random() * 3)];
    const disp = invDispositions[Math.floor(Math.random() * invDispositions.length)];

    invRows.push(`${dateStr},${s.fnsku},${s.asin},${s.sku},${s.name},Adjustments,${randomRefId()},${qty},${fcs[Math.floor(Math.random() * fcs.length)]},${disp},${reason},US`);
  }

  // 5K customer returns events
  for (let i = 0; i < 5000; i++) {
    const s = skus[Math.floor(Math.random() * skuCount)];
    const monthOffset = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const year = monthOffset < 3 ? 2024 : monthOffset < 15 ? 2025 : 2026;
    const month = monthOffset < 3 ? 10 + monthOffset : monthOffset < 15 ? monthOffset - 2 : monthOffset - 14;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    invRows.push(`${dateStr},${s.fnsku},${s.asin},${s.sku},${s.name},Customer Returns,${randomRefId()},1,${fcs[Math.floor(Math.random() * fcs.length)]},SELLABLE,CUSTOMER_RETURN,US`);
  }

  // 5K receipt events
  for (let i = 0; i < 5000; i++) {
    const s = skus[Math.floor(Math.random() * skuCount)];
    const monthOffset = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const year = monthOffset < 3 ? 2024 : monthOffset < 15 ? 2025 : 2026;
    const month = monthOffset < 3 ? 10 + monthOffset : monthOffset < 15 ? monthOffset - 2 : monthOffset - 14;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    invRows.push(`${dateStr},${s.fnsku},${s.asin},${s.sku},${s.name},Receipts,${randomRefId()},${5 + Math.floor(Math.random() * 50)},${fcs[Math.floor(Math.random() * fcs.length)]},SELLABLE,,US`);
  }

  // 3K shipment events
  for (let i = 0; i < 3000; i++) {
    const s = skus[Math.floor(Math.random() * skuCount)];
    const monthOffset = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const year = monthOffset < 3 ? 2024 : monthOffset < 15 ? 2025 : 2026;
    const month = monthOffset < 3 ? 10 + monthOffset : monthOffset < 15 ? monthOffset - 2 : monthOffset - 14;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    invRows.push(`${dateStr},${s.fnsku},${s.asin},${s.sku},${s.name},Shipments,${randomRefId()},${1 + Math.floor(Math.random() * 20)},${fcs[Math.floor(Math.random() * fcs.length)]},SELLABLE,TRANSFER,US`);
  }

  // All Listings
  const listRows = [LISTINGS_HEADER];
  for (const s of skus) {
    listRows.push(`${s.name},${randomId("lst")},${s.sku},${s.price},${10 + Math.floor(Math.random() * 1000)},,,,1,,,,,,${s.asin},,AMAZON_NA`);
  }

  writeCSV(join(dir, "returns.csv"), returnRows);
  writeCSV(join(dir, "reimbursements.csv"), reimbRows);
  writeCSV(join(dir, "inventory-ledger.csv"), invRows);
  writeCSV(join(dir, "all-listings.csv"), listRows);
  writeFileSync(
    join(dir, "brand.json"),
    JSON.stringify({
      name: "MegaScale Wholesale",
      slug: "megascale-wholesale",
      skuCount: 200,
      priceRange: [5, 300],
      dateRange: ["2024-10-01", "2026-04-30"],
      purpose: "High-volume stress test. 55K returns, 15K+ inventory adjustments, 200 SKUs. Tests DuckDB query performance, memory pressure, and type inference on large files.",
      rowCounts: {
        returns: RETURN_COUNT,
        reimbursements: reimbTargetOrders.length + 2000,
        inventoryLedger: 28000,
        allListings: skuCount,
      },
    }, null, 2) + "\n"
  );
}

generateMegaScale();

// ============================================================
// Summary
// ============================================================
console.log("\n=== Generation complete ===");
console.log(`
New test brands:
  tests/smoke/ironclad-supplies/     — Zero findings (false positive test)
  tests/smoke/glitchwave-electronics/ — Dirty data (BOM, mixed dates, unicode, commas)
  tests/smoke/megascale-wholesale/    — 50K+ rows stress test

New edge-case fixtures:
  tests/fixtures/boundary-*          — Day 89/90/91 reimbursement timing
  tests/fixtures/sku-collision-*     — SKU-level join bug exposure
  tests/fixtures/partial-*           — Under-reimbursement / $0 reimbursement
  tests/fixtures/reason-h-*          — Reason code H (not in current rule)
  tests/fixtures/overlap-*           — Same order hits multiple rules

New All Listings Reports:
  tests/smoke/novapeak-outdoor/all-listings.csv
  tests/smoke/luxenest-home/all-listings.csv
  tests/smoke/pureglow-beauty/all-listings.csv
  tests/smoke/ironclad-supplies/all-listings.csv
  tests/smoke/glitchwave-electronics/all-listings.csv
  tests/smoke/megascale-wholesale/all-listings.csv
`);
