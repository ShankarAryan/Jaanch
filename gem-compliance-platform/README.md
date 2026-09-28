# GeM Bid Compliance Verification Platform (SIH26100)

AI-assisted decision-support platform for verifying bidder compliance in GeM procurement. Built for a 3-day, 2-person hackathon timeline — see `SIH26100_Problem_Analysis.md` (in the parent folder / sent earlier in chat) for the full problem analysis and the reasoning behind every architectural choice below.

The demo is seeded with **10 real GeM bids** — every `referenceNo`, title, organisation, bid date, EMD / ePBG detail, and MSE / Make-in-India position in `prisma/seed.ts` is taken verbatim from the published bid document and is independently verifiable on the GeM portal:

| # | Bid number | Title | Buyer |
|---|---|---|---|
| 1 | `GEM/2026/B/7983771` | Cyber Forensic Hardware and Software | C-DAC Thiruvananthapuram / MeitY *(flagship)* |
| 2 | `GEM/2026/B/7829782` | High Repetition Rate Pulsed Laser Source | CHESS Hyderabad / DRDO |
| 3 | `GEM/2026/B/7801588` | 3D intraoral scanner with software | AIIMS Bibinagar / MoHFW |
| 4 | `GEM/2026/B/7815102` | Microwave Plasma Asher | SSPL Delhi / DRDO |
| 5 | `GEM/2026/B/7827388` | GC Mass Spectrometer | ICAR-IARI New Delhi / MoA&FW |
| 6 | `GEM/2026/B/7914955` | High end ICU Ventilators | AIIMS Raipur / MoHFW |
| 7 | `GEM/2026/B/7917062` | Laser beam diameter & power measurement system | CHESS Hyderabad / DRDO |
| 8 | `GEM/2026/B/7931202` | 300 mA X-ray machine with DR system | MCGM Mumbai, Zone 1 (state govt) |
| 9 | `GEM/2026/B/7946979` | Retrofit Digital Radiography System | MCGM Mumbai, Zone 1 |
| 10 | `GEM/2026/B/7922011` | Cavitron Ultrasonic Surgical Aspirator | NEIGRIHMS Shillong / MoHFW |

Each tender's requirement set is configured to *that* bid, not generic assumptions — mandatory OEM Authorization where the bid lists it as a required document, MSE preference %/cap where MSE is offered, and Make-in-India either carrying the real preference %/cap (tenders 3, 5, 6, 10), or `NOT APPLICABLE` because a competent authority waived an otherwise-applicable requirement (tenders 2, 4, 7 — with the real approval reference: `CDAC/CFSPR291/16714`, `DRDO/DFMM/MM/GTE/SSPL/2025-26/075`, ...), or `NOT APPLICABLE` because the bid simply never invoked MII preference (tenders 8, 9 — the row's reason distinguishes the two cases). No EMD check where the bid needs no EMD. Several of these bids have already closed — the dashboard shows a live open/closed badge and doesn't hide them. **The 37 bidders across the 10 tenders are synthetic** (a shared pool defined in `src/lib/fixtures/syntheticCompanies.ts`), each shaped to exercise a particular verification outcome.

## The one thing to understand before reading the code

No student team can get production API access to Udyam, GSTN, PAN/Income Tax, MCA21, or EPFO/ESIC during a hackathon (see the analysis doc, Section 3) — the previous attempt at this project broke because it assumed otherwise. So every external "government portal" here is a **mock or stub provider** standing in for what a real registry would say. The mock providers read from a fixture table in `src/lib/fixtures/registryFixtures.ts` and run the real rules-engine logic on top; the stub providers return a clearly-labelled simulated result.

**DigiLocker/API Setu** is the one source with a genuine government sandbox, so its adapter (`src/lib/providers/real/digilocker.ts`) is written against the real API: the file documents the actual user-consent Requester flow step by step, and it returns a **labelled simulated result** because full activation needs partner onboarding (a signed Requester agreement + Partner SOP approval) that takes weeks. With `USE_REAL_DIGILOCKER=true` and sandbox credentials it additionally runs a live reachability probe against the sandbox.

