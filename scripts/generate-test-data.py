#!/usr/bin/env python3
"""
Generate realistic Amazon FBA CSV test datasets for CedarCraft Home.
Fictional mid-size home goods brand, ~$1M/year, 60 SKUs, 18 months of data.

Usage: python scripts/generate-test-data.py
Output: tests/smoke/{returns,adjustments,reimbursements}.csv
"""

import csv
import random
import string
import os
from datetime import datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SEED = 42
random.seed(SEED)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "tests" / "smoke"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

START_DATE = datetime(2024, 10, 1)
END_DATE = datetime(2026, 4, 1)
TOTAL_DAYS = (END_DATE - START_DATE).days  # ~548 days

FC_CODES = ["PHX7", "SBD2", "ONT9", "TEB9", "MDW2", "DFW7", "ATL6", "JAX4", "RIC2", "MQJ1"]

# ---------------------------------------------------------------------------
# Product catalog - 60 SKUs
# ---------------------------------------------------------------------------
CATEGORIES = {
    "KIT": ("Kitchen", [
        "Bamboo Cutting Board Set", "Stainless Steel Mixing Bowls", "Silicone Spatula Set",
        "Ceramic Knife Block", "Acacia Wood Serving Tray", "Glass Storage Containers 12pc",
        "Cast Iron Skillet 10in", "Wooden Spoon Set 6pc", "Stainless Colander",
        "Bamboo Utensil Holder", "Silicone Baking Mat 2pk", "Ceramic Spice Jar Set",
        "Cutting Board Oil 8oz", "Stainless Measuring Cups", "Glass Pitcher 64oz",
        "Bamboo Dish Rack", "Silicone Pot Holders 4pk", "Wooden Salad Bowl",
        "Stainless Steel Tongs", "Ceramic Butter Dish",
    ]),
    "BTH": ("Bath", [
        "Bamboo Bath Mat", "Cotton Towel Set 6pc", "Ceramic Soap Dispenser",
        "Teak Shower Bench", "Bamboo Toothbrush Holder", "Cotton Bath Rug 24x36",
        "Stainless Towel Rack", "Ceramic Tumbler Set", "Bamboo Shower Caddy",
        "Cotton Washcloth Set 12pc", "Teak Bath Tray", "Ceramic Tissue Box Cover",
        "Bamboo Laundry Hamper", "Cotton Hand Towel Set 4pc", "Stainless Robe Hook Set",
        "Ceramic Vanity Tray", "Bamboo Toilet Brush", "Cotton Shower Curtain",
        "Teak Step Stool", "Ceramic Lotion Dispenser",
    ]),
    "STR": ("Storage", [
        "Bamboo Drawer Dividers 4pk", "Canvas Storage Bins 6pk", "Acacia Shelf Organizer",
        "Fabric Closet Organizer", "Bamboo Stackable Boxes 3pk", "Cotton Rope Basket Large",
        "Wood Floating Shelves 2pk", "Canvas Underbed Storage", "Bamboo Desktop Organizer",
        "Fabric Cube Bins 4pk", "Acacia Bookend Set", "Cotton Rope Basket Medium",
        "Wood Wall Hooks 5pk", "Canvas Toy Storage Bin", "Bamboo Spice Rack",
        "Fabric Hanging Organizer", "Acacia Jewelry Box", "Cotton Rope Basket Small",
        "Wood Key Holder Wall Mount", "Bamboo File Organizer",
    ]),
}

PRICE_RANGES = {
    "KIT": (14, 48),
    "BTH": (12, 52),
    "STR": (16, 45),
}


