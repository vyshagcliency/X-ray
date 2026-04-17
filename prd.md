# Baslix Leakage X-Ray — Product Requirements Document

**Version:** 2.0
**Owner:** Vyshag
**Status:** Draft for build
**Last updated:** April 2026

---

## 1. Why this exists

Baslix's cold outreach problem is the same as every India-to-US service play: the buyer doesn't believe you until you've already done work for them. The free 30-day audit solves this, but it requires a sales conversation, portal access, NDAs, and a Controller's calendar — high friction before any value is shown.

The Leakage X-Ray collapses that friction to zero. A finance person at a $20M–$100M ecommerce brand uploads four CSVs they can pull from Seller Central in 90 seconds, and ten minutes later they have a forensic audit showing the exact dollars Amazon owes them, with dispute-ready evidence and deadlines counting down.

The tool exists to do three jobs:

1. **Replace the cold pitch with proof.** The first interaction with Baslix is a number on a PDF, not a sales line.
2. **Manufacture urgency the buyer can't ignore.** Dispute windows are objective deadlines. A countdown to losing $12k creates action no marketing copy can.
3. **Qualify the buyer without a call.** A brand that uploads reports and gets back a $200k recoverable number is a pre-qualified lead. A brand that gets back $8k isn't ICP and self-disqualifies.

This is not a marketing calculator. It is a real piece of software that does real recovery work, given away free because the recovery itself is worth 10–100x more than the cost to produce.

---

## 2. Goals and non-goals

### Goals

- Convert a cold visitor into a hot lead in under 15 minutes with zero human contact required
- Surface specific recoverable dollars (not estimates) tied to specific transactions
- Produce a deliverable the buyer would happily forward to their CFO
- Cost Baslix less than $30 in compute per audit

### Non-goals

