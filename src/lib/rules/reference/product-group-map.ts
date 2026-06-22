/**
 * Amazon Fee Preview `product-group` → referral category map — payout-integrity wedge.
 *
 * The referral-fee rule needs each SKU's referral *category* to look up the correct
 * rate. The Settlement report gives the fee charged, but the category comes from the
 * Fee Preview report's `product-group` column — which uses Amazon's legacy product-group
 * *codes* (e.g. "ce", "home_garden"), NOT the referral category labels in
 * referral-rates.ts. This table bridges the two.
 *
 * Design: maps both (a) the legacy codes we're confident about and (b) the canonical
 * referral category names to themselves (identity) — so the rule works whether a report
 * carries a code or a clean label. Anything unmapped falls back to "Everything Else"
 * (15% standard) in the rule via COALESCE. That fallback is deliberately CONSERVATIVE:
 * an unmapped SKU is assumed to be a standard-rate item, so a mapping miss can only
 * cause a *missed* overcharge, never a false one. Credibility over coverage.
 *
 * ⚠️ Amazon does not publish the enumerated `product-group` value list, and it isn't on
 * any public page. The codes below are the well-known ones; VERIFY and EXTEND against a
 * real Fee Preview export before relying on category coverage. Bump
 * PRODUCT_GROUP_MAP_VERSION when rows change.
 */

export const PRODUCT_GROUP_MAP_VERSION = "2026.1";

/**
 * Named CTE mapping a Fee Preview `product-group` value to a referral category.
 * Columns: alias (lowercased match key), referral_category. Join case-insensitively:
 *   `LEFT JOIN product_group_map m ON m.alias = LOWER(TRIM(p."product-group"))`
 * then `COALESCE(m.referral_category, 'Everything Else')`.
 */
export const PRODUCT_GROUP_MAP_CTE = /* sql */ `
  product_group_map(alias, referral_category) AS (
    VALUES
      -- Identity: canonical referral category labels map to themselves
      ('clothing and accessories',         'Clothing and Accessories'),
      ('jewelry',                          'Jewelry'),
      ('watches',                          'Watches'),
      ('beauty, health and personal care', 'Beauty, Health and Personal Care'),
      ('baby products',                    'Baby Products'),
      ('furniture',                        'Furniture'),
      ('appliances - compact',             'Appliances - Compact'),
      ('electronics accessories',          'Electronics Accessories'),
      ('consumer electronics',             'Consumer Electronics'),
      ('personal computers',               'Personal Computers'),
      ('amazon device accessories',        'Amazon Device Accessories'),
      ('home and kitchen',                 'Home and Kitchen'),
      ('toys and games',                   'Toys and Games'),
      ('sports and outdoors',              'Sports and Outdoors'),
      ('everything else',                  'Everything Else'),
      -- Legacy Amazon product-group codes (high confidence)
      ('ce',                  'Consumer Electronics'),
      ('consumer_electronics','Consumer Electronics'),
      ('camera',              'Consumer Electronics'),
      ('photo',               'Consumer Electronics'),
      ('wireless',            'Consumer Electronics'),
      ('pc',                  'Personal Computers'),
      ('personal_computer',   'Personal Computers'),
      ('home',                'Home and Kitchen'),
      ('kitchen',             'Home and Kitchen'),
      ('home_garden',         'Home and Kitchen'),
      ('home_improvement',    'Home and Kitchen'),
      ('sporting_goods',      'Sports and Outdoors'),
      ('sports',              'Sports and Outdoors'),
      ('outdoors',            'Sports and Outdoors'),
      ('toy',                 'Toys and Games'),
      ('toys',                'Toys and Games'),
      ('apparel',             'Clothing and Accessories'),
      ('shoes',               'Clothing and Accessories'),
      ('beauty',              'Beauty, Health and Personal Care'),
      ('luxury_beauty',       'Beauty, Health and Personal Care'),
      ('hpc',                 'Beauty, Health and Personal Care'),
      ('health_and_beauty',   'Beauty, Health and Personal Care'),
      ('baby',                'Baby Products'),
      ('baby_product',        'Baby Products'),
      ('watch',               'Watches')
  )
`;
