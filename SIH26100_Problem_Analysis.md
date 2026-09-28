# SIH26100 — AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement
### Deep Problem Analysis (Pre-Design Phase)

Organization: Ministry of Petroleum & Natural Gas | Department: Chennai Petroleum Corporation Limited (CPCL) | Category: Software | Theme: Smart Automation

This document is analysis only — no implementation yet. It exists to make sure the next version of this project is built on a realistic, correctly-scoped foundation instead of the assumptions that likely broke the backend last time.

---

## 1. Restating the problem in plain terms

CPCL, like every Central Public Sector Enterprise (CPSE), buys goods and services through GeM. Before a bidder can be awarded a contract, a Procurement Officer (PO) has to manually confirm a long list of statutory and eligibility facts about that bidder — MSME/Udyam status, whether their GST returns are actually filed and not just registered, PAN/Income Tax standing, whether their product qualifies under Make in India / local content rules, EPFO/ESIC applicability, Startup India or NSIC exemptions, OEM authorization letters, whether the firm is blacklisted anywhere, and so on. Today this is done by a human opening documents and cross-checking them, one portal at a time.

The ask is **not** "build a system that talks to ten government databases." The ask is: *reduce the manual, error-prone, slow part of this process, while keeping a human as the final decision-maker.* That distinction matters a lot for scoping, and I'll come back to it repeatedly below.

## 2. Decomposing the problem statement

The problem statement bundles together four genuinely different subsystems that are often conflated into one vague "AI platform" in weak submissions:

1. **Data acquisition layer** — getting authoritative facts about a bidder from external registries (Udyam, GSTN, PAN/IT, MCA21, EPFO, ESIC, DigiLocker, NSIC, Startup India, DPIIT/Make-in-India, blacklist/debarment lists).
2. **Document intelligence layer** — the bidder also *uploads* documents (certificates, authorization letters, invoices proving local content, etc.). Something has to read these, extract structured fields, and check them against what the registries say. This is the actual "AI" part in the classic ML/NLP sense (OCR, entity extraction, cross-document consistency).
3. **Compliance rules engine** — tender-specific and statutory eligibility logic ("if turnover < X, EPFO not applicable"; "Make in India requires ≥Y% local content for this category"; "MSME bidders get price-preference under Public Procurement Policy"). This is mostly deterministic business rules, not machine learning, and it must be configurable per tender because eligibility criteria differ by category.
4. **Decision-support layer** — turning (1)+(2)+(3) into a compliance score, a risk classification, a plain-language recommendation, and an audit trail, and presenting it to the PO who still clicks the final "qualify/disqualify" button.

Treating these as four separable subsystems (with clean interfaces between them) is the single biggest architectural decision to get right, and it's very likely where the previous attempt went wrong if the code was generated as one big undifferentiated "AI backend."

## 3. The hard truth: government API access

I researched the actual accessibility of each data source, because this determines almost everything else about the architecture. Here's the honest state of play:

| Source | What it verifies | Real API access for a hackathon team |
|---|---|---|
| **Udyam Registration** | MSME status | No open public API. Verification is via a manual portal lookup (Udyam number + captcha) or paid third-party KYC vendors (Surepass, AuthBridge, Zoop, Deepvue, Decentro) who have their own commercial access. |
| **GSTN (registration + return filing)** | GST validity, filing compliance | Real integration requires becoming a **GSP (GST Suvidha Provider)** or going through a licensed GSP/aggregator (ClearTax, MasterGST, Sandbox.co.in). Not self-serve for a student team. |
| **PAN / Income Tax** | PAN validity, IT compliance | Official "Verify PAN" API exists on the e-filing portal but is issued to specific reporting entities/institutions, not open signup. Third-party vendors (Setu, Surepass) resell access. |
| **MCA21 (company master data)** | Corporate registration, CIN/DIN | No free official API; commercial resellers only (Surepass, Attestr, APIClub). |
| **DigiLocker** | Document verification | This is the most legitimate path — it's a Government of India platform with a documented **Partner API** and a sandbox (via **API Setu**, `apisetu.gov.in`, and `sandbox.api-setu.in`). Partner onboarding is real but takes approval time. |
| **EPFO / ESIC** | Labour law compliance | No public verification API found. Typically checked via employer-submitted returns/certificates, not live lookup. |
| **NSIC, Startup India, OEM authorization** | Registration/exemption status | Mostly certificate-based (uploaded documents), not queryable APIs. |
| **Blacklisting/debarment** | Disqualification | CVC and individual ministries publish debarment lists, sometimes as static PDFs/pages rather than APIs. |
| **GeM itself** | Bidder profile | GeM has **no public bidder-data API** for outside developers. Third-party "GeM scrapers" only pull public tender listings, not compliance/KYC data. |

