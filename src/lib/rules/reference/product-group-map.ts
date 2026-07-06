/**
 * Amazon Fee Preview `product-group` → referral category map: payout-integrity wedge.
 *
 * Bridges the Fee Preview `product-group` value (legacy code like "ce"/"gl_home", or a
 * clean label) to a referral category in referral-rates.ts, so the referral-fee rule can
 * look up the SKU's published rate.
 *
 * ── ASYMMETRIC SAFETY RULE (governs every row) ───────────────────────────────
 * The rule flags when charged_rate > expected_rate. So:
 *   • Mapping a code to a rate HIGHER than reality → a missed finding (SAFE).
 *   • Mapping a code to a rate LOWER  than reality → a FALSE finding (CATASTROPHIC
 *     for a verify-everything CFO).
 * Only add a row at high confidence. When unsure, DO NOT add it — unmapped falls back
 * to "Everything Else" (15%) via COALESCE, a high expected rate = safe under-fire.
 * Never map a heterogeneous or uncertain code to a sub-15% category.
 *
 * ── HETEROGENEITY CAVEAT (why the map is necessary but not sufficient) ────────
 * One `product-group` value routinely spans two fee categories. Example, proven on the
 * Halcyon dataset: an audio-accessory seller's cables/chargers (Electronics Accessories,
 * 15%) carry the SAME "Consumer Electronics" product-group as its headphones (8%). Trusting
 * a sub-15% mapping (▼ rows below) without the rule-level false-positive guard fabricates
 * overcharges on the correctly-billed 15% members. Rows tagged ▼ are sub-15% and MUST NOT
 * be trusted for a headline finding without the guard in referral-fee-mismatch.ts
 * (see report-killer-referral-guard.md §4).
 *
 * ── COVERAGE CONSTRAINT ──────────────────────────────────────────────────────
 * The referral rule INNER-joins referral_rates, so a code mapped to a category NOT in
 * referral-rates.ts silently drops (safe, zero coverage). To cover sub-15% categories
 * absent from the rate table (Automotive 12%, Grocery 8%, Pet/Office/Books 15%), FIRST add
 * those categories to referral-rates.ts. Until then those codes stay unmapped → 15% (safe).
 *
 * SOURCE (2026-07-05 research): Amazon does not publish the enumerated product-group/GL list;
 * the fee category is set by an internal GL code, not this column. Common gl_* stems compiled
 * from Amazon inventory flat-file "Valid Values" tabs, seller-forum GL lists, and integration
 * vendor docs. VERIFY + EXTEND against a real Fee Preview export (real-data asterisk, plan P5.3).
 */

export const PRODUCT_GROUP_MAP_VERSION = "2026.2";

/**
 * Named CTE mapping a Fee Preview `product-group` value to a referral category.
 * Columns: alias (lowercased match key), referral_category. Join case-insensitively:
 *   `LEFT JOIN product_group_map m ON m.alias = LOWER(TRIM(p."product-group"))`
 * then `COALESCE(m.referral_category, 'Everything Else')`.
 */
