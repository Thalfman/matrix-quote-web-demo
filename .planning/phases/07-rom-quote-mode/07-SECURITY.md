---
phase: 7
slug: rom-quote-mode
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-06
---

# Phase 7 — ROM Quote Mode — Security Audit

**Phase:** 7 — rom-quote-mode
**Audit Date:** 2026-05-06
**ASVS Level:** 1
**Posture:** Static SPA (no backend, no auth, no network calls). Threats limited to client-side tampering / DoS / XSS within a single browser's IndexedDB and React render tree.

## Result

**SECURED** — all 8 mitigate-disposition threats verified in shipped code; all 9 accept-disposition threats valid under the static-SPA posture. **0 open threats.**

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser form input → IndexedDB | User-typed material cost / industry / system category | zod-validated form values (4-field ROM subset → full QuoteFormValues via `toQuoteFormValues`) |
| IndexedDB → render | Persisted records read back, validated on every read | `savedQuoteSchema.safeParse` (list path) / `.parse` (detail path) |
| URL `?fromQuote={id}` → form | Re-open routing param hydrates ROM form | UUID validated by `useSavedQuote.parse`; `mode === "rom"` defensive guard before `form.reset()` |

No new network boundary, no new auth surface, no new secrets introduced by Phase 7. Static-SPA posture from Phase 5 carries forward unchanged.

---

## Threat Register

| Threat ID | Category | Component | Disposition | Status | Evidence (file:line) |
|-----------|----------|-----------|-------------|--------|----------------------|
| T-07-01 | Tampering | savedQuoteSchema.mode | mitigate | closed | `frontend/src/lib/savedQuoteSchema.ts:117` and `:137` — `mode: z.enum(QUOTE_MODE_VALUES).optional().default("full")` on both `quoteVersionSchema` and `savedQuoteSchema`; `QUOTE_MODE_VALUES = ["rom","full"]` at `:28` |
| T-07-02 | Information Disclosure | RomBadge.tsx | accept | closed | Static literal `"Preliminary"` and `aria-label="Preliminary estimate"` at `frontend/src/components/quote/RomBadge.tsx:25-29`; no PII surface |
| T-07-03 | DoS | romFormSchema.estimated_materials_cost | mitigate | closed | `frontend/src/pages/single-quote/romSchema.ts:43-45` — `z.coerce.number().positive("Enter a material cost greater than zero.")`; auto-name still bounded by `savedQuoteNameSchema.max(80)` at `savedQuoteSchema.ts:47` |
| T-07-04 | Repudiation | mode field per-version | accept | closed | Per-version mode stamping verified at `frontend/src/lib/savedQuoteSchema.ts:117` (quoteVersionSchema.mode) and write-side at `frontend/src/lib/quoteStorage.ts:358` (existing-record path) and `:398` (new-record path) — every version in `versions[]` records its own mode |
| T-07-05 | Tampering | RomMetadata.sanityFlag | accept | closed | `RomMetadata.sanityFlag` is a derived UI hint at `frontend/src/demo/romEstimator.ts:151-158`; not used as a security gate anywhere |
| T-07-06 | DoS | estimateRom (single predictQuote) | mitigate | closed | `frontend/src/demo/romEstimator.ts:98-170` — single `predictQuote` call (line 110); widening helpers `widenLow`/`widenHigh` at `:199-210` are pure O(1) arithmetic; bounded by `romFormSchema` positive-coerced input |
| T-07-07 | Information Disclosure | ROM_BASELINE_RATE_HOURS_PER_DOLLAR | accept | closed | `ROM_BASELINE_RATE_HOURS_PER_DOLLAR = 0.0008` at `frontend/src/demo/romEstimator.ts:57` — public bundle constant per static-SPA posture; not surfaced in user copy (verified by absence of grep hit in `RomResultPanel.tsx`) |
| T-07-08 | Tampering | RomForm input | mitigate | closed | `romFormSchema` at `romSchema.ts:38-46` (`requiredString` = `z.string().trim().min(1)`, `z.coerce.number().positive`); wired through react-hook-form at `frontend/src/pages/single-quote/RomForm.tsx:53` (`form.handleSubmit`) and at the parent useForm config — `ComparisonRom.tsx:97-101` and `MachineLearningRom.tsx:99-103` both set `resolver: zodResolver(romFormSchema)` and `mode: "onChange"` |
| T-07-09 | XSS | RomResultPanel rendered strings | mitigate | closed | `frontend/src/components/quote/RomResultPanel.tsx` — verbatim copy constants at `:31-38` (`WHY_PRELIMINARY_COPY`, `SANITY_BANNER_COPY`); all rendered values are zod-parsed numbers via `fmtHrs`/`fmtMoney` at `:43-50` or React-escaped strings (`{result.supportingMatches.label}`, `{m.projectName}`); grep for `dangerouslySetInnerHTML` across `frontend/src` returned 0 matches |
| T-07-10 | DoS | RomResultPanel re-renders | accept | closed | Leaf component; `result.supportingMatches.items.map(...)` at `RomResultPanel.tsx:141` bounded upstream by toUnifiedResult |
| T-07-11 | Information Disclosure | sanity banner internal heuristic | accept | closed | D-15 plain-English copy at `RomResultPanel.tsx:38`; baseline rate constant not referenced anywhere in `RomResultPanel.tsx` (verified by file scan) |
| T-07-12 | Tampering | URL param `?fromQuote={id}` | mitigate | closed | Defensive `openedQuote.mode === "rom"` guard before `form.reset()` verified in BOTH entry points: `frontend/src/pages/demo/compare/ComparisonRom.tsx:121-133` and `frontend/src/pages/demo/ml/MachineLearningRom.tsx:122-134` |
| T-07-13 | Information Disclosure | URL param `?fromQuote={id}` | accept | closed | URL `?fromQuote={id}` reads from this browser's IDB only (Phase 5 carry-forward); no cross-origin storage exists |
| T-07-14 | Spoofing | sidebar links → routing | accept | closed | Sidebar link targets are static literals; SavedQuotePage's `quoteToolPath` at `SavedQuotePage.tsx:55-72` switches on `mode` and `workspace` enum values only — no user input shapes the path |
| T-07-15 | Tampering | quote.mode in IDB | mitigate | closed | `mode: z.enum(QUOTE_MODE_VALUES)` at `savedQuoteSchema.ts:117,137`; list path uses `safeParse` at `quoteStorage.ts:289-294` (silently drops malformed); detail path uses `parse` at `quoteStorage.ts:308` (throws on forged records) |
| T-07-16 | XSS | QuoteRow tooltip text | mitigate | closed | `frontend/src/pages/quotes/QuoteRow.tsx:110-114` — static literal tooltip `title="This is a ROM (rough order of magnitude) quote."` on `<span>` wrapper around `<RomBadge />`; uses `title` attribute (no HTML interpretation); no `dangerouslySetInnerHTML` |
| T-07-17 | DoS | round-trip test creating IDB records | accept | closed | Test-only IDB records; no production impact |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Mitigation Coverage Summary

