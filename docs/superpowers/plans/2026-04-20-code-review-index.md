# Code Review 2026-04-20 — Remediation Plans

> **For agentic workers:** Each severity tier has its own plan. Execute in the order below; earlier tiers unblock later ones (e.g. auth gates in `critical` are the foundation for the `high` CORS/CSRF tightening).

**Source review:** delivered 2026-04-20 in-chat, cross-checked against `scripts/security_review/plan_content.py` (2026-04-18). Reviewers: backend-security, backend-quality, frontend, supply-chain.

## Plan files

| Tier | File | Findings covered |
|---|---|---|
| **Critical** | [`2026-04-20-code-review-critical.md`](./2026-04-20-code-review-critical.md) | S-1, S-3, F-2/S-13, I-1, I-2 |
| **High** | [`2026-04-20-code-review-high.md`](./2026-04-20-code-review-high.md) | S-2, S-7, I-3, I-4, I-5, I-6, Q-1, Q-2, Q-3 |
| **Medium** | [`2026-04-20-code-review-medium.md`](./2026-04-20-code-review-medium.md) | S-4, S-6, S-8, S-9, F-1, F-3, F-4, Q-4, Q-6, Q-3-route, I-7, I-8, I-9, I-10, I-11 |
| **Low / Nitpick** | [`2026-04-20-code-review-low.md`](./2026-04-20-code-review-low.md) | S-10–S-12, Q-7–Q-15, F-5–F-14, I-12–I-16 |

## Suggested sequencing

1. **Critical** — S-3 first (10 lines; unblocks every auth-dependent finding). Then S-1 and F-2/S-13 as a unit. I-1 and I-2 are independent and can land in parallel.
2. **High** — Quality firefights (Q-1, Q-2, Q-3) are live 500s — land those as soon as Critical ships. Then S-2 + S-7 (depend on S-1 plumbing). Then infra (I-3, I-4, I-5, I-6) which is pure CI/Dockerfile work.
3. **Medium** — Defense in depth. F-3 error boundary and F-1/S-5 cookie move pair well. Security-headers middleware (S-6) is one file.
4. **Low / Nitpick** — Schedulable. Tackle while you're already in the affected file.

## Assumptions

- Railway deployment is **public** (no VPN). If it is private, demote Critical S-1/S-7 severity.
- Single shared admin password model stays. If moving to per-user, revisit S-12 (JWT `sub`).
- `weasyprint==62.3` stays pinned per `reference_dep_pins.md`; plans avoid touching it.
- Tests live under `tests/` (pytest) and `frontend/src/**/*.test.{ts,tsx}` (vitest). Existing harness and fixtures are reused — no new test runners introduced.

## What each plan does **not** cover

- Rewriting the existing 2026-04-18 PDF plan under `scripts/security_review/`. That artifact is a record of the review; the plans here are the remediation work.
- ML/model quality — out of scope for a security+quality review of the web layer.
- Tuning the Railway deploy beyond the Dockerfile / `railway.json` touched in these plans.