def _rand_alnum(n):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def build_catalog():
    """Build 60 SKUs with consistent ASIN, FNSKU, product name, and price."""
    catalog = []
    for cat_code, (cat_label, names) in CATEGORIES.items():
        lo, hi = PRICE_RANGES[cat_code]
        for i, name in enumerate(names, start=1):
            sku = f"CC-{cat_code}-{i:03d}"
            asin = f"B0{_rand_alnum(8)}"
            fnsku = f"X00{_rand_alnum(7)}"
            price = round(random.uniform(lo, hi), 2)
            catalog.append({
                "sku": sku,
                "asin": asin,
                "fnsku": fnsku,
                "product-name": f"CedarCraft {name}",
                "price": price,
                "category": cat_code,
            })
    return catalog


CATALOG = build_catalog()
SKU_LOOKUP = {p["sku"]: p for p in CATALOG}


def pick_product():
    return random.choice(CATALOG)


def rand_order_id():
    a = random.randint(100, 999)
    b = random.randint(1000000, 9999999)
    c = random.randint(1000000, 9999999)
    return f"{a}-{b:07d}-{c:07d}"


def rand_date(start=START_DATE, end=END_DATE, seasonal=False):
    """Random date in range. If seasonal, bias toward Jan and Jul."""
    d = start + timedelta(days=random.randint(0, (end - start).days - 1))
    if seasonal:
        if random.random() < 0.30:
            month = random.choice([1, 7])
            year = random.choice([2025, 2026]) if month == 1 else 2025
            day = random.randint(1, 28)
            candidate = datetime(year, month, day)
            if start <= candidate < end:
                d = candidate
    return d


def rand_fc():
    return random.choice(FC_CODES)


def rand_lpn():
    return f"LPn{_rand_alnum(8)}"


def rand_txn_id():
    return str(random.randint(1_000_000_000, 9_999_999_999))


def weighted_choice(options_weights):
    options, weights = zip(*options_weights)
    return random.choices(options, weights=weights, k=1)[0]


COMMENTS = [
    "Not what I expected",
    "Arrived broken",
    "Wrong color",
    "Too small for my space",
    "Doesn't match the listing photo",
    "Quality is poor",
    "Received wrong item",
    "Damaged in shipping",
    "Smells weird",
    "Missing pieces",
    "Already have one",
    "Found cheaper elsewhere",
    "Changed my mind",
    "Gift recipient didn't want it",
    "Doesn't fit",
    "Material feels cheap",
    "Color doesn't match bathroom",
    "Scratched on arrival",
    "Box was crushed",
    "Not as described",
]


# ---------------------------------------------------------------------------
# Generate returns.csv
# ---------------------------------------------------------------------------
def generate_returns(n=1800):
    rows = []
    for _ in range(n):
        prod = pick_product()
        disposition = weighted_choice([
            ("SELLABLE", 45), ("CUSTOMER_DAMAGED", 25), ("DEFECTIVE", 18),
            ("CARRIER_DAMAGED", 7), ("DAMAGED", 5),
        ])
        status = weighted_choice([
            ("Refunded", 65), ("Unit returned", 30), ("Processing", 5),
        ])
        reason = weighted_choice([
            ("CUSTOMER_RETURN", 35), ("NOT_AS_DESCRIBED", 15), ("DEFECTIVE", 15),
            ("UNWANTED_ITEM", 12), ("BETTER_PRICE_AVAILABLE", 8), ("SWITCHEROO", 3),
            ("INACCURATE_WEBSITE_DESCRIPTION", 7), ("NO_REASON", 5),
        ])
        comment = ""
        if random.random() < 0.20:
            comment = random.choice(COMMENTS)

        rows.append({
            "return-date": rand_date(seasonal=True).strftime("%Y-%m-%d"),
            "order-id": rand_order_id(),
            "sku": prod["sku"],
            "asin": prod["asin"],
            "fnsku": prod["fnsku"],
            "product-name": prod["product-name"],
            "quantity": 1,
            "fulfillment-center-id": rand_fc(),
            "detailed-disposition": disposition,
            "reason": reason,
            "status": status,
            "license-plate-number": rand_lpn(),
            "customer-comments": comment,
        })
    return rows


