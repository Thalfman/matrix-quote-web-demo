/**
 * Parse a free-text "quoted hours" input.
 * Accepts comma-grouped US-locale numbers ("2,000", "2,000.5") and plain
 * numerics ("2000", "2000.5"). Returns null for empty / non-numeric /
 * negative input — the caller treats null as "user did not provide a
 * value for this bucket". The browser-native <input type="number"> path
 * crashes on commas (Number("2,000") → NaN, NaN flows into a controlled
 * input value, React 18 escalates), so this is the safe replacement.
 */
export function parseQuotedHours(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const stripped = trimmed.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(stripped)) return null;
  const n = Number(stripped);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}
