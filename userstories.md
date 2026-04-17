# Baslix Leakage X-Ray — User Stories

**Companion to:** prd.md
**Format:** Standard agile user stories grouped by epic, with acceptance criteria, priority, and phase.

**Priority key:** P0 = MVP blocker, P1 = MVP nice-to-have, P2 = Phase 2, P3 = Phase 3
**Persona key:**
- **Controller** — primary ICP user, finance person at a $20M-$100M brand
- **Ops Lead** — secondary ICP user, ecommerce ops manager
- **Fractional CFO / Agency** — secondary user, services multiple brands
- **Vyshag (internal)** — Baslix founder reviewing reports and following up on leads
- **Engineer (internal)** — Baslix dev maintaining the system

---

## Epic 1 — Discovery and landing

### US-1.1 — Land on the page and understand the offer in 10 seconds
**Priority:** P0 — Phase 1
**As a** Controller arriving from a LinkedIn message
**I want to** immediately understand what this tool does and what it costs me
**So that** I can decide in under 10 seconds whether to keep going

**Acceptance criteria:**
- Headline above the fold answers: what is it, what do I do, what do I get, how much does it cost
- The word "free" appears in the first viewable area
- A 60-second screen recording is visible without scrolling on desktop
- Three sample finding cards are visible below the fold with anonymized brand examples
- Page loads in under 1.5s on 4G mobile

### US-1.2 — Understand who is behind the tool
**Priority:** P0 — Phase 1
**As a** skeptical Controller
**I want to** see who Baslix is and why they're giving this away
**So that** I trust the upload enough to actually do it

**Acceptance criteria:**
- A clear "About Baslix" block on the landing page (not buried in footer)
- One sentence explains the business model: managed recovery service, paid only when customers recover
- Link to a real company website / LinkedIn / case studies
- A real privacy policy link, not a stub

### US-1.3 — Watch the demo without committing
**Priority:** P1 — Phase 1
**As a** cautious user
**I want to** see what the report looks like before I upload anything
**So that** I know what I'll get

**Acceptance criteria:**
- A "see a sample report" link on the landing page opens an anonymized full PDF in a new tab
- Sample report uses realistic numbers, real-looking case data
- Sample report has the same CTA at the end as a real one

---

## Epic 2 — Email capture and onboarding

### US-2.1 — Submit email and brand name with minimum friction
**Priority:** P0 — Phase 1
**As a** user ready to try the tool
**I want to** start the audit with only my email and company name
**So that** I'm not stopped by a long signup form

**Acceptance criteria:**
- Two fields only: work email + brand name
- Single legal checkbox ("I have rights to upload these reports")
- No password, no phone number, no role dropdown, no company size
- One CTA button: "Start free audit"
- Submit immediately moves the user to the upload page

### US-2.2 — Block obvious abuse without blocking real users
**Priority:** P0 — Phase 1
**As an** Engineer
**I want to** rate-limit submissions
**So that** competitors can't drain compute budget by spamming the form

**Acceptance criteria:**
- Max 5 audits per email domain per 30 days
- Max 10 submissions per IP per day
- Block list for known competitor domains, editable in admin page
- Disposable email domains (mailinator etc.) rejected with a clear message

### US-2.3 — Resume an audit from a different device
**Priority:** P2 — Phase 2
**As a** user who started on mobile but wants to upload from desktop
**I want to** click a link in my email and resume where I left off
**So that** I don't re-enter information

**Acceptance criteria:**
- Link opens the upload page with email pre-filled
- Any partially-uploaded files are still there
- Link is valid for 7 days

---

## Epic 3 — File upload

### US-3.1 — Find and download the right reports from Seller Central
**Priority:** P0 — Phase 1
**As a** Controller who hasn't pulled these reports before
**I want** crystal-clear instructions on where each report lives in Seller Central
**So that** I don't give up halfway through

**Acceptance criteria:**
- Each required report tile shows: exact report name, exact menu path, expected date range
- Each tile has a "show me how" link expanding to a 4-screenshot walkthrough
- Walkthroughs include screenshots of the actual Seller Central UI as of latest release
- A "I'm stuck" link opens an email to support

