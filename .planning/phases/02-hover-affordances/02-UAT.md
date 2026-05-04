---
status: partial
phase: 02-hover-affordances
source: [02-05-PLAN.md success gate]
started: 2026-05-04T18:46:00-05:00
updated: 2026-05-04T18:48:00-05:00
---

## Current Test

[paused — manual smoke (items 5-11) blocked: user unavailable to run browser walkthrough this session]

## Tests

### 1. npm test
expected: 0 failures, all *.test.ts/*.test.tsx green
result: pass
evidence: 76 test files / 599 tests passed (0 failed) — 22.37s

### 2. npm run typecheck
expected: 0 errors
result: pass
evidence: tsc --noEmit exit 0

### 3. npm run lint
expected: 0 warnings (--max-warnings 0)
result: pass
evidence: eslint exit 0

### 4. npm run build
expected: exit 0, dist/ produced
result: pass
evidence: vite build exit 0 in 7.84s; expected chunk-size warning on index bundle (Plan 02-05 R2 — acknowledged)

### 5. Complexity vs Hours bar drill-down
expected: hover bar → tooltip with top-5 projects desc by hours + "+N more" row
result: blocked
blocked_by: other
reason: "user unavailable to run browser walkthrough this session"

### 6. Tab → ComplexityVsHours eyebrow `?` glossary tooltip
expected: ? next to "Average hours per complexity level" eyebrow receives focus and opens Complexity (1-5) glossary tooltip
result: blocked
blocked_by: other
reason: "user unavailable to run browser walkthrough this session"

### 7. Tab → SalesBucket / Industry / SystemCategoryMix eyebrow `?` tooltips
expected: each card eyebrow ? receives focus and opens its glossary definition
result: blocked
blocked_by: other
reason: "user unavailable to run browser walkthrough this session"

### 8. /compare/quote — tab through form
expected: ? appears next to Industry segment, System category, Automation level, PLC family, HMI family, Vision type, Overall complexity (1-5); each opens its glossary on focus
result: blocked
blocked_by: other
reason: "user unavailable to run browser walkthrough this session"

### 9. /compare/quote — "compare to your quoted hours" toggle
expected: tooltip with the Sales Bucket definition appears
result: blocked
blocked_by: other
reason: "user unavailable to run browser walkthrough this session"

### 10. /compare/quote — submit a quote, recap row labels
expected: ? next to the 7 matching row labels; section headings + numeric rows stay plain
result: blocked
blocked_by: other
reason: "user unavailable to run browser walkthrough this session"

### 11. /ml/quote — recap row labels
expected: identical recap behavior to item 10
result: blocked
blocked_by: other
reason: "user unavailable to run browser walkthrough this session"

### 12. Jargon scan in glossary.ts and Tooltip.tsx
expected: 0 banned terms (P10/P50/P90, pyodide, gradient boost, R², confidence interval, ensemble, categorical, embedding, training data, regression)
result: pass
evidence: 0 matches in either file

### 13. Source-position floor for Tooltip term=/glossaryTerm=
expected: 4 chart eyebrows (≥1 each), QuoteForm = 8 (7 glossaryTerm + 1 Tooltip term="Sales Bucket"), QuoteResultPanel ≥ 1 → total ≥ 13
result: pass
evidence: ComplexityVsHours 1, HoursByIndustry 1, HoursBySalesBucket 1, SystemCategoryMix 1, QuoteForm 8, QuoteResultPanel 1 → 13 total (matches floor exactly)

## Summary

total: 13
passed: 6
issues: 0
pending: 0
blocked: 7
skipped: 0

## Gaps

[none — automated checks all green; manual smoke deferred, not failed]

## Notes

- All 6 automated success-gate items (test/typecheck/lint/build + jargon scan + source-position floor) passed.
- Manual browser smoke (items 5-11) deferred to next session.
- Phase 2 implementation was end-to-end exercised during execution (per phase commit history) — manual smoke is the formal customer-facing UAT confirmation.
- Resume by running `cd frontend && npm run dev` and walking the 7 items in 02-05-PLAN.md success gate.
