import { describe, expect, it } from "vitest";

import { BANNED_TOKENS } from "@/test/jargon";
import { GLOSSARY, lookup, type GlossaryEntry } from "./glossary";

describe("glossary — lookup()", () => {
  const REQUIRED_TERMS = [
    "System Category",
    "Sales Bucket",
    "Vision Type",
    "Industry Segment",
    "Automation Level",
    "Complexity (1–5)",
    "PLC Family",
    "HMI Family",
  ] as const;

  it("contains all 8 required terms (CONTEXT D-04)", () => {
    for (const t of REQUIRED_TERMS) {
      expect(GLOSSARY[t], `Missing required glossary term: ${t}`).toBeDefined();
    }
  });

  it("lookup() returns the entry for a known term", () => {
    const entry = lookup("System Category");
    expect(entry).not.toBeNull();
    expect(entry?.term).toBe("System Category");
    expect(entry?.definition).toBeTypeOf("string");
    expect(entry?.definition.length).toBeGreaterThan(20);
  });

  it("lookup() returns null for an unknown term", () => {
    expect(lookup("Bogus")).toBeNull();
    expect(lookup("system category")).toBeNull();
    expect(lookup("")).toBeNull();
  });

  it("lookup() does not throw on null / undefined / non-string", () => {
    expect(() => lookup(null as unknown as string)).not.toThrow();
    expect(lookup(null as unknown as string)).toBeNull();
    expect(() => lookup(undefined as unknown as string)).not.toThrow();
    expect(lookup(undefined as unknown as string)).toBeNull();
    expect(() => lookup(42 as unknown as string)).not.toThrow();
    expect(lookup(42 as unknown as string)).toBeNull();
  });

  it("each definition is 1–2 sentences (heuristic: 20–400 chars, ≤ 4 sentence-end punctuation marks)", () => {
    for (const [key, entry] of Object.entries(GLOSSARY) as [string, GlossaryEntry][]) {
      expect(entry.definition.length, `${key} too short`).toBeGreaterThanOrEqual(20);
      expect(entry.definition.length, `${key} too long`).toBeLessThanOrEqual(400);
      const sentenceEnds = (entry.definition.match(/[.!?]/g) ?? []).length;
      expect(sentenceEnds, `${key} has too many sentences (${sentenceEnds})`).toBeLessThanOrEqual(4);
    }
  });

  it("term field on each entry matches its key", () => {
    for (const [key, entry] of Object.entries(GLOSSARY) as [string, GlossaryEntry][]) {
      expect(entry.term, `Mismatch on ${key}`).toBe(key);
    }
  });
});

describe("glossary — jargon-guard (cross-cuts DATA-03)", () => {
  it("no definition contains banned ML jargon", () => {
    for (const [key, entry] of Object.entries(GLOSSARY) as [string, GlossaryEntry][]) {
      for (const re of BANNED_TOKENS) {
        expect(
          entry.definition,
          `Term "${key}" contains banned token ${re}: ${entry.definition}`,
        ).not.toMatch(re);
      }
    }
  });

  it("no banned token in any term key either", () => {
    for (const key of Object.keys(GLOSSARY)) {
      for (const re of BANNED_TOKENS) {
        expect(key, `Key "${key}" contains banned token ${re}`).not.toMatch(re);
      }
    }
  });
});
