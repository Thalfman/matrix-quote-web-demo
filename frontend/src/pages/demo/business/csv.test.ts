import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import type { RankedRow } from "./portfolioStats";

const HEADER = "project_id,project_name,industry,system_category,stations,total_hours,primary_bucket";

function makeRow(overrides: Partial<RankedRow> = {}): RankedRow {
  return {
    project_id: "p1",
    project_name: "Test Project",
    industry: "Automotive",
    system_category: "Assembly",
    stations: 4,
    total_hours: 200,
    primary_bucket: "ME",
    complexity: 3,
    peerMedian: null,
    peerP10: null,
    peerP90: null,
    peerCount: 0,
    outlierZ: null,
    outlierDirection: null,
    ...overrides,
  };
}

describe("toCsv — empty input", () => {
  it("returns only the header row when given an empty array", () => {
    const result = toCsv([]);
    expect(result).toBe(HEADER);
  });

  it("header row contains exactly 7 comma-separated columns", () => {
    const result = toCsv([]);
    const cols = result.split(",");
    expect(cols).toHaveLength(7);
  });
});

describe("toCsv — happy path serialization", () => {
  it("produces header + one data line for a single row", () => {
    const result = toCsv([makeRow()]);
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(HEADER);
  });

  it("serializes a row's fields in column order", () => {
    const row = makeRow({
      project_id: "id-123",
      project_name: "My Project",
      industry: "Food & Bev",
      system_category: "Welding",
      stations: 6,
      total_hours: 350,
      primary_bucket: "Build",
    });
    const result = toCsv([row]);
    const dataLine = result.split("\n")[1];
    expect(dataLine).toBe("id-123,My Project,Food & Bev,Welding,6,350,Build");
  });

  it("preserves the row order matching the input array", () => {
    const rows = [
      makeRow({ project_id: "a", total_hours: 100 }),
      makeRow({ project_id: "b", total_hours: 200 }),
      makeRow({ project_id: "c", total_hours: 50 }),
    ];
    const lines = toCsv(rows).split("\n");
    expect(lines[1]).toMatch(/^a,/);
    expect(lines[2]).toMatch(/^b,/);
    expect(lines[3]).toMatch(/^c,/);
  });

  it("numeric fields render as plain numbers (not quoted strings)", () => {
    const result = toCsv([makeRow({ stations: 8, total_hours: 1500 })]);
    const dataLine = result.split("\n")[1];
    // Numeric fields should appear unquoted
    expect(dataLine).toContain(",8,");
    expect(dataLine).toContain(",1500,");
    // Must NOT be quoted
    expect(dataLine).not.toContain('"8"');
    expect(dataLine).not.toContain('"1500"');
  });
});

describe("toCsv — RFC 4180 escaping", () => {
  it("wraps a field containing a comma in double quotes", () => {
    const row = makeRow({ project_name: "Alpha, Beta" });
    const result = toCsv([row]);
    const dataLine = result.split("\n")[1];
    expect(dataLine).toContain('"Alpha, Beta"');
  });

  it("wraps a field containing a double-quote in double quotes and doubles the embedded quote", () => {
    const row = makeRow({ project_name: 'Say "Hello"' });
    const result = toCsv([row]);
    const dataLine = result.split("\n")[1];
    expect(dataLine).toContain('"Say ""Hello"""');
  });

  it("wraps a field containing a newline in double quotes", () => {
    const row = makeRow({ project_name: "Line1\nLine2" });
    const result = toCsv([row]);
    // A newline inside a CSV field must be wrapped in quotes — the whole output
    // contains the quoted field (we cannot split by \n since the field itself
    // contains a newline, but the field must appear quoted in the output).
    expect(result).toContain('"Line1\nLine2"');
  });

  it("does not quote plain alphanumeric strings", () => {
    const row = makeRow({ project_name: "SimpleProject" });
    const result = toCsv([row]);
    const dataLine = result.split("\n")[1];
    expect(dataLine).toContain(",SimpleProject,");
    expect(dataLine).not.toContain('"SimpleProject"');
  });
});

describe("toCsv — multiple rows", () => {
  it("outputs header + N data lines for N rows", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ project_id: `p${i}`, project_name: `Project ${i}` }),
    );
    const lines = toCsv(rows).split("\n");
    expect(lines).toHaveLength(6); // 1 header + 5 data
  });
});
