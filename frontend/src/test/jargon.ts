/**
 * Canonical banned-token regex set for the jargon-guard tests.
 *
 * Source: lifted from frontend/src/lib/glossary.test.ts:63-80 in Phase 4
 * (DATA-03). The list is unchanged from its inline origin; consumers should
 * import this constant rather than duplicate the array.
 *
 * Audience reminder (PROJECT.md): the demo's reviewers are non-technical.
 * No ML jargon should reach customer-facing copy. If you need to add a token,
 * do it here once — every consumer (glossary.test.ts, jargon-guard.test.tsx,
 * and any future inline guard refactors) picks it up automatically.
 */
export const BANNED_TOKENS: readonly RegExp[] = [
  /\bP10\b/i,
  /\bP50\b/i,
  /\bP90\b/i,
  /\bP10[–-]P90\b/i,
  /\bpyodide\b/i,
  /\bgradient[- ]?boost(ing|ed)?\b/i,
  /\bregression\b/i,
  /\bensemble\b/i,
  /\bcategorical\b/i,
  /\bembedding\b/i,
  /\btraining data\b/i,
  /\bconfidence interval(s)?\b/i,
  /R²/,
  /\bquantile\b/i,
  /\bsklearn\b/i,
  /\bjoblib\b/i,
  /\buncertainty\b/i,
];