### US-3.2 — Upload a CSV and get instant validation
**Priority:** P0 — Phase 1
**As a** user uploading reports
**I want to** know immediately if I uploaded the wrong file
**So that** I can fix it without waiting 5 minutes for processing to fail

**Acceptance criteria:**
- File parsed client-side on drop
- Header signature checked against expected schema for that report type
- If headers don't match expected report, show clear error: "this looks like the X report, you uploaded it in the Y slot"
- Row count and date range surfaced as a confirmation: "12,847 rows, dates Jan 2024-Mar 2026"
- Wrong file rejected before upload to server (zero compute cost on bad uploads)

### US-3.3 — See progress as I upload large files
**Priority:** P0 — Phase 1
**As a** user with a 150MB CSV
**I want to** see upload progress and an estimated time
**So that** I don't think the page is broken

**Acceptance criteria:**
- Per-file progress bar with percentage and MB/s
- Total upload size displayed
- Resumable uploads if connection drops (chunked upload)
- Max file size displayed up front (200MB per file)

### US-3.4 — Add optional reports to unlock deeper findings
**Priority:** P1 — Phase 2
**As a** user who wants the most thorough audit possible
**I want to** see what additional findings I unlock by adding optional reports
**So that** I'm motivated to upload them

**Acceptance criteria:**
- Optional report tiles styled distinctly from required ones
- Each shows a "+$X estimated additional findings" estimate when relevant
- Skipping optional reports doesn't block the audit from running
- Final report calls out any findings categories that were skipped due to missing optional uploads

### US-3.5 — Submit the audit job
**Priority:** P0 — Phase 1
**As a** user who has uploaded all required files
**I want to** kick off the audit with one click
**So that** processing starts immediately

**Acceptance criteria:**
- "Run audit" button is disabled until all 3 (Phase 1) or 4 (Phase 2) required CSVs are uploaded and validated
- Click triggers job submission and routes to processing page
- Job ID generated and stored

---

## Epic 4 — Processing

### US-4.1 — See live progress during analysis
**Priority:** P0 — Phase 1
**As a** user waiting for results
**I want to** see what the system is actually doing
**So that** I trust the work being done and don't close the tab

**Acceptance criteria:**
- Progress page shows named stages (parsing, cross-referencing, etc.)
- Each stage shows a meaningful number ("Parsing 47,231 reimbursement records...")
- Stages update in real time via websocket or polling every 2s
- Total elapsed time shown
- Estimated time remaining shown after first 30 seconds

### US-4.2 — Walk away and come back
**Priority:** P0 — Phase 1
**As a** busy user
**I want to** close the tab and get an email when the report is ready
**So that** I don't have to babysit the page

**Acceptance criteria:**
- Processing continues server-side regardless of browser state
- Email sent on completion with link to report
- If processing exceeds 10 minutes, UI auto-switches to "we'll email you when it's ready"

### US-4.3 — Get notified if the audit fails
**Priority:** P0 — Phase 1
**As a** user whose audit hits an error
**I want to** know what went wrong and what to do
**So that** I'm not left in the dark

**Acceptance criteria:**
- Failed audits show a clear error message on the processing page
- If the user closed the tab, a failure email is sent with plain-English explanation
- User can re-upload affected files without starting over

### US-4.4 — Process audits without timing out
**Priority:** P0 — Phase 1
**As an** Engineer
**I want** background workers that don't hit serverless timeouts
**So that** large audits complete reliably

**Acceptance criteria:**
- All processing runs in a background queue (Trigger.dev), not in HTTP request lifecycle
- Each worker has a timeout appropriate to its task
- Failed workers retry with exponential backoff up to 3 times
- Permanent failures logged to admin failed-audit log

### US-4.5 — Never let an LLM do arithmetic
**Priority:** P0 — Phase 1
**As an** Engineer maintaining the integrity of the tool
**I want** all dollar calculations to be deterministic code
**So that** no finding is ever hallucinated

