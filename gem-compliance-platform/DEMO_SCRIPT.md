# Demo script — GeM Bid Compliance Verification Platform (SIH26100)

~4 minutes. Also the shot list if you record a backup video (Windows: `Win + Alt + R`
for the Game Bar recorder, or OBS). Pre-recorded stills are in `../demo-evidence/`.

## Before you start

```bash
npm run dev            # http://localhost:3000
npm run seed           # only if the data looks off — resets 10 tenders + 37 bidders
```

- `.env.local` has `GEMINI_API_KEY` set → AI recommendations are live.
- Keep `USE_REAL_DIGILOCKER=false`.
- For the upload demo, have ready: a plausible **OEM authorization letter**
  (`scripts/fixtures/sample-oem-authorization-letter.pdf` works) and any **irrelevant
  PDF/screenshot** for the negative case.

`/dashboard` is a list of **10 real GeM bids** (C-DAC, DRDO, several AIIMS, ICAR-IARI, two
MCGM Mumbai, NEIGRIHMS Shillong) with a live open/closed badge. The walkthrough runs on
the flagship — **`GEM/2026/B/7983771`**, "Cyber Forensic Hardware and Software" (C-DAC
Thiruvananthapuram / MeitY). All 37 bidders are synthetic.

Flagship demo profile (fixed across re-seeds): **Chennai 100 · Coastal 68 · Bharath 95 ·
Swift 50 · NovaTech 41**. Every HIGH-risk bidder is HIGH because of a *real* check failure
(GSTIN checksum, PAN format, blacklist, or GST filing delay) — stub-backed checks only
ever flag for review.

---

## 1. Framing (20s, no clicks)

> "Before a CPSE can award a GeM contract, a Procurement Officer manually cross-checks
> the bidder against a long list of statutory facts — GST filing, PAN, Udyam/MSME
> status, blacklists, OEM authorization, and so on, tender by tender. This platform does
> the cross-checking and hands the officer a scored, fully-auditable recommendation. The
> officer still makes the call."

## 2. Sign in + the tender list (25s)

- Open `http://localhost:3000` → **/sign-in**. Name: your name. Role: **Procurement
  Officer**. Sign in → the **tender list**.

> "Every decision is tied to a signed-in, role-checked identity. The dashboard is 10 real
> GeM bids — different ministries, different rules — each with an open/closed badge. A
> judge can look any of these up. I'll work through the first one."

- Click **Cyber Forensic Hardware and Software** (`GEM/2026/B/7983771`).

## 3. The tender + a clean pass — Chennai (50s)

- The tender card shows the real bid facts: **EMD not required**, **MSE preference L1+15%
  up to 25% of quantity**, **Make-in-India *not opted*** with the competent-authority
  reason ("items not available domestically", CA approval number on the card).

  > "The requirement checks below are configured to *this* tender — not generic
  > assumptions. Compare it to, say, the AIIMS ventilator bid, where Make-in-India *does*
  > apply at 20% / 50%."

- Click **Run Verification** on **Chennai Precision Engineering** → ~5–10s → **Details**.

Point at, in order:
- **100 / 100, LOW RISK**.
- **AI Recommendation** — read the first sentence. Note the last line: *"the final
  qualification and award decision remains entirely your responsibility."*
- **Requirement table** — every row spells out *what was actually checked* + an honesty tag:
  - **GST** and **PAN**: `REAL FORMAT + SIM. REGISTRY`. "The row says it: 'GSTIN structure
    and Mod-36 checksum are valid (real check) — registration status is a simulated GSTN
    lookup.' The real government algorithm runs; the registry layer on top is simulated."
  - **OEM Authorization**: mandatory for this tender. With no document uploaded it's a
    labelled stub — the row says so. (Section 7 uploads one and it becomes a real check.)
  - **Blacklist / EPFO / DigiLocker**: each row states it's a simulated check.
  - **Make in India — Local Content**: **`NOT APPLICABLE`** — "the buyer waived it; the row
    shows the competent-authority approval number instead of silently enforcing a rule the
    buyer dropped." Excluded from the score.
- **Audit trail** — VERIFICATION_STARTED → per-requirement checks → SCORE_COMPUTED,
  timestamped.

## 4. The inconsistency catch — Bharath (40s)  ← the money shot

- **← Back to tender** → **Run Verification** on **Bharath MSME Febricators** → **Details**.
- Score **95, LOW RISK** — but the **AI Recommendation** and the **Udyam / MSME
  Registration** row (**NEEDS REVIEW**) both flag it:

  > "Registered enterprise name *Bharath MSME **Fabricators*** does not match bidder name
  > *Bharath MSME **Febricators***."

> "Financials and tax all pass. The system caught a one-letter mismatch between the Udyam
> record and the bid. For *this* tender Udyam isn't an eligibility gate — it's a global
> tender open to all — but it drives the bidder's MSE purchase-preference eligibility, so
> the officer needs to resolve it before award. That's the 'identify inconsistent
> information' the problem statement asks for."

## 5. What the real algorithms catch — Swift & NovaTech (30s)