- Filing disputes for the user (that's the paid service — never give it away)
- Connecting via SP-API in v1 (CSV upload only — lower trust ask, faster to build)
- Covering Vendor Central, Walmart, Target in v1 (Amazon 3P / FBA only — that's where CSV access is easiest and the detection rules are most mature)
- Becoming a SaaS dashboard (it's a one-shot report tool, not a product to log into repeatedly)
- Solving Bucket 2 fully in v1 (a few high-confidence Bucket 2 checks, the deep contract-vs-reality work is v2)
- Email sequences, nurture flows, or automated follow-ups (Vyshag handles outreach manually via the admin page)
- CRM integrations, Slack bots, or lead-routing automation (the admin page is the single source of truth)

---

## 3. Target user

**Primary:** Controller or Head of Finance at a US-based ecommerce brand doing $20M–$100M GMV, with at least 30% of revenue on Amazon 3P / FBA.

**Secondary:** Ecommerce ops leads, brand managers, and fractional CFOs who service the same brands.

**Out of ICP but will use the tool anyway:** sub-$5M sellers (will produce small recoverable numbers, self-disqualify), agencies (will use it to look smart for their clients — that's fine, free distribution).

The tool should not gate by ICP. Let everyone in. The ICP segment will reveal itself in the recovered-dollar output. Vyshag reviews leads via the admin page and decides who to reach out to manually.

---

## 4. End-to-end user journey

```
Landing page
   ↓
Email capture + brand name (only fields)
   ↓
Upload page — 4 required CSVs, 4 optional
   ↓
Processing page (live progress, ~3-8 min)
   ↓
Report page (in-browser dashboard + PDF download)
   ↓
Email with report link (single transactional email, not a sequence)
```

### 4.1 Landing page

Single-page site. Headline does the entire job:

> **Find every dollar Amazon owes you. In 10 minutes. Free.**
>
> Upload 4 reports from Seller Central. We'll forensically audit 18 months of FBA activity and show you every reimbursement Amazon should have paid you, every fee they overcharged, and every dispute window closing this week.
>
> No call. No signup. No software to install. We pay the compute bill.

Below the fold: a 60-second screen recording of the upload-to-report flow. Three sample finding cards (anonymized): "$14,331 in unreimbursed customer returns," "$8,902 in dimension overcharges on 23 ASINs," "$4,210 in lost inventory never claimed." A line at the bottom: "We're Baslix. We do this for ecommerce brands as a managed service and only get paid when you recover. The audit is free because if you find $200k of leakage, you'll probably want help filing the claims."

### 4.2 Email capture

Two fields only:
- Work email (used for report delivery)
- Brand / company name (used for report personalization)

No password. No phone number. No "how big is your business" dropdown. The CSVs will tell us everything we need to know.

A single checkbox: "I have read-only rights to upload these reports for my company." (Legal cover, not friction.)

### 4.3 Upload page

Four required CSVs. For each one, a tile shows:
- The exact name of the report in Seller Central
- A 1-line description of where to download it
- A "show me how" link expanding to a 4-screenshot walkthrough
- A drop zone

**Required reports:**

| # | Report name | Seller Central path | Date range | Why we need it |
|---|---|---|---|---|
| 1 | FBA Reimbursements | Reports > Fulfillment by Amazon > Payments > Reimbursements | Last 18 months | Master list of what Amazon has already paid back |
| 2 | FBA Customer Returns | Reports > Fulfillment by Amazon > Customer Concessions > Returns | Last 18 months | Every customer return event with disposition |
| 3 | FBA Inventory Adjustments | Reports > Fulfillment by Amazon > Inventory > Inventory Adjustments | Last 18 months | Every lost/damaged/found event in Amazon's warehouses |
| 4 | All Listings Report (or Active Listings) | Inventory > Inventory Reports > All Listings Report | Current snapshot | SKU catalog with current price, ASIN, fulfillment channel |

**Optional reports** (unlock deeper detection if uploaded):

| # | Report name | Unlocks |
|---|---|---|
| 5 | Settlement Report (V2, flat file) — last 6 months | Referral fee tier checks, Bucket 2 fee anomalies |
| 6 | FBA Fee Preview report | Dimension overcharge detection |
| 7 | Removal Order Detail | Removal-not-received recoveries |
| 8 | Manage FBA Inventory (with dimensions column) | Higher-confidence dimension audit |

The page should make uploading optional reports feel like unlocking achievements ("+$X estimated additional findings if you add this one").

Each CSV is parsed client-side first to validate it's the right report (header signature check) before being uploaded. Bad uploads are rejected immediately with a "this looks like the X report, not the Y report" message — saves processing cost.

### 4.4 Processing page

Streaming progress with named stages so the user feels the work happening:

- "Parsing 47,231 reimbursement records..."
- "Cross-referencing 12,884 customer returns..."
- "Checking 1,247 inventory adjustment events..."
- "Auditing fee structure on 312 SKUs..."
- "Detecting dimension overcharges..."
- "Calculating dispute windows..."
- "Generating evidence packets for top cases..."
- "Drafting your report..."

Total elapsed time target: 3-8 minutes for a typical brand. Above 10 minutes, switch the UI to "we're going deep on your data — we'll email you when it's done" and let them close the tab.

### 4.5 Report page

Lives at a unique unguessable URL (`xray.baslix.com/r/{uuid}`). Same URL is emailed to the user.

Top of the page:

> **We found $147,332 Amazon owes you.**
> **$23,104 of that has dispute windows closing in the next 14 days.**
> **You have 312 recoverable cases across 4 categories.**

Below the headline: four category cards (one per leakage type), each with a count, dollar total, and "view cases" expand. A "Download full PDF report" button at the top right.

Bottom of the page, before the footer:

> Filing 312 disputes is a 60-80 hour job. We do it for our customers as a managed service — we only get paid when the money lands in your account (20% of recovered, no retainer, no software). Want us to handle this batch?
>
> **[Talk to us — 15 min, no pitch deck]**

### 4.6 Report delivery email

A single transactional email, sent immediately on report completion:

- Subject line includes the headline number ("$147,332 found in your Amazon FBA audit")
- Body has key stats + link to the in-browser report + PDF download link
- Soft CTA to talk to Baslix at the bottom
- No follow-up sequence. No drip. No nurture. One email, that's it.

---

## 5. Detection logic — the actual work

This is the meat of the product. Each detection runs as an independent check and outputs zero or more "findings." A finding has: case ID, $ amount, evidence trail, confidence score (high/medium/low), dispute window status (days remaining), recommended action.

The categories below map roughly to Bucket 3 of the Baslix recovery model, with selected Bucket 2 checks layered in.

### 5.1 Customer return reimbursement gaps

**The leakage:** A customer returns a product. Amazon refunds the customer. The unit is supposed to either come back to your sellable inventory OR be reimbursed to you. Often, neither happens. Amazon ate your inventory and your cash.

**Detection rule:**
1. For every row in Customer Returns where `detailed-disposition` is `CUSTOMER_DAMAGED`, `DEFECTIVE`, `CARRIER_DAMAGED`, or `DAMAGED`:
2. Check if a corresponding row exists in Reimbursements within 60 days, matching on order ID and SKU
3. If no reimbursement AND the unit was not added back to sellable inventory (cross-check against Inventory Adjustments) → **finding**
4. Calculate recoverable amount = unit cost (use product price as proxy if cost unknown) x units

**Evidence packet generated:** Order ID, return date, disposition code, customer refund amount, expected reimbursement amount, screenshot-ready table of the gap.

**Confidence:** High when disposition is clearly damaged-by-customer or defective. Medium when disposition is ambiguous.

**Dispute window:** 60 days from the return date for FBA reimbursement claims, though Amazon's actual policy now allows up to 60 days post-customer-refund.

### 5.2 Lost / damaged inventory not reimbursed

**The leakage:** Amazon's warehouse loses or damages a unit of yours. Their system is supposed to auto-reimburse. Often it doesn't, or reimburses at the wrong value (their cost basis, not yours).

**Detection rule:**
1. For every row in Inventory Adjustments with reason codes indicating loss or damage (`M`, `E`, `H`, certain transaction codes)
2. Check Reimbursements for a matching event within 30 days, matched on FNSKU and date proximity
3. If no reimbursement → **finding (full unit value)**
4. If reimbursement exists but at a value < recent average sale price for the SKU → **finding (under-reimbursement = sale price - reimbursed amount)**

**Evidence packet:** Adjustment date, reason code, units affected, reimbursement check result, expected vs. actual reimbursement amount.

**Confidence:** High for the unreimbursed case. Medium for under-reimbursement (because Amazon's policy uses their formula, not sale price — but vendors win these on appeal often enough to be worth flagging).

**Dispute window:** 18 months from the adjustment date.

### 5.3 Customer refund vs. Amazon reimbursement mismatch

**The leakage:** Customer was refunded $50. Amazon reimbursed you $30. The $20 gap should have been covered.

**Detection rule:**
1. Join Returns (which shows refund-to-customer amount) with Reimbursements on order ID and SKU
2. Where refund amount > reimbursement amount AND unit not returned to inventory → **finding (delta)**

**Confidence:** High.

**Dispute window:** Same 60-day window, conservatively.

### 5.4 Returned-but-not-resold inventory

**The leakage:** Customer returned a unit. Amazon marked it sellable and put it back in inventory. But you can verify from inventory adjustments that the unit count doesn't match.

**Detection rule:**
1. Sum Returns marked `SELLABLE` per SKU per month
2. Sum corresponding "found" inventory adjustments per SKU per month
3. Flag SKUs with persistent gaps where sellable returns > found inventory

**Confidence:** Medium.

**Dispute window:** 18 months.

### 5.5 Dimension and weight overcharges (the hidden Bucket 2)

**The leakage:** Amazon measures your product on intake and assigns a size tier (small standard, large standard, large bulky, etc.). The tier determines the FBA fulfillment fee. Their measurements are wrong roughly 5-15% of the time, almost always in the direction that overcharges you.

**Detection rule (requires optional report 6 + 8):**
1. From Manage FBA Inventory: pull Amazon's measured dimensions and weight per ASIN
2. From All Listings or product catalog: pull the brand's stated dimensions
3. Where Amazon's measurement places the SKU in a higher fee tier than the brand's measurement would → **finding**
4. Recoverable amount = (Amazon's fee charged - correct tier fee) x units shipped over the period

**Evidence packet:** ASIN, Amazon's stated dimensions, brand's stated dimensions, fee tier delta, per-unit overcharge, total units affected, total $ overcharged.

**Confidence:** Medium-high. Final recovery requires a cubiscan request, but the finding itself is hard data.

**Dispute window:** Rolling — overcharges keep accruing until corrected, so urgency is "every month you wait, you keep paying."

### 5.6 Referral fee category misclassification

**The leakage:** Amazon's referral fee depends on category (8% for some, 15% for "everything else"). SKUs end up in wrong categories silently. A toy classified as "everything else" pays nearly double.

**Detection rule (requires optional report 5):**
1. From settlements: extract referral fee percentage actually charged per ASIN
2. From product listing data: determine the correct category and its fee
3. Where actual fee % > correct fee % → **finding**
4. Recoverable = (actual % - correct %) x revenue over period

**Confidence:** High when category is unambiguous.

**Dispute window:** Recoverable through Seller Support cases, no hard window but harder to recover the further back you go.

### 5.7 Removal orders not received

**The leakage:** You ordered Amazon to ship inventory back to you or to a 3PL. Amazon shipped it. It never arrived. They don't auto-reimburse for these.

**Detection rule (requires optional report 7):**
1. For every removal order with status SHIPPED but no DELIVERED confirmation after 30 days
2. Cross-check tracking against carrier API if available, otherwise flag based on Amazon's own status
3. **Finding** = (units x unit value) for each non-delivered shipment

**Confidence:** High.

**Dispute window:** 60 days from shipment date for the cleanest claims.

### 5.8 Long-term storage fee on actively-selling SKUs

**The leakage:** Amazon charges aged-inventory fees. Sometimes these get applied to SKUs that are actively selling, where the aged units are old batches that should have been auto-removed.

**Detection rule:**
1. Identify LTSF charges per SKU
2. Cross-reference against sales velocity for that SKU in the prior 90 days
3. Where SKU has consistent sales but LTSF was applied → flag for review (lower confidence, often legit, but recoverable in a meaningful subset of cases)

**Confidence:** Low-medium. Flagged for human review rather than auto-included in headline number.

### 5.9 Inbound shipment shortages

**The leakage:** You sent Amazon 100 units. They received 87. The 13 missing units are supposed to be reimbursed if not located within 30 days.

**Detection rule:**
1. Compare shipped quantity (from inbound shipment data, optional report) vs. received quantity in Inventory Adjustments
2. Where received < shipped after the reconciliation window → **finding**

**Confidence:** High.

**Dispute window:** Within 9 months of the shipment closing.

### 5.10 Fee anomaly detection (Bucket 2 lite)

**The leakage:** A SKU's fees suddenly change month-over-month with no corresponding category, dimension, or contract change. Often a silent reclassification by Amazon.

**Detection rule:**
1. Per SKU, compute month-over-month average per-unit fee
2. Flag any SKU with a >15% jump in average fee with no corresponding price/dimension change
3. Output the anomaly with a "this changed in [month] — was this a reclassification?" framing

**Confidence:** Medium. Sometimes legit, but the framing itself ("this changed silently and we caught it") is high-value even when not directly recoverable.

---

## 6. Output specification

### 6.1 In-browser report (the dashboard)

A single scrolling page, no tabs. Sections in order:

1. **Headline strip** — total recoverable, urgent (<14 days) recoverable, total cases, brand name and report date
2. **Category breakdown** — four cards (Returns, Lost Inventory, Dimensions, Other) with counts and dollars
3. **Urgency timeline** — a horizontal bar showing dollars by dispute window (closing this week / next 30 days / next 90 days / no hard window)
4. **Top 10 cases** — table with case ID, category, $ amount, days remaining, "view evidence"
5. **Pattern findings** — narrative blocks like "23 of your top SKUs show consistent dimension overcharges since November 2024 — this pattern alone accounts for $X,XXX of recoverable monthly"
6. **Recommended next action** — a single CTA block: book the Baslix call, with the exact top-3 findings restated to make the call feel inevitable

### 6.2 Downloadable PDF report

Generated server-side. Branded as Baslix but readable as a standalone document the Controller could forward.

Structure:

1. Cover page — brand name, audit date, total recoverable
2. Executive summary — 1 page, everything a CFO needs in 30 seconds
3. Methodology — 1 page, what data was analyzed, what wasn't, what each detection means
4. Findings by category — separate section per leakage type, with case-by-case detail tables
5. Top 25 dispute-ready cases — one page per case, each one formatted as if it were a dispute submission with the evidence laid out
6. Pattern analysis — narrative findings with charts
7. The math — show the calculations so it's defensible
8. About Baslix — last 2 pages, low-pressure positioning
9. Appendix — full case list, exportable to CSV

The PDF is the artifact that gets forwarded internally. Optimize for that.

### 6.3 Per-case evidence packet

Each case in the top 25 gets a one-pager that includes:
- Case identifier and category
- The transaction(s) involved (order IDs, dates, SKUs, FNSKUs)
- The expected outcome under Amazon's policy
- The actual outcome
- The dollar gap
- The dispute window calculation with exact dates
- A draft dispute message in the format Amazon Seller Support expects (without being so polished that it's a substitute for the paid service)

The draft dispute is intentionally not auto-filable. It's a starter, not a finished product. The full dispute filing — pulling all evidence, formatting per Amazon's exact requirements, refiling on denial, escalating — is the paid service.

---

## 7. Architecture

### 7.1 Stack recommendation

- **Frontend:** Next.js on Vercel
- **Auth-lite:** No auth. UUID-based report URLs. Email collected for report delivery only.
- **File upload + storage:** Supabase Storage with row-level security
- **Database:** Supabase Postgres (audits, findings, report metadata)
- **Background processing:** Trigger.dev v4 for the analysis pipeline (proven in ChannelScope, handles long-running tasks)
- **LLM:** Vercel AI SDK + Anthropic Claude for narrative generation and dispute draft text. Pure deterministic logic for the detection rules themselves — do not ask an LLM to do arithmetic or matching.
- **PDF generation:** Evaluate Typst first (fast, beautiful, structured). Fallback: Puppeteer in a Trigger.dev task.
- **Email:** Resend for the single transactional report-delivery email. No sequences, no nurture, no drip.

### 7.2 Processing pipeline

```
Upload event
   |
File validation worker
   - Header signature check per report type
   - Row count + date range sanity check
   - Reject with clear error if invalid
   |
Parse + normalize worker
   - Stream-parse CSVs (don't load into memory — these can be 100MB+)
   - Normalize into canonical schema (Returns, Adjustments, Reimbursements, Listings)
   - Store normalized data keyed by report UUID
   |
Detection workers (parallel, one per rule)
   - Each rule queries the normalized data
   - Each rule outputs zero or more findings to a findings table
   - Each finding has: rule_id, case_data (jsonb), dollar_amount, confidence, window_days_remaining
   |
LLM narrative worker
   - Given the structured findings, generate the pattern analysis narrative
   - Generate the per-case dispute draft text
   - This is where the LLM cost lives — bulk of compute
   |
PDF generation worker
   - Render the report from findings + narrative
   - Store in Supabase Storage, return signed URL
   |
Completion worker
   - Email user with report link
   - Mark audit as "completed" (or "pending_review" in Phase 1)
```

### 7.3 Critical engineering rules

- **LLMs never do math.** All dollar calculations are deterministic code. The LLM only writes prose given pre-computed numbers. This is the difference between a tool that works and a tool that hallucinates a $147k recovery that isn't real.
- **Detection rules are versioned.** Every finding records the rule version that produced it. When you fix or improve a rule, old reports remain reproducible.
- **All findings have audit trails.** Every $ figure traces back to the exact rows in the source CSVs. The report should be defensible if a Controller's auditor pushes back.
- **Confidence scores are visible.** Don't bury low-confidence findings in the headline number. Headline = high-confidence only. Medium and low get separate sections.

---

## 8. Admin page

A password-protected internal page at `/admin` (not visible to users, not linked from any public page). This is Vyshag's single pane of glass for operating the tool.

### 8.1 Audit list

- Table of all audits: brand name, email, status (pending_review / completed / failed), total recoverable $, date created, date completed
- Sortable by any column, filterable by status
- Click into any audit to see its full report (same view the user sees)
- Search by brand name or email

### 8.2 Manual review queue (Phase 1)

- Audits in Phase 1 go to `pending_review` status instead of auto-delivering
- Admin sees the full report with an edit overlay
- One-click "Approve & Send" delivers the report to the user and sends the email
- "Reject" option with a notes field (captures why, improves rules)
- Phase 2+: review queue becomes optional (self-serve delivery is default)

### 8.3 Cost monitoring

- Per-audit cost breakdown (storage, compute, LLM tokens, PDF generation, email)
- 7-day rolling average cost per audit
- Flag any audit that exceeded $50
- Monthly total spend

### 8.4 Funnel metrics

- Counts at each step: visited → email captured → CSVs uploaded → audit completed → PDF downloaded
- Conversion rate between each step
- Median report value (the single most important metric)
- % of reports above $50k

### 8.5 Block list

- Add/remove email domains
- Blocked domains see a polite "we can't process this right now" message
- Log of blocked attempts (date, email, IP)

### 8.6 Failed audit log

- All failed audits with error details
- Which step failed, what the error was
- One-click to view the user's uploaded files (before 30-day purge)

---

## 9. Data handling, security, trust

This is the part that determines whether a US Controller actually uploads. Get it wrong and the conversion rate craters.

### 9.1 What we collect

- Email + brand name (PII)
- The four CSV reports (PII via order data, but no payment info, no customer addresses in the FBA reports)

### 9.2 What we promise on the upload page (visible, plain English)

- "Your data is encrypted at rest and in transit."
- "We delete your original CSV files 30 days after your report is generated. A columnar copy is retained so your report stays accessible — you can request full deletion anytime, and we erase everything."
- "We never share your data with third parties. Ever."
- "We do not use your data to train models."
- "You can request full deletion at any time using the one-click link in your report email."

### 9.3 What we actually do

- Encryption at rest (Supabase default), TLS in transit
- Per-report isolated storage with signed URLs
- Auto-purge of raw CSV files at 30 days via scheduled job (Parquet columnar copy retained; see architecture §4.3)
- Aggregated, anonymized findings can be retained for benchmark stats (clearly disclosed in privacy policy)
- A real privacy policy and terms link in the footer — not a stub
- User-initiated deletion: each report email contains a signed one-click deletion link (`/deletion/{audit_id}?token=...`). Clicking confirms and cascades-wipes raw CSV, Parquet, findings, case source rows, and the rendered PDF. Admin processes manually in Phase 1; automated in Phase 2.

### 9.4 What we don't do (and shouldn't, ever)

- Don't ask for SP-API access in v1 (that's the paid-service ask)
- Don't ask for bank account, GL access, tax info
- Don't store credentials of any kind
- Don't email-sell to anyone the user mentions in their reports
- Don't send any emails beyond the single report-delivery email

---

## 10. Cost model

Per-audit cost target: **under $30**, ideally $10-15.

**Breakdown estimate:**

| Component | Estimated cost |
|---|---|
| Storage + bandwidth (Supabase) | $0.10 |
| Compute for detection rules (background workers) | $0.50 |
| LLM tokens — narrative generation, dispute drafts (~50-100k output tokens at Claude Sonnet rates) | $5-15 |
| PDF generation | $0.05 |
| Email (single transactional) | $0.01 |
| **Total per audit** | **~$6-16** |

**Abuse prevention:**
- Rate limit by email domain (5 audits per domain per 30 days)
- Rate limit by IP (10 per IP per day)
- Manual block list for known competitor domains (managed via admin page)
- Disposable email domains rejected

---

## 11. Build phases

The temptation will be to build all 10 detection rules before launching. Don't. Ship in three phases.

### Phase 1 — MVP (4-6 weeks, 1 engineer + Vyshag)

- Landing page + email capture
- Upload of 3 required CSVs (Returns, Adjustments, Reimbursements only — skip Listings for v1)
- 3 detection rules only:
  1. Customer return reimbursement gaps (5.1)
  2. Lost / damaged inventory not reimbursed (5.2)
  3. Customer refund vs. reimbursement mismatch (5.3)
- Basic in-browser report + PDF
- Single report-delivery email
- Admin page with manual review queue, audit list, cost monitoring
- Manual review by Vyshag of the first 20 reports before sending
- Manual outreach for any finding > $25k (Vyshag checks admin page, decides who to contact)

**Goal:** Ship to 50 brands. Validate that the report quality holds up. Tune the rules.

### Phase 2 — Full Bucket 3 (weeks 7-12)

- Add the 4th required CSV (Listings) and optional CSVs 5, 6, 7, 8
- Add detection rules 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
- Add the dimension overcharge analysis (highest-wow finding type)
- Self-serve report delivery (no manual review, admin review becomes optional)
- Admin page: funnel metrics, block list management
- CSV export of findings from report page

**Goal:** Ship to 300 brands. Convert 5-10 to paid contracts.

### Phase 3 — Bucket 2 expansion (months 4-6)

- Settlement report deep analysis
- Fee anomaly detection (5.10)
- LTSF analysis (5.8)
- Begin scoping the Contract vs. Reality v2 tool

**Goal:** 1,000+ brands run audits, the tool is the primary acquisition channel for Baslix.

### What to fake in Phase 1

- The PDF should be a 12-page PDF in v1. Length isn't value, signal is.
- The "pattern findings" narrative can be templated with LLM filling in numbers, not generated from scratch
- The dispute window calculations can be conservative defaults (e.g., always show 60 days for returns) rather than per-case
- The outreach after reviewing reports is entirely manual — Vyshag checks the admin page, sees high-value audits, emails them from Gmail

---

## 12. Success metrics

Tracked from week 1 of public launch (all visible on admin page):

| Metric | Target by month 3 | Target by month 6 |
|---|---|---|
| Audits started (email captured) | 200 | 800 |
| Audits completed (CSVs uploaded + report generated) | 100 | 500 |
| Completion rate (started → completed) | 50% | 65% |
| Median report value (recoverable $ found) | $30k | $75k |
| % of reports above $50k | 25% | 40% |
| Cost per audit | <$20 | <$15 |

The single most important metric is **median report value**. If the average finding is below $20k, the ICP isn't using it and the tool is misaligned. If it's above $50k, every other metric will fall into place.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Findings hallucinated by an LLM that does the math | Architecturally separate detection (deterministic) from narrative (LLM). LLM only writes prose around precomputed numbers. |
| Brand uploads garbage CSVs and gets a $0 report | Validate report headers up front, give clear error messages, offer "we'll help you find the right report" support email |
| Competitor (ProfitGuard, Getida) clones the tool | First-mover advantage on positioning and SEO. Ship the v2 (contract vs reality) before they catch up. |
| Buyer worried about uploading sensitive data | Clear, short privacy promise on the upload page. Auto-deletion by default. Don't ask for credentials. SOC2 roadmap on the about page. |
| Tool surfaces real money but buyer DIYs the disputes | This is fine. ~80% of buyers won't have the time to file 312 disputes themselves and will come to Baslix. |
| Too many low-ICP users (sub-$5M brands) clog the pipeline | They self-disqualify via small report numbers. Vyshag only manually reaches out to high-value brands via admin page. |
| Cost per audit balloons because reports are huge | Cap input file sizes (200MB per CSV is plenty), cap LLM token budgets per audit, monitor cost per audit on admin page. |
| Amazon changes its report formats | Versioned parsers. Monitor failure rates via admin failed-audit log. |
| Regulatory / Amazon TOS questions about scraping or API access | We're not scraping. The user is uploading their own data voluntarily. Stays clean as long as we don't add SP-API connection in v1. |

---

## 14. Open questions

- Should we offer the report in two tiers (basic free, premium $99) to monetize non-ICP traffic? **Recommendation: no, in v1. Defeats the "weird that it's free" magic.**
- Should the PDF be Baslix-branded or whitelabel-able for fractional CFOs / agencies who want to reuse it? **Recommendation: explore in Phase 3 as a partnership channel.**
- Should we offer to file the top-3 free disputes for the user as a "taste" of the paid service? **Recommendation: yes, but only after validating the v1 detection rules, and only for ICP-fit reports. Massive conversion lever.**
- Do we localize for non-US Amazon marketplaces (UK, EU, JP, AU)? **Recommendation: not in v1. US-only matches the ICP.**
- Should the tool live at `baslix.com/x-ray` or its own domain (`leakagexray.com`)? **Recommendation: own subdomain on the Baslix domain (`xray.baslix.com`) — keeps SEO benefit while feeling like a standalone product.**

---

## 15. The uncomfortable question

Should Baslix actually give this away?

The argument against: the tool itself is worth $5-10k as a one-time consulting deliverable. Giving it away free trains the market that this work is cheap.

The argument for: the recovery service is worth $50k-$280k per logo per year. The audit is the single best way to prove the recovery service is real before a sales conversation. Free audits are not the product. Recovery is the product. The audit is the bait.

The math is overwhelming on the "give it away" side. A 1% conversion rate from audit to paid contract, at $50k average year-1 revenue, with $15 per audit cost, gives a 333x ROI on each audit dollar spent. Even at 0.1% conversion, the tool pays for itself many times over.

Ship it.