**Acceptance criteria:**
- Detection rules are pure functions in code, no LLM calls
- LLMs are only used for narrative prose generation given precomputed numbers
- Unit tests exist for every detection rule with synthetic data
- Every finding records the rule version that produced it

---

## Epic 5 — Findings detection

### US-5.1 — Detect customer return reimbursement gaps
**Priority:** P0 — Phase 1
**As a** Controller
**I want** the system to find every customer return where Amazon refunded the customer but never reimbursed me or returned the unit
**So that** I see exactly where Amazon ate my inventory

**Acceptance criteria:**
- Rule scans Customer Returns for damaged/defective dispositions
- Cross-checks Reimbursements within 60-day window matching on order ID + SKU
- Flags every gap as a finding with case data, dollar amount, evidence trail
- Each finding has confidence score and dispute window remaining
- Matches PRD section 5.1 exactly

### US-5.2 — Detect lost or damaged inventory not reimbursed
**Priority:** P0 — Phase 1
**As a** Controller
**I want** the system to find every warehouse loss/damage event that Amazon failed to reimburse
**So that** I know what claims to file

**Acceptance criteria:**
- Rule scans Inventory Adjustments for loss/damage reason codes
- Cross-checks Reimbursements within 30 days on FNSKU
- Flags unreimbursed events as full-value findings
- Flags under-reimbursed events as delta-value findings (medium confidence)
- 18-month dispute window calculated per finding

### US-5.3 — Detect refund > reimbursement mismatches
**Priority:** P0 — Phase 1
**As a** Controller
**I want** to find returns where my refund to the customer exceeded what Amazon reimbursed me
**So that** I recover the gap

**Acceptance criteria:**
- Joins Returns with Reimbursements on order ID + SKU
- Flags every row where refund > reimbursement and unit not returned to inventory
- Recoverable amount = delta

### US-5.4 — Detect dimension overcharges
**Priority:** P1 — Phase 2
**As a** Controller
**I want** the system to find SKUs where Amazon's measured dimensions put me in a higher fee tier than my actual product warrants
**So that** I can request a cubiscan and recover the overcharges

**Acceptance criteria:**
- Requires Manage FBA Inventory + product catalog uploads
- Compares Amazon's measurements vs. brand-stated dimensions
- Identifies fee tier mismatches and computes per-unit overcharge
- Aggregates total $ overcharged across units shipped in the period
- Each finding includes both dimension sets and the fee tier delta

### US-5.5 — Detect referral fee category misclassification
**Priority:** P1 — Phase 2
**As a** Controller
**I want** to find SKUs being charged the wrong referral fee percentage
**So that** I can request reclassification and recover the difference

**Acceptance criteria:**
- Requires Settlement Report upload
- Extracts actual referral fee % per ASIN
- Compares against expected category fee
- Flags mismatches with revenue x delta as recoverable

### US-5.6 — Detect removal orders not received
**Priority:** P1 — Phase 2
**As a** Controller
**I want** to find removal shipments that left Amazon but never arrived
**So that** I can file claims for the lost inventory

**Acceptance criteria:**
- Requires Removal Order Detail upload
- Flags orders with SHIPPED status but no DELIVERED confirmation after 30 days
- Recoverable = units x unit value
- 60-day dispute window

### US-5.7 — Detect returned-but-not-resold inventory
**Priority:** P2 — Phase 2
**As a** Controller
**I want** to identify SKUs where sellable returns exceed found-inventory adjustments
**So that** I can investigate the discrepancy

**Acceptance criteria:**
- Per-SKU monthly aggregation of sellable returns vs. found adjustments
- Flags persistent gaps as medium-confidence findings

### US-5.8 — Detect inbound shipment shortages
**Priority:** P2 — Phase 2
**As a** Controller
**I want** to find inbound shipments where Amazon received fewer units than I sent
**So that** I can dispute the missing units

**Acceptance criteria:**
- Requires inbound shipment data
- Compares shipped vs. received quantities post reconciliation window
- 9-month dispute window per finding