# ---------------------------------------------------------------------------
# Generate adjustments.csv
# ---------------------------------------------------------------------------
def generate_adjustments(n=600):
    rows = []
    n_negative = int(n * 0.60)  # 360
    n_positive = int(n * 0.40)  # 240

    neg_reason_dist = [("E", 30), ("M", 25), ("D", 20), ("U", 10), ("Q", 15)]
    pos_reason_dist = [("P", 30), ("G", 25), ("R", 20), ("E", 10), ("M", 15)]

    negative_rows = []
    for _ in range(n_negative):
        prod = pick_product()
        reason = weighted_choice(neg_reason_dist)
        qty = -1 if random.random() < 0.85 else -random.randint(2, 5)
        disposition = weighted_choice([
            ("SELLABLE", 65), ("DEFECTIVE", 20), ("DAMAGED", 10), ("UNSELLABLE", 5),
        ])
        d = rand_date()
        negative_rows.append({
            "adjusted-date": d.strftime("%Y-%m-%d"),
            "transaction-item-id": rand_txn_id(),
            "fnsku": prod["fnsku"],
            "sku": prod["sku"],
            "product-name": prod["product-name"],
            "fulfillment-center-id": rand_fc(),
            "quantity": qty,
            "reason": reason,
            "disposition": disposition,
            "_date": d,
            "_prod": prod,
        })

    # For M (misplaced) negative rows, create matching G (found) positive rows
    # ~65% of misplaced items get found
    misplaced = [r for r in negative_rows if r["reason"] == "M"]
    found_rows = []
    for mr in misplaced:
        if random.random() < 0.65:
            delay = random.randint(2, 15)
            found_date = mr["_date"] + timedelta(days=delay)
            if found_date < END_DATE:
                found_rows.append({
                    "adjusted-date": found_date.strftime("%Y-%m-%d"),
                    "transaction-item-id": rand_txn_id(),
                    "fnsku": mr["fnsku"],
                    "sku": mr["sku"],
                    "product-name": mr["product-name"],
                    "fulfillment-center-id": mr["fulfillment-center-id"],
                    "quantity": abs(mr["quantity"]),
                    "reason": "G",
                    "disposition": mr["disposition"],
                })

    # Fill remaining positive slots
    n_remaining_positive = max(0, n_positive - len(found_rows))
    other_positive = []
    for _ in range(n_remaining_positive):
        prod = pick_product()
        reason = weighted_choice(pos_reason_dist)
        qty = 1 if random.random() < 0.85 else random.randint(2, 3)
        disposition = weighted_choice([
            ("SELLABLE", 65), ("DEFECTIVE", 20), ("DAMAGED", 10), ("UNSELLABLE", 5),
        ])
        other_positive.append({
            "adjusted-date": rand_date().strftime("%Y-%m-%d"),
            "transaction-item-id": rand_txn_id(),
            "fnsku": prod["fnsku"],
            "sku": prod["sku"],
            "product-name": prod["product-name"],
            "fulfillment-center-id": rand_fc(),
            "quantity": qty,
            "reason": reason,
            "disposition": disposition,
        })

    # Strip internal keys
    for r in negative_rows:
        r.pop("_date", None)
        r.pop("_prod", None)

    all_rows = negative_rows + found_rows + other_positive
    all_rows.sort(key=lambda r: r["adjusted-date"])
    return all_rows