**Important reframe:** GeM already collects and validates a lot of this at seller-registration time (a seller can't register on GeM without a working Udyam/GSTN/PAN linkage). So the realistic production version of this platform isn't "re-invent ten integrations from scratch" — it's "sit as a verification/decision-support layer that CPCL (as a buyer) would run using data GeM already has, plus GeM's own future API access under an MoU with NIC/GeM SPV." That's a detail worth stating explicitly in your submission, because it shows you understand this is a government-to-government integration problem, not a scraping problem.

**What this means for you concretely:** no student team gets production credentials to Udyam, GSTN, PAN, MCA21, EPFO, or ESIC during a hackathon. If the previous build tried to hit real endpoints (or scrape portals) for these, that alone is enough to explain "the backend didn't work" — captchas, rate limits, auth walls, and ToS blocks will break it every time, and it'll look broken even when the rest of the logic is fine.

The one source that's genuinely reachable in a demo-able way is **DigiLocker/API Setu's sandbox**, since it's an official government sandbox meant for exactly this kind of testing.

## 4. The architecture implication: a provider-adapter pattern

This is the fix, and it's a completely standard pattern for this exact problem (any fintech KYC company does this):

- Define one internal interface, e.g. `VerificationProvider.verify(bidder_id, doc_type) -> VerificationResult`, with a consistent result shape (status, confidence, raw fields, source, timestamp).
- Implement it twice per source where possible:
  - a **Mock/Simulated Provider** that returns realistic, seeded responses (including deliberately inconsistent ones, so the AI engine has something to catch) — this is what powers your demo,
  - a **Real Provider** wired to API Setu/DigiLocker sandbox where that's genuinely available.
- The Compliance Engine and AI layer never know or care which one answered — they just consume `VerificationResult` objects.

This does three things for you: it makes the backend actually runnable and demo-stable (no dependency on flaky external portals during judging), it lets you honestly show a working end-to-end pipeline, and it gives you a legitimate "path to production" story for the judges (swap the adapter, nothing else changes) — which is exactly what SIH evaluators want to see for a problem statement that is fundamentally about *systems integration*, not just AI.

## 5. What the "AI" should actually be doing

Worth being precise here, because "AI-powered" is doing a lot of work in this problem statement and it's easy to either under-deliver (a bunch of if/else dressed up as AI) or over-scope (trying to train real ML models with no labeled data in a hackathon timeframe). Realistic, defensible AI components:

- **Document extraction (OCR + structured parsing):** pull fields out of uploaded certificates/authorization letters/GST returns (PDF/image) — this is where an LLM with vision, or a classical OCR + NER pipeline, genuinely earns its place.
- **Cross-source consistency / anomaly detection:** compare bidder-claimed values against portal-derived and document-extracted values (name mismatches, expired dates, mismatched GSTIN state codes vs address, turnover inconsistent with EPFO-applicability claims). This can be simple rule-based diffing plus a lightweight anomaly score — legitimately "AI-assisted" without needing a trained model.
- **Risk scoring:** a weighted/composite score (rule-based, or a small trained classifier if you have/can synthesize labeled examples) turning multiple compliance signals into a single score + risk tier (Low/Medium/High).
- **Recommendation generation:** an LLM-generated, plain-language summary ("Bidder X: GST filings current through Q2, Udyam status active, missing OEM authorization letter — recommend conditional qualification pending document") — this is a strong, demo-friendly use of an LLM, and it's explicitly what the problem statement asks for ("AI-generated recommendations").
- **What should stay a rules engine, not "AI":** the actual eligibility logic (thresholds, tender-specific statutory criteria). Keep this explicit and configurable — don't hide compliance-critical logic inside an opaque model. Procurement decisions need to be explainable and auditable; a PO (and later an RTI request or CAG audit) needs to see *why* a score was what it was.

## 6. Suggested system layers (for the design phase, not building yet)

1. **Frontend — Compliance Dashboard:** PO-facing UI showing bidder list, compliance score, risk tier, verification status per requirement, pending items, AI recommendation, and drill-down to raw evidence.
2. **API/Backend layer:** REST/GraphQL API, auth (PO roles vs admin), tender & bidder CRUD.
3. **Verification Orchestration Engine:** fans out to provider adapters per required check (async/job-queue based, since real external calls — even sandboxed — are slow and can fail; this needs retry/timeout handling, which is a common thing hackathon backends skip and then "randomly break").
4. **Document AI Pipeline:** ingestion, OCR/extraction, field validation.
5. **Compliance Rules Engine:** tender-configurable statutory + eligibility rule sets.
6. **Risk & Scoring Engine:** aggregates rule outcomes + anomaly signals into score/tier.
7. **Recommendation Engine:** LLM-generated narrative + structured gap list.
8. **Audit Trail store:** immutable log of every check performed, source, timestamp, raw response, and every score change — this is explicitly called out in the problem statement ("maintain an auditable record") and is graded, not optional.
9. **Data store:** Bidder, Tender, Document, ComplianceRequirement, VerificationResult, Score, AuditLog, Decision (PO's final call, always human-entered).

## 7. Why the last attempt's backend likely failed (hypotheses to confirm with you)

Common failure modes for "AI-generated" builds of exactly this kind of problem:

- Code assumed live API access to Udyam/GST/PAN/etc. that doesn't actually exist for a hackathon team (see Section 3) — calls silently fail or throw unhandled errors.
- No separation between mock and real data paths, so the whole system is fragile/undemoable the moment one external call fails.
- Trying to integrate all ~10 sources at once instead of building the orchestration pattern once and plugging sources in incrementally.
- The "AI Verification Engine" was underspecified — unclear whether it's supposed to be an ML model, an LLM, or rules, so the generated code likely mashed all three together inconsistently.
- Missing async/job handling for slow multi-source verification (each bidder check could take multiple external calls).
- No real data model for audit trail / compliance requirements, so scoring logic had nowhere consistent to read from or write to.
- Security/PII handling (PAN, GST, Aadhaar-linked Udyam data are sensitive) bolted on late or not at all.

I'd like to confirm which of these actually happened before we lock in an approach — see the questions below.

## 8. MVP scope vs. full "Expected Solution" vision

The full expected solution (all 14 numbered capabilities, all 10+ integrations, full audit system) is a production system, not a hackathon deliverable. A strong SIH submission usually:

- Fully implements the **pipeline and UX** end-to-end (upload → orchestrated verification → AI document check → rules engine → score/risk → dashboard → PO decision → audit log) using the mock/real adapter pattern above.
- Demonstrates **2–3 real integrations** (DigiLocker/API Setu sandbox is the most legitimate; possibly one KYC aggregator's free-tier/sandbox for GST or PAN if available) to prove the pattern isn't just theoretical.
- Simulates the rest convincingly and says so honestly in the presentation — judges respond well to "here's what's real, here's what's realistically mocked and why, here's the production integration path" rather than a shaky pretense that everything is live.
- Prioritizes the audit trail and explainability, since those are explicitly graded requirements and are cheap to get right if designed in from the start (rather than bolted on).

## 9. Non-functional considerations to design in from day one

- **Data sensitivity / DPDP Act:** PAN, GST, Udyam data is sensitive financial/business data. Even in a demo, don't hardcode or expose real people's data; use synthetic bidders.
- **Explainability:** every score/recommendation must trace back to specific evidence — this is both a judging criterion and a real procurement/audit requirement.
- **Human-in-the-loop:** the system must never auto-disqualify; the PO's decision is always a separate, explicit action recorded in the audit trail.
- **Resilience:** external verification calls (even mocked) should be async, retryable, and timeout-safe so a single slow/failed check doesn't take down the dashboard.

---

## Open questions before moving to architecture/design

I've listed these as a quick multiple-choice below so we can lock in direction before any design or code work starts.

---

## 10. Recommended plan, given the real constraints (2 people, 3 days)

Answers received: the previous backend broke because it assumed live/real government API access and had no real layered architecture; data strategy is mock-most-with-1–2-real-sandboxes; no stack preference; team is **2 people, 3 days**.

Three days with two people is not enough to responsibly build separate Python + Node services, a message queue, and ten integrations. The scope has to be cut hard and the stack has to minimize moving parts. Here's the concrete recommendation:

### Stack: single-language, full-stack Next.js (TypeScript)
- **Next.js (App Router) + TypeScript**, API routes serve as the backend — one repo, one language, one person can work on a UI screen while the other works on an API route without merge pain.
- **SQLite via Prisma** for storage — zero setup time, trivially portable to Postgres later (the "production path" story costs nothing to tell).
- **Tailwind CSS** for the dashboard UI — fast to build, looks credible without a designer.
- **An LLM API (Claude) for the document-intelligence work** — instead of building a custom OCR/NER pipeline, send uploaded document images/PDFs to a multimodal LLM call with a structured-extraction prompt. This is the single biggest time-saver in the whole plan: it replaces days of OCR/NER engineering with a few well-designed prompts, and it's a legitimate, explainable use of "AI" for this problem.
- This avoids the two-service (Python + Node) split that's a common source of "backend didn't work" pain — fewer moving parts, fewer things that can be broken at demo time.

### Scope cut: which sources get real depth vs. stay mocked
Given the API-access reality in Section 3, real engineering effort should go where it's demo-visible and credible, not spread thin across all ten sources:

- **Full mock + rules depth:** Udyam/MSME status, GST registration + filing status, PAN validity, blacklist/debarment check, Make-in-India/local-content (checked against an uploaded content-certificate via the LLM extraction step). These five cover most of what a PO actually looks at and are enough to build a convincing, rule-rich compliance engine.
- **One real integration:** DigiLocker/API Setu sandbox — wire up an actual sandbox call for at least one document type, so the demo can show one genuinely live external call alongside the (clearly labeled) simulated ones. This directly answers the judges' likely question "is any of this real?"
- **Mocked-only, roadmap-only:** MCA21, EPFO/ESIC, NSIC, Startup India, OEM authorization live-lookup. These stay as stub providers returning realistic mock data, explicitly documented in the pitch as "integration-ready, pending GSP/partner MoU" rather than pretended-live.

### Day-by-day (2 people)
- **Day 1 — Foundation:** Prisma schema (Bidder, Tender, Document, ComplianceRequirement, VerificationResult, Score, AuditLog, Decision). Provider-adapter interface + mock providers for the five full-depth sources + stub providers for the rest. Seed script with 4–5 realistic demo bidders (including at least one that should fail compliance, to make the demo meaningful). One person owns data model + providers; the other scaffolds the Next.js app shell, auth, and the tender/bidder CRUD screens.
- **Day 2 — The engine:** Compliance rules engine (tender-configurable JSON/DB-driven rules, not hardcoded), risk scoring, LLM-based document extraction for 1–2 document types + the DigiLocker/API Setu sandbox call, LLM-based recommendation text generation, audit log writes wired through every step.
- **Day 3 — Dashboard, polish, demo-proofing:** Compliance Dashboard (score, risk tier, per-requirement status, pending items, AI recommendation, drill-down to evidence), PO decision action (explicit qualify/disqualify, recorded separately from the AI output), and — critically — a **local fallback/cache for every external call** (including the one real sandbox call) so a flaky venue Wi-Fi doesn't kill the live demo. Rehearse the demo script against the seeded bidders.

### Why this specific cut is defensible to judges
It directly answers "why doesn't this hit real Udyam/GST/PAN APIs" with a factual answer (no student team can get GSP/partner production access in 3 days — this is documented, not an excuse), it shows one real government-sandbox integration to prove the pattern isn't just theater, and it keeps the audit trail and human-in-the-loop decision fully real and fully demoed, since those are explicitly graded requirements and cost nothing extra to get right if designed in from day one.