- **Swift Supplies Enterprises** → Details → **GST** row, **NOT MET**, tag `REAL ALGORITHM`:
  *"GSTIN validation failed — Mod-36 checksum failed: 15th character is 'A', expected 'C'."*

  > "Not 'missing from our table' — we ran the actual GSTN checksum and the number doesn't
  > check out. A fabricated or fat-fingered GSTIN gets caught here." (Swift is also on the
  > debarment list — **Blacklist: NOT MET**.)

- **NovaTech Industrial Solutions** → Details → **PAN** row, **NOT MET**, tag `REAL ALGORITHM`:
  *"PAN structural validation failed — PAN must be 5 letters, then 4 digits, then 1 letter."*

  > "Their PAN has a letter 'O' where a digit belongs — a real data-entry error the format
  > check catches immediately."

## 6. Record a decision (30s)

- On Chennai, the **PO Decision** panel: *"Recording as \<your name> · Procurement
  Officer"* — no free-text name field.
- Pick **Qualified**, add a remark, **Record Decision**.
- It appears in **Decision History**, and a new **PO_DECISION_RECORDED** line shows in the
  audit trail, attributed to you.

> "The AI never decides. The officer's call is a separate, explicit, logged action."

## 7. Real document check — OEM Authorization (50s)

Open Chennai → **Documents**. Two things to point at first:
- The **Local Content Certificate** upload is greyed out: *"Make in India certification is
  waived for this tender … uploads here won't affect this bidder's evaluation."* —
  "the platform won't let you upload into a dead end."
- The **OEM Authorization Certificate** upload is active — it's a required document for
  this tender.

**Positive:** upload a real OEM authorization letter (or
`scripts/fixtures/sample-oem-authorization-letter.pdf`) → **Re-run Verification** →
the **OEM Authorization** row is **MET**, tag `REAL ALGORITHM`:
*"Uploaded document reads as an OEM authorization letter from Falcon Forensics
Instruments GmbH, authorising Chennai Precision Engineering Pvt Ltd."*

> "This is a genuine document-content check — the model confirmed it reads as an OEM
> letter and the authorised company matches the bidder. It does not verify the letter is
> really from the OEM — there's no issuer to call, that stays a manual step."

**Negative:** on another bidder, upload something irrelevant (a screenshot, a random PDF)
as the OEM certificate → **Re-run Verification** → the row goes **NEEDS REVIEW**, tag
`REAL ALGORITHM`: *"The uploaded document does not appear to be an OEM authorization
letter … please check the file that was uploaded."* — not a silent MET.

> "With no document uploaded, this falls back to a labelled simulated stub that can only
> pass or flag for review. Same hybrid pattern as GST and PAN."

## 8. Roles — the guardrails (40s)

- New tab / incognito → sign in as **Viewer**. Open any bidder: **Run Verification** and both
  document uploads are greyed out with a "read-only" hint, and the decision panel reads
  *"You are signed in as a Viewer…"* — a Viewer sees everything and changes nothing.
- Sign in again as **Bidder → Sentinel Imaging Solutions Pvt Ltd**:
  - The dashboard shows **only the 3 tenders Sentinel is on** (5, 8, 9) — the query is
    filtered, not the UI.
  - Open one: the bidder table has **one row — theirs**. No competitor names, scores, or count.
  - On their own page: the **OEM Authorization upload works**; there's no verify button and no
    decision form.
  - Edit the URL to another company's `/bidders/<id>` → **404**, before any data renders.
- All of it is enforced **server-side** — `src/lib/access.ts` (`canViewBidder`,
  `canRunVerification`, `canUploadDocumentFor`, `canRecordDecision`, unit-tested), the
  dashboard/tender query filters, and a `notFound()` on the bidder page. A forged cookie or a
  hand-crafted action request gets the same treatment.

## 9. Close — "what's real" (25s)

> "We were deliberate about not faking verification. All **10 tenders are real GeM bids**
> — every bid number is verifiable on the portal — and each one's requirement set reflects
> *its* actual terms, not a template. **PAN and GST run the real government algorithms** —
> the GSTIN Mod-36 checksum, tested against real published
> GSTINs; the PAN format + holder-type rules from the Income Tax spec. **OEM
> authorization** is a real document-content check when a letter is uploaded. The
> registration/simulated layers are labelled on every row. Udyam and blacklist are
> simulated registry lookups on the real rules engine; DigiLocker is wired against the
> real API but needs partner onboarding. A simulated check can never hard-fail a bidder —
> only a real one can. The pipeline, the document AI, the audit trail and the human
> decision are all real. Swapping any simulated source for a production integration is a
> one-line change."

---

## If something breaks mid-demo

- **Score didn't update after clicking Run Verification** — refresh the page (F5); the
  verification ran, the data is persisted.
- **AI recommendation looks like a plain template** — Gemini free-tier rate limit was
  hit; the app fell back on purpose. Re-run in ~30s, or narrate from the requirement
  rows (they're not AI-dependent).
- **Venue wifi is down entirely** — the pre-recorded stills in `../demo-evidence/` cover
  every step above.