Every provider — mock, stub, or real — implements the same `VerificationProvider` interface (`src/lib/providers/types.ts`). Swapping one for a production integration later is a one-line change in `src/lib/providers/registry.ts` — nothing else in the app needs to change.

## Setup

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY (free, recommended) — see below
npx prisma generate
npm run db:push              # creates dev.db (SQLite) from prisma/schema.prisma
npm run seed                 # loads 10 real GeM tenders + 37 synthetic bidders
npm test                     # PAN + GSTIN validators, checked against real published GSTINs
npm run ai:check             # optional — verifies your LLM key works end to end
npm run dev                  # http://localhost:3000
```

(`npm run setup` does all of the above except `dev` in one go.)

Open `http://localhost:3000`. You'll be sent to `/sign-in` — enter any name and pick a role:

- **Procurement Officer** — full access: runs verification, uploads documents for any bidder, records the qualify/disqualify decision.
- **Viewer** — read-only: sees everything, changes nothing.
- **Bidder** — pick a company; sees only that company's tender participation across all its bids, and can upload only its own compliance documents. Never sees another bidder's data (name, GSTIN, score, documents) — enforced server-side.

`/dashboard` is the **tender list** (10 bids, open/closed badge, bidder count). Click a tender → `/tenders/[id]` shows that bid's info card + its bidders. **Run Verification** on a bidder, then **Details** for the per-requirement breakdown, AI recommendation, and audit trail.

### AI provider (`GEMINI_API_KEY` / `ANTHROPIC_API_KEY`)

The AI layer picks a provider by whichever key is set (Gemini wins if both are):

- **`GEMINI_API_KEY`** — Google Gemini, **free tier, no credit card**: get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Default model `gemini-3.5-flash-lite` (Flash-Lite — the full Flash models have almost no free quota). Override with `GEMINI_MODEL`.
- **`ANTHROPIC_API_KEY`** — Claude; needs a funded Anthropic account.
- **Neither** — the app still runs: document extraction falls back to a regex, recommendations to a deterministic template. The demo never breaks on a missing key.

On Gemini's free tier Google may use inputs to improve its models — fine here because every demo bidder is synthetic (analysis doc §9). Don't point the free tier at real PAN/GST/Udyam data.

## What's real vs. simulated in this build

Every requirement row in the UI carries a tag saying how that specific check was produced:

| Source | Status | Row tag |
|---|---|---|
| **PAN** | **REAL structural validation** — the Income Tax Dept format + holder-type character (`src/lib/validation/pan.ts`), then a **simulated** registration/filing cross-check on top. Confirms the PAN is well-formed and correctly typed; it can't confirm it's *registered* (no open Verify-PAN API). | `REAL FORMAT + SIM. REGISTRY`, or `REAL ALGORITHM` when the format check itself fails |
| **GST** | **REAL** — GSTIN structure + the actual **Mod-36 (Luhn mod 36) checksum** GSTN uses for the 15th character, plus a check that the PAN embedded in the GSTIN matches the bidder's declared PAN (`src/lib/validation/gstin.ts`, verified against real published GSTINs in `gstin.test.ts`). Registration status + return-filing history are a **simulated** layer on top. | `REAL FORMAT + SIM. REGISTRY`, or `REAL ALGORITHM` when the checksum fails |
| Udyam, Blacklist/Debarment | **Simulated** registry lookup (fixture data) + the real rules-engine threshold logic. | `SIMULATED` |
| Make in India — Local Content | For the seeded tender (`GEM/2026/B/7983771`) this is **`NOT APPLICABLE`** — MII Purchase Preference = No, waived by the buyer's competent-authority approval (items not available domestically). The rules engine short-circuits it from the tender config and it's excluded from scoring; the waiver reason is shown on the row. On a tender where MII *does* apply, the provider runs the simulated DPIIT cross-check + the real 50%-local-content threshold. | `NOT APPLICABLE` (this tender) |
| **OEM Authorization** | **Hybrid, same pattern as GST/PAN.** When an OEM authorization certificate is uploaded: a **real** multimodal-LLM content check — does the document plausibly read as an OEM authorization letter, and does the authorised-company name match the bidder — cross-checked in `src/lib/providers/mock/oemAuthorization.ts`. When nothing is uploaded: a **simulated** stub fallback (no OEM-issuer registry exists). Never hard-fails; the real check does not verify the letter's authenticity with the OEM. | `REAL ALGORITHM` (uploaded) / `SIMULATED` (none) |
| DigiLocker | **Adapter written against the real API.** Returns a labelled simulated document result; the code documents the real user-consent Requester flow. `USE_REAL_DIGILOCKER=true` + creds adds a live sandbox reachability probe. Full activation needs partner onboarding (weeks, not days; analysis doc §3). | `SIMULATED` / `LIVE SANDBOX PROBE` |
| MCA21, EPFO/ESIC, NSIC, Startup India | **Stub providers** — labelled simulated results, real integration path in code comments. Certificate-based in reality (no queryable API), so production verifies them from uploaded documents. A stub only ever returns `MET` or `NEEDS_REVIEW` ("flagged for manual document review") — it can never hard-fail a bidder. | `SIMULATED` |
| Document intelligence | **Real** — uploaded PDF/image → multimodal LLM: local-content certificate (declared % + certifying agency, cross-checked against the DPIIT fixture) and OEM authorization letter (plausibility + OEM/authorised-company names, name-matched to the bidder). | — |
| Compliance rules, scoring, audit trail, PO decision | **Real** — deterministic, fully persisted, every step audit-logged. | — |