### US-5.9 — Detect long-term storage fees on active SKUs
**Priority:** P2 — Phase 2
**As a** Controller
**I want** LTSF charges on actively-selling SKUs flagged for review
**So that** I can investigate which are genuinely recoverable

**Acceptance criteria:**
- Identifies LTSF charges per SKU
- Cross-references against 90-day sales velocity
- Flags as low-medium confidence, separated from headline number

### US-5.10 — Detect month-over-month fee anomalies
**Priority:** P3 — Phase 3
**As a** Controller
**I want** to know when Amazon silently changed fees on a SKU mid-year
**So that** I can investigate silent reclassifications

**Acceptance criteria:**
- Computes per-SKU monthly avg fee
- Flags >15% MoM jumps without corresponding price/dimension changes
- Narrative output framed as "this changed silently in [month]"

---

## Epic 6 — Report delivery

### US-6.1 — View the report in-browser immediately
**Priority:** P0 — Phase 1
**As a** user whose audit just finished
**I want to** see the headline findings in my browser without downloading anything
**So that** I get the value instantly

**Acceptance criteria:**
- Report page lives at unguessable URL `xray.baslix.com/r/{uuid}`
- Headline strip shows total recoverable, urgent recoverable, case count
- Four category cards expand to show case lists
- Top 10 cases table with view-evidence expanders
- Pattern findings section with narrative
- CTA block at the bottom

### US-6.2 — Download a PDF report I can forward internally
**Priority:** P0 — Phase 1
**As a** Controller
**I want** a downloadable PDF I can email to my CFO
**So that** I can share the findings up the chain

**Acceptance criteria:**
- "Download PDF" button on report page
- PDF is Baslix-branded but reads as a standalone document
- Structure matches PRD section 6.2
- Cover page, executive summary, methodology, findings, top 25 cases, pattern analysis, math, about Baslix, appendix
- File size under 10MB

### US-6.3 — Get a per-case evidence packet for top cases
**Priority:** P0 — Phase 1
**As a** Controller wanting to file a dispute myself
**I want** each top case to come with the evidence laid out
**So that** I could file it without building it from scratch

**Acceptance criteria:**
- Top 25 cases each get a one-page evidence packet
- Packet includes: case ID, transaction details, expected outcome, actual outcome, dollar gap, dispute window dates, draft dispute message
- Draft message is starter-quality, not finished-quality (deliberate friction toward Baslix paid service)

### US-6.4 — Receive the report via email
**Priority:** P0 — Phase 1
**As a** user
**I want** the report link emailed to me
**So that** I can find it later

**Acceptance criteria:**
- Single email triggered on report completion (not a sequence)
- Email includes headline number in subject line ("$147,332 found in your Amazon FBA audit")
- Body has key stats + link to the in-browser report + PDF download link
- Soft CTA to talk to Baslix at the bottom
- No follow-up emails. This is the only email sent.

### US-6.5 — Re-access my report later
**Priority:** P1 — Phase 1
**As a** user who didn't act immediately
**I want** the report URL to keep working
**So that** I can come back to it weeks later

**Acceptance criteria:**
- Report URL valid indefinitely (until user requests deletion)
- Raw uploads auto-deleted at 30 days but report itself persists
- Re-visiting the URL doesn't trigger re-processing

### US-6.6 — Export the case list to CSV
**Priority:** P2 — Phase 2
**As a** Controller who wants to work the cases in a spreadsheet
**I want** to download the full case list as CSV
**So that** I can sort, filter, and assign ownership

**Acceptance criteria:**
- "Export to CSV" button on report page
- CSV includes all findings (not just top 25)
- Columns: case ID, category, SKU, $ amount, days remaining, confidence, evidence summary

---

## Epic 7 — Conversion CTA

### US-7.1 — See an obvious next step to talk to Baslix
**Priority:** P0 — Phase 1
**As a** Controller convinced by the findings
**I want** an obvious next step to get help filing disputes
**So that** I can hand off the work if I choose to