# ---------------------------------------------------------------------------
# Generate reimbursements.csv
# ---------------------------------------------------------------------------
def generate_reimbursements(returns_rows, adjustments_rows, n=200):
    rows = []
    reimbursement_counter = random.randint(1_000_000_000, 5_000_000_000)

    reason_map = {
        "return": "CUSTOMER_RETURN",
        "warehouse_lost": "WAREHOUSE_LOST",
        "warehouse_damaged": "WAREHOUSE_DAMAGED",
        "lost_inbound": "LOST_INBOUND",
        "carrier_damaged": "CARRIER_DAMAGED",
    }

    def make_reimbursement(prod, approval_date, reason_key, order_id=""):
        nonlocal reimbursement_counter
        reimbursement_counter += random.randint(1, 100)
        price = prod["price"]
        reimb_pct = random.uniform(0.70, 0.95)
        amount = round(price * reimb_pct, 2)
        qty_cash = 1
        qty_inv = 0
        if random.random() < 0.15:
            qty_cash = 0
            qty_inv = 1
            amount = 0.00

        case_id = str(random.randint(1_000_000_000, 9_999_999_999)) if random.random() < 0.70 else ""
        condition = weighted_choice([
            ("Sellable", 70), ("Damaged", 25), ("Defective", 5),
        ])

        return {
            "approval-date": approval_date,
            "reimbursement-id": str(reimbursement_counter),
            "case-id": case_id,
            "amazon-order-id": order_id,
            "reason": reason_map[reason_key],
            "sku": prod["sku"],
            "fnsku": prod["fnsku"],
            "asin": prod["asin"],
            "condition": condition,
            "currency-unit": "USD",
            "amount-per-unit": f"{amount:.2f}",
            "amount-total": f"{amount:.2f}",
            "quantity-reimbursed-cash": qty_cash,
            "quantity-reimbursed-inventory": qty_inv,
            "quantity-reimbursed-total": qty_cash + qty_inv,
        }

    # --- Reimbursements for refunded returns ---
    # When Amazon refunds a customer, the seller gets reimbursed for the return.
    # This applies to ALL refunded returns, not just damaged ones.
    refunded_returns = [
        r for r in returns_rows
        if r["status"] == "Refunded"
    ]
    # Reimburse ~88-90% of them (leaving 10-12% as genuine mismatches)
    random.shuffle(refunded_returns)
    n_reimburse_returns = int(len(refunded_returns) * random.uniform(0.88, 0.90))
    for ret in refunded_returns[:n_reimburse_returns]:
        prod = SKU_LOOKUP[ret["sku"]]
        ret_date = datetime.strptime(ret["return-date"], "%Y-%m-%d")
        delay = random.randint(5, 60)
        approval = ret_date + timedelta(days=delay)
        if approval >= END_DATE:
            approval = END_DATE - timedelta(days=1)
        rows.append(make_reimbursement(prod, approval.strftime("%Y-%m-%d"), "return", ret["order-id"]))

    # --- Reimbursements for inventory losses ---
    # The inventory_lost rule checks by DISTINCT fnsku. With only 60 SKUs,
    # we need to ensure ~20-25% of FNSKUs with losses get NO reimbursement at all,
    # not just fewer reimbursements per FNSKU.
    negative_adjs = [
        a for a in adjustments_rows
        if int(a["quantity"]) < 0 and a["reason"] in ("E", "M", "D", "U")
    ]
    lost_fnskus = list({a["fnsku"] for a in negative_adjs})
    random.shuffle(lost_fnskus)
    # ~75% of FNSKUs get at least one reimbursement; ~25% get nothing
    n_covered_fnskus = int(len(lost_fnskus) * 0.75)
    covered_fnskus = set(lost_fnskus[:n_covered_fnskus])

    for adj in negative_adjs:
        if adj["fnsku"] not in covered_fnskus:
            continue  # This FNSKU gets no inventory reimbursement
        # Even for covered FNSKUs, only reimburse ~70% of individual events
        if random.random() > 0.70:
            continue
        prod = SKU_LOOKUP[adj["sku"]]
        adj_date = datetime.strptime(adj["adjusted-date"], "%Y-%m-%d")
        delay = random.randint(10, 45)
        approval = adj_date + timedelta(days=delay)
        if approval >= END_DATE:
            approval = END_DATE - timedelta(days=1)
        reason_key = "warehouse_damaged" if adj["reason"] == "D" else "warehouse_lost"
        if adj["reason"] == "E":
            reason_key = random.choice(["warehouse_lost", "carrier_damaged"])
        rows.append(make_reimbursement(prod, approval.strftime("%Y-%m-%d"), reason_key))

    # --- Some standalone lost-inbound reimbursements ---
    n_inbound = int(n * 0.10)
    for _ in range(n_inbound):
        prod = pick_product()
        d = rand_date()
        rows.append(make_reimbursement(prod, d.strftime("%Y-%m-%d"), "lost_inbound"))

    rows.sort(key=lambda r: r["approval-date"])
    return rows