| Disposition | Count | Status |
|-------------|-------|--------|
| mitigate    | 8     | 8/8 verified in shipped code |
| accept      | 9     | 9/9 valid under static-SPA posture |
| transfer    | 0     | n/a |
| **Total**   | **17** | **17 CLOSED** |

---

## Accepted Risks Log

The following accept-disposition threats are documented as accepted risk for this static-SPA milestone (no remediation required):

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-02 | RomBadge static label; no PII surface. | gsd-security-auditor | 2026-05-06 |
| AR-07-02 | T-07-04 | Per-version mode stamping is documentation, not a tamper-evident signature; D-19 acknowledged. | gsd-security-auditor | 2026-05-06 |
| AR-07-03 | T-07-05 | `sanityFlag` is a UI hint, not a security gate. | gsd-security-auditor | 2026-05-06 |
| AR-07-04 | T-07-07 | `ROM_BASELINE_RATE_HOURS_PER_DOLLAR` is a public bundle constant; static-SPA posture exposes every TS const, and D-05 forbids surfacing it in user copy (verified absent from `RomResultPanel.tsx`). | gsd-security-auditor | 2026-05-06 |
| AR-07-05 | T-07-10 | Per-result render fanout bounded upstream. | gsd-security-auditor | 2026-05-06 |
| AR-07-06 | T-07-11 | D-15 banner copy contains no model internals. | gsd-security-auditor | 2026-05-06 |
| AR-07-07 | T-07-13 | IDB scope is per-browser; UUID is not a security secret. | gsd-security-auditor | 2026-05-06 |
| AR-07-08 | T-07-14 | Sidebar/route paths are static literals. | gsd-security-auditor | 2026-05-06 |
| AR-07-09 | T-07-17 | Test-only IDB churn. | gsd-security-auditor | 2026-05-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. SUMMARY files do not declare any `## Threat Flags` sections; no new attack surface introduced beyond the registered threat model.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-06 | 17 | 17 | 0 | gsd-security-auditor |

---

## Audit Method

- Each `mitigate` threat verified by direct code inspection of the cited file with file:line evidence above.
- Each `accept` threat verified by confirming the cited static-SPA posture invariant holds (no PII, no security-gate role, public bundle, etc.).
- Cross-cutting check: `grep dangerouslySetInnerHTML` across `frontend/src` returned 0 matches (confirms T-07-09 and T-07-16).
- Cross-cutting check: BOTH ROM entry points (`ComparisonRom.tsx`, `MachineLearningRom.tsx`) verified to contain the `openedQuote.mode === "rom"` defensive guard (T-07-12).
- Implementation files were not modified.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-06