**Acceptance criteria:**
- CTA block at bottom of in-browser report
- Restates top-3 findings by name
- Single button: "Talk to us — 15 min, no pitch deck"
- Routes to a booking link (Cal.com or Calendly)
- Same CTA appears in the PDF report
- No popups, no urgency tricks, no pressure. Just a clear option.

---

## Epic 8 — Trust, privacy, and data handling

### US-8.1 — Read clear plain-English privacy promises before uploading
**Priority:** P0 — Phase 1
**As a** Controller
**I want** to see exactly what happens to my data before I upload
**So that** I trust the tool enough to use it

**Acceptance criteria:**
- Upload page shows 5 plain-English bullets:
  - encryption at rest and transit
  - **30-day deletion of original CSV files** (with a clear note: a columnar copy is retained so the report remains accessible; full deletion available on request)
  - never shared with third parties
  - never used to train models
  - request full deletion any time (one-click link in the report email)
- Each bullet links to the full privacy policy

### US-8.2 — Auto-delete raw uploads at 30 days
**Priority:** P0 — Phase 1
**As an** Engineer
**I want** raw CSVs purged from storage 30 days after report generation
**So that** we hold the minimum data needed

**Acceptance criteria:**
- Daily scheduled job purges uploads older than 30 days
- Findings and reports persist (only raw CSVs deleted)
- Deletion logged in admin page

### US-8.3 — Request my data deleted on demand
**Priority:** P1 — Phase 1
**As a** privacy-conscious user
**I want** to delete all my data with one request
**So that** I'm in control

**Acceptance criteria:**
- Every report-delivery email includes a signed one-click deletion link (`/deletion/{audit_id}?token=...`)
- Clicking the link opens a confirm page; confirming files a `deletion_requests` row
- Manual processing via admin page in Phase 1; automated in Phase 2
- Deletion completed within 7 days
- Cascade removes: raw CSV (if still present), Parquet files, findings, case source rows, rendered PDF, and PII on the `audits` row

### US-8.4 — Encrypt all data at rest and in transit
**Priority:** P0 — Phase 1
**As an** Engineer
**I want** all storage and traffic encrypted
**So that** we meet basic security expectations

**Acceptance criteria:**
- TLS 1.3 enforced on all endpoints
- Supabase encryption-at-rest enabled
- Per-report storage isolation with signed URLs
- No long-lived public URLs anywhere

---

## Epic 9 — Admin page (internal only)

The admin page lives at `/admin`, is password-protected, and is invisible to users. It is Vyshag's single pane of glass for operating the tool.

### US-9.1 — See all audits in one place
**Priority:** P0 — Phase 1
**As** Vyshag
**I want** a list of every audit with key details at a glance
**So that** I know what's happening without checking individual reports

**Acceptance criteria:**
- Table: brand name, email, status (pending_review / completed / failed), total recoverable $, date, rule versions used
- Sortable by any column
- Filterable by status
- Search by brand name or email
- Click any row to open the full report view

### US-9.2 — Review reports before they reach users (Phase 1)
**Priority:** P0 — Phase 1
**As** Vyshag in early phase
**I want** to manually review the first ~20 reports before they're delivered
**So that** I catch bad findings before they reach customers

**Acceptance criteria:**
- Phase 1 audits go to `pending_review` status instead of auto-delivering
- Admin shows the full report with ability to review each finding
- "Approve & Send" button delivers the report and sends the email
- "Reject" with notes field (captures why, improves detection rules)
- Phase 2+: manual review becomes optional, reports auto-deliver

### US-9.3 — Monitor cost per audit
**Priority:** P0 — Phase 1
**As** Vyshag
**I want** to see compute + LLM cost per audit
**So that** I catch cost runaway early

**Acceptance criteria:**
- Per-audit cost breakdown visible on audit detail page
- 7-day rolling average on the admin dashboard
- Flag audits that exceeded $50
- Monthly total spend summary

### US-9.4 — Track funnel metrics
**Priority:** P1 — Phase 2
**As** Vyshag
**I want** to see how many users start vs. finish the audit
**So that** I know where people drop off