export const PRODUCT_GROUP_MAP_CTE = /* sql */ `
  product_group_map(alias, referral_category) AS (
    VALUES
      -- ── Identity: canonical referral category labels → themselves ──
      ('clothing and accessories',         'Clothing and Accessories'),
      ('jewelry',                          'Jewelry'),
      ('watches',                          'Watches'),
      ('beauty, health and personal care', 'Beauty, Health and Personal Care'),
      ('baby products',                    'Baby Products'),
      ('furniture',                        'Furniture'),
      ('appliances - compact',             'Appliances - Compact'),
      ('electronics accessories',          'Electronics Accessories'),
      ('consumer electronics',             'Consumer Electronics'),   -- ▼ 8%
      ('personal computers',               'Personal Computers'),     -- ▼ 6%
      ('amazon device accessories',        'Amazon Device Accessories'),
      ('home and kitchen',                 'Home and Kitchen'),
      ('toys and games',                   'Toys and Games'),
      ('sports and outdoors',              'Sports and Outdoors'),
      ('lawn mowers and snow throwers',    'Lawn Mowers and Snow Throwers'),
      ('everything else',                  'Everything Else'),

      -- ── Consumer Electronics (8%) ▼ guard-required ──
      ('ce',                  'Consumer Electronics'),
      ('gl_ce',               'Consumer Electronics'),
      ('consumer_electronics','Consumer Electronics'),
      ('camera',              'Consumer Electronics'),
      ('gl_camera',           'Consumer Electronics'),
      ('camera_photo',        'Consumer Electronics'),
      ('gl_camera_photo',     'Consumer Electronics'),
      ('photo',               'Consumer Electronics'),

      -- ── Personal Computers (6%) ▼ guard-required ──
      ('pc',                  'Personal Computers'),
      ('gl_pc',               'Personal Computers'),
      ('personal_computer',   'Personal Computers'),

      -- ── Beauty / Health & Personal Care (8% ≤$10, else 15%) ▼ guard-required on low band ──
      ('beauty',              'Beauty, Health and Personal Care'),
      ('gl_beauty',           'Beauty, Health and Personal Care'),
      ('luxury_beauty',       'Beauty, Health and Personal Care'),  -- true 5% → maps higher → safe (miss)
      ('hpc',                 'Beauty, Health and Personal Care'),
      ('health_and_beauty',   'Beauty, Health and Personal Care'),
      ('gl_health_personal_care','Beauty, Health and Personal Care'),

      -- ── Baby (8% ≤$10, else 15%) ▼ guard-required on low band ──
      ('baby',                'Baby Products'),
      ('baby_product',        'Baby Products'),
      ('gl_baby_product',     'Baby Products'),

      -- ── Clothing (tiered 5/10/17%) — apparel ONLY, never shoes ▼ guard-required ──
      ('apparel',             'Clothing and Accessories'),
      ('gl_apparel',          'Clothing and Accessories'),

      -- ── Jewelry (20% → 5% above $250) / Watches (16% → 3% above $1500) ──
      ('gl_jewelry',          'Jewelry'),
      ('watch',               'Watches'),
      ('gl_watch',            'Watches'),

      -- ── Furniture (15% → 10% above $200) ──
      ('gl_furniture',        'Furniture'),

      -- ── Home & Kitchen (15%, = fallback; mapped for clarity, behaviour-neutral) ──
      ('home',                'Home and Kitchen'),
      ('gl_home',             'Home and Kitchen'),
      ('kitchen',             'Home and Kitchen'),
      ('gl_kitchen',          'Home and Kitchen'),
      ('home_garden',         'Home and Kitchen'),
      ('gl_home_garden',      'Home and Kitchen'),
      ('home_improvement',    'Home and Kitchen'),
      ('gl_home_improvement', 'Home and Kitchen'),

      -- ── Sports & Outdoors (15%, = fallback) ──
      ('sporting_goods',      'Sports and Outdoors'),
      ('gl_sporting_goods',   'Sports and Outdoors'),
      ('sports',              'Sports and Outdoors'),
      ('outdoors',            'Sports and Outdoors'),

      -- ── Toys & Games (15%, = fallback) ──
      ('toy',                 'Toys and Games'),
      ('gl_toy',              'Toys and Games'),
      ('toys',                'Toys and Games')

      -- REMOVED (D9, false-positive risk — leave unmapped → safe 15%):
      --   ('wireless','Consumer Electronics')  gl_wireless spans phones+accessories, not 8% CE
      --   ('shoes','Clothing and Accessories') shoes ~15% flat, not the tiered 5/10/17 schedule
      -- NOT MAPPED (category absent from referral-rates.ts → would inner-join-drop; add the
      -- category there first to gain coverage): automotive(12%), grocery(8%), pet_products(15%),
      -- office_product(15%), book(15%), musical_instruments, major_appliances.
  )
`;