# ---------------------------------------------------------------------------
# Write CSV
# ---------------------------------------------------------------------------
def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  {path.name}: {len(rows)} rows")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Generating CedarCraft Home test data...")
    print(f"  Catalog: {len(CATALOG)} SKUs")
    print(f"  Date range: {START_DATE.date()} to {END_DATE.date()} ({TOTAL_DAYS} days)")
    print()

    returns = generate_returns(1800)
    adjustments = generate_adjustments(600)
    reimbursements = generate_reimbursements(returns, adjustments, 200)

    write_csv(
        OUTPUT_DIR / "returns.csv", returns,
        ["return-date", "order-id", "sku", "asin", "fnsku", "product-name",
         "quantity", "fulfillment-center-id", "detailed-disposition", "reason",
         "status", "license-plate-number", "customer-comments"],
    )
    write_csv(
        OUTPUT_DIR / "adjustments.csv", adjustments,
        ["adjusted-date", "transaction-item-id", "fnsku", "sku", "product-name",
         "fulfillment-center-id", "quantity", "reason", "disposition"],
    )
    write_csv(
        OUTPUT_DIR / "reimbursements.csv", reimbursements,
        ["approval-date", "reimbursement-id", "case-id", "amazon-order-id",
         "reason", "sku", "fnsku", "asin", "condition", "currency-unit",
         "amount-per-unit", "amount-total", "quantity-reimbursed-cash",
         "quantity-reimbursed-inventory", "quantity-reimbursed-total"],
    )

    # --- Summary stats ---
    print()
    print("=== Data Summary ===")

    damaged_returns = [r for r in returns if r["detailed-disposition"] not in ("SELLABLE",)]
    refunded_returns = [r for r in returns if r["status"] == "Refunded"]
    damaged_refunded = [r for r in returns if r["detailed-disposition"] not in ("SELLABLE",) and r["status"] == "Refunded"]
    print(f"  Returns: {len(returns)} total, {len(damaged_returns)} damaged/defective, {len(refunded_returns)} refunded")
    print(f"  Damaged+Refunded (potential return gaps): {len(damaged_refunded)}")

    neg_adjs = [a for a in adjustments if int(a["quantity"]) < 0]
    pos_adjs = [a for a in adjustments if int(a["quantity"]) > 0]
    print(f"  Adjustments: {len(adjustments)} total, {len(neg_adjs)} negative, {len(pos_adjs)} positive")

    total_reimb = sum(float(r["amount-total"]) for r in reimbursements)
    print(f"  Reimbursements: {len(reimbursements)} total, ${total_reimb:,.2f} total amount")

    reimb_order_ids = {r["amazon-order-id"] for r in reimbursements if r["amazon-order-id"]}
    unreimbursed_damaged = [
        r for r in damaged_refunded
        if r["order-id"] not in reimb_order_ids
    ]
    avg_price = sum(p["price"] for p in CATALOG) / len(CATALOG)
    est_return_gap = len(unreimbursed_damaged) * avg_price * 0.80
    est_inv_gap = len(neg_adjs) * 0.25 * avg_price * 0.50
    print()
    print(f"  Estimated return gaps: ~{len(unreimbursed_damaged)} cases (~${est_return_gap:,.0f})")
    print(f"  Estimated total recoverable: ~${est_return_gap + est_inv_gap:,.0f}")
    print()
    print("Done.")


if __name__ == "__main__":
    main()