**Acceptance criteria:**
- Counts: email captured → CSVs uploaded → audit completed → PDF downloaded
- Conversion rate between each step
- Median report value (the single most important metric per PRD)
- % of reports above $50k

### US-9.5 — Manage the block list
**Priority:** P1 — Phase 2
**As** Vyshag
**I want** to block competitor and abusive email domains
**So that** I'm not training competitors with my own tool

**Acceptance criteria:**
- Admin UI to add/remove domains
- Blocked domains see a polite "we can't process this right now" message
- Log of blocked attempts (date, email, IP)

### US-9.6 — See failed audits and errors
**Priority:** P0 — Phase 1
**As** Vyshag
**I want** to see every audit that failed and why
**So that** I can fix issues and help users who got stuck

**Acceptance criteria:**
- Failed audit list with error details
- Which pipeline step failed
- One-click to view the user's uploaded files (before 30-day purge)
- Ability to re-trigger the audit from admin

### US-9.7 — Version detection rules so old reports stay reproducible
**Priority:** P1 — Phase 1
**As an** Engineer
**I want** every finding to record the rule version that produced it
**So that** old reports remain defensible if questioned later

**Acceptance criteria:**
- Each detection rule has a semver
- Findings store the rule version
- Changelog of rule changes maintained
- Re-running an old report is possible if needed

---

## Epic 10 — Phase 3 expansions (future state)

### US-10.1 — Continuous monitoring via SP-API connection
**Priority:** P3 — Phase 3
**As a** Controller who liked the audit
**I want** to connect Seller Central via SP-API and get continuous monitoring
**So that** I never have to re-upload CSVs

**Acceptance criteria:**
- SP-API OAuth flow with read-only scopes
- Daily incremental ingestion of new data
- Weekly findings digest emailed
- Web dashboard showing rolling recoverable balance

### US-10.2 — Whitelabel reports for fractional CFO partners
**Priority:** P3 — Phase 3
**As a** fractional CFO serving multiple brands
**I want** to generate Baslix audits with my own branding
**So that** I deliver value to my clients

**Acceptance criteria:**
- Partner program with revenue share
- Custom logo + branding in reports
- Bulk audit interface

### US-10.3 — Contract vs. Reality v2 tool
**Priority:** P3 — Phase 3
**As a** Controller who ran the X-Ray
**I want** to upload my Amazon Vendor agreement and find every payout discrepancy vs. contract
**So that** I see Bucket 2 leakage end-to-end

**Acceptance criteria:**
- Separate upload flow for contract PDFs
- LLM extracts contract terms (co-op %, payment terms, accruals)
- Cross-references against actual remittance data
- Outputs side-by-side discrepancy report

### US-10.4 — File top-3 disputes for free as a paid-service taste
**Priority:** P3 — Phase 3
**As** Vyshag
**I want** the option to file 3 free disputes for high-value ICP brands
**So that** I demonstrate the paid service before they sign

**Acceptance criteria:**
- Available only for brands with reports above $50k
- Manual approval per offer via admin page
- Successful recovery becomes a case study

---

## Story map summary

**Phase 1 MVP (4-6 weeks)** — must ship together:
1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 8.1, 8.2, 8.4, 9.1, 9.2, 9.3, 9.6, 9.7

**Phase 2 (weeks 7-12)** — full Bucket 3:
1.3, 2.3, 3.4, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.6, 8.3, 9.4, 9.5

**Phase 3 (months 4-6)** — Bucket 2 expansion:
5.10, 10.1, 10.2, 10.3, 10.4

---

## How to use this document

For each sprint, pull stories from the appropriate phase, prioritize by P0 → P1 → P2 → P3, and break each one into tasks. Acceptance criteria are the definition of done — a story isn't shippable until every criterion passes.

Stories should be re-evaluated weekly during Phase 1 based on real user data. The detection rules (Epic 5) in particular will evolve as Vyshag reviews early reports via the admin page and finds patterns the rules miss.