Per evaluator feedback, the identifier checks (PAN, GST) were moved from fixture lookup to real government-specified algorithms — fewer sources are "fully verified", but what's shown as real *is* real. This is the honest answer to "why doesn't this hit live government APIs," which is what `SIH26100_Problem_Analysis.md` recommends presenting to judges.

## Information architecture

The app is a three-level drill-down: **Tenders → Bidders → Bidder detail**. `/dashboard` lists every tender (one card per real GeM bid); clicking one opens `/tenders/[id]`, which shows that bid's facts and the table of bidders who responded, with their compliance scores and risk tiers side by side; clicking a bidder opens `/bidders/[id]`, the per-requirement evidence, AI recommendation, document uploads, and the Procurement Officer's decision form. This mirrors how procurement actually works — a buyer compares all bids for one tender at a glance to shortlist, then examines the evidence for and records a qualify/disqualify decision on each bidder individually. The structure is deliberate; feature requests that would flatten or reorder it (e.g. a global bidder list, or per-requirement pages) are working against the real workflow, not toward it.

## Architecture

- **`prisma/schema.prisma`** — Tender (with real bid facts: `documentDated`, `bidEndsAt`, `emdRequired`, `miiNote`, `mseNote`; `importBatchId` set when the tender came from `/admin/import`), ComplianceRequirement (tender-configurable rules, incl. `ruleConfig.notApplicable`), Bidder (`key` is the per-tender-row slug; `companySlug` is the stable per-company identity a Bidder signs in as), Document (incl. uploaded `fileData`/`mimeType`), VerificationResult, Score, Decision, AuditLog, ImportBatch (one row per imported dataset file — provenance only; the bytes stay in Supabase Storage).
- **`src/lib/providers/`** — the provider-adapter layer (`types.ts` is the interface; `mock/`, `stub/`, `real/` are implementations; `registry.ts` maps `sourceType` → provider). Each result carries a `method` (`real` / `real+simulated` / `simulated` / `sandbox-probe`) that surfaces as the honesty tag on every requirement row.
- **`src/lib/validation/`** — real government-specified identifier checks with unit tests: `pan.ts` (Income Tax PAN format + holder type), `gstin.ts` (structure + Mod-36 checksum + embedded-PAN match). `npm test` runs these against real published GSTINs.
- **`src/lib/fixtures/`** — `registryFixtures.ts` (the simulated GST/PAN/Udyam/DPIIT/debarment tables) + `syntheticCompanies.ts` (a pool of ~13 synthetic companies shared across tenders 2–10, each shaped for one verification outcome; GSTINs computed with the real Mod-36 checksum).
- **`src/lib/rulesEngine.ts`** — deterministic, explainable eligibility logic (deliberately NOT a model — procurement decisions need to be auditable). Outcomes: `MET` / `NOT_MET` / `NEEDS_REVIEW` / `NOT_APPLICABLE` (the last set from the tender's `ruleConfig.notApplicable`, excluded from scoring).
- **`src/lib/scoring.ts`** — turns rule outcomes into a 0–100 compliance score + LOW/MEDIUM/HIGH risk tier.
- **`src/lib/ai/`** — `llm.ts` is a small provider layer (Gemini via REST / Claude via SDK / deterministic fallback; see *AI provider* above). `documentExtraction.ts` — `extractLocalContentCertificate` (OCR text), `extractLocalContentCertificateFromFile` and `extractOemAuthorizationFromFile` (uploaded PDF/image → multimodal call) — and `recommendation.ts` (plain-language PO summary) call through it. `npm run ai:check` (`scripts/check-ai.ts`) verifies the configured provider end to end.
- **`src/lib/orchestrator.ts`** — runs the full pipeline for one bidder: extract documents → verify every requirement → evaluate rules → score → AI recommendation → persist everything with an audit-log entry at each step.
- **`src/lib/session.ts` + `src/lib/access.ts` + `src/middleware.ts`** — signed-cookie sign-in (name + `officer`/`viewer`/`bidder` role, HMAC via `SESSION_SECRET`; a `bidder` session also carries `companySlug`). `access.ts` is the one place the role/ownership rules live (`canViewBidder`, `canRunVerification`, `canUploadDocumentFor`, `canRecordDecision`), unit-tested in `access.test.ts` and used by both the server actions and the pages. Middleware redirects anonymous **page loads** to `/sign-in` (it lets non-GET through — server actions authenticate themselves).
- **`src/lib/actions.ts` / `src/lib/authActions.ts`** — Next.js Server Actions: `runVerification` (throws; `VerifyButton` catches), `uploadDocument` + `recordDecision` (`useFormState` shape, return a status object), `signIn` / `signOut`.
- **`src/app/`** — `/sign-in`, `/dashboard` (tender list), `/tenders/[id]` (one bid's info card + bidder table + Verify buttons), `/bidders/[id]` (per-requirement drill-down, AI recommendation, document upload + extracted fields, decision form, audit trail), plus `loading.tsx` skeletons, `error.tsx`, and `not-found.tsx` for tender and bidder.
- **`src/lib/supabaseStorage.ts` + `src/lib/import/` + `/admin/import`** — *backstage* dataset-import tool, deliberately **outside** the officer/viewer/bidder model and off the main nav. A team member drops the organizers' dataset files (PDF / Excel / CSV / ZIP) into the `dataset-uploads` Supabase Storage bucket via the Supabase dashboard; `/admin/import` (gated by `ADMIN_IMPORT_SECRET`) lists the bucket, runs each file through AI/structured extraction (`extractTenderFromPdf`, `extractRecordsFromSpreadsheet`), shows a **review screen where every null is flagged "not found in document" — never guessed**, then commits with **Add** or **Replace All** (Replace All mirrors `seed.ts`'s deletion order). Imported tenders link to an `ImportBatch`; the tender detail page then shows *"Imported from `<file>` on `<date>`"* with a download link (`/api/import-batches/[id]/download` streams the file back from Storage).

## What was built on top of the base pipeline

- **Real document upload + extraction** — the bidder page has an upload control per document type the tender needs (PDF / PNG / JPEG / WebP, ≤8 MB); bytes are stored on `Document.fileData` and read directly by a multimodal LLM call (no separate OCR). Two live paths: **local-content certificate** (declared % + agency) and **OEM authorization letter** (does it read as one, and does the authorised name match the bidder — a genuine `method: 'real'` content check). An upload replaces any existing document of that type. When the tender waives a requirement (Make-in-India here), that upload is shown disabled with the reason, so a user never uploads into a dead end.
- **Sign-in + roles** — signed-cookie identity, three roles. `runVerification`, `uploadDocument` and `recordDecision` each enforce their rule server-side via `src/lib/access.ts` (officer-only for verify/decide; officer-or-own-company for upload) and attribute the action to the signed-in identity in the audit trail. A **Bidder** is scoped to one `companySlug`: the dashboard and tender queries are *filtered* to their rows, and `/bidders/[id]` calls `notFound()` before rendering if the page isn't their company — so a guessed URL leaks nothing. Not a real auth system (no user store / password) — production would use the organisation's SSO.
- **Demo hardening** — loading skeletons, an app-level error boundary, a friendly bidder not-found page, `VerifyButton` spinner + inline error, form pending/error/success states, dashboard empty state.
- **AI provider layer** — Gemini (free) or Claude, with a deterministic fallback so a missing/rate-limited key never breaks the demo.
- **10 real tenders + tender-list routing** — `/dashboard` is a tender list; each `/tenders/[id]` scopes to that bid's bidders. All 10 are real GeM bids (table at the top of this file); each one's requirement set, EMD status, MSE preference and Make-in-India position are configured from its published document. The requirement set for the flagship, e.g., makes OEM Authorization mandatory, Udyam/MSME non-mandatory (a purchase-preference signal, not a gate), and Make-in-India `NOT APPLICABLE` with the competent-authority waiver reference; other tenders vary (MII carrying a real 20%/50% preference, EMD in lakhs with a named bank, no exemption from the Class-1/Class-2 restriction, ...).

## Known gaps / genuine next steps

- **Still stub-only:** MCA21, EPFO/ESIC, NSIC, Startup India live-lookup. In reality these are certificate-based (no public API), so the real work is extending the upload + extraction pattern to those document types (EPFO challan, NSIC certificate) and cross-checking — as OEM authorization now is — not building ten API integrations. A stub-backed check can never assert a hard failure: its uncertain branch returns `INCONSISTENT` → `NEEDS_REVIEW` ("flagged for manual document review, not a verified failure"), so a bidder is never scored down or pushed to HIGH risk on a stub's coin flip — only a real check (PAN format, GSTIN checksum, blacklist, GST filing, or an uploaded OEM letter) can gate a bidder.
- **DigiLocker** is adapter-complete but not activated — needs partner onboarding (analysis doc §3). Keep `USE_REAL_DIGILOCKER=false` for a venue demo unless the reachability probe has been tested on that network.
- **Rules coverage:** `evaluateRequirement` in `rulesEngine.ts` special-cases three sourceTypes (`udyam`, `gst`, `makeInIndia`) for threshold checks beyond basic status — extend per additional tender-specific rules. The MSE purchase-preference terms are carried in `UDYAM_STATUS`'s `ruleConfig` (`msePreferencePercent`, `mseQuantityCapPercent`) for display/future use; they don't yet drive award-stage price-preference logic.
- **OEM authorization** has a real content check when a certificate is uploaded (plausibility + name match) but cannot verify the letter is genuinely *from* the OEM — there's no issuer to call, so authenticity stays a manual step. The no-upload case is the labelled stub fallback.
- **Tender configuration** is seed-only — no UI to create a tender or edit its `ComplianceRequirement` rows.
- **Auth** is demo-grade (see above) — real deployment needs SSO + proper user/role management.
- **Gemini free-tier limits:** `gemini-3.5-flash-lite` has a usable quota; if it's exhausted mid-demo the app silently falls back to template recommendations and keeps working.

## Contributor notes

- `recordDecision` / `uploadDocument` / `signIn` are `useFormState` actions returning a status object; `runVerification` throws and its caller catches. Keep new form actions in the form-state shape.
- `src/middleware.ts` runs on the Edge runtime and can't import `src/lib/session.ts` (which uses `node:crypto`) — it only checks cookie *presence* on GET navigations; signature, role, and per-company ownership are verified server-side in the pages (`notFound()`) and actions (`src/lib/access.ts`).
- On Windows, stop `next dev` before `npx prisma generate` / `db:push` — the running server locks the query-engine DLL.
