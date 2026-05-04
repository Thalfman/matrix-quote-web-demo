import type { ScatterPoint } from "./portfolioStats";

const TOP_N = 5;

export type LevelRow = {
  level: number;
  count: number;
  avg: number;
  min: number;
  max: number;
  /** Top N projects in this bucket, sorted desc by hours. UX-02. */
  topProjects: { projectId: string; projectName: string; hours: number }[];
  /** Number of projects beyond the top N (for "+N more" row). 0 if bucket has <= TOP_N. */
  overflow: number;
};

export function bucketByComplexity(points: ScatterPoint[]): LevelRow[] {
  const by: Record<number, { hours: number; projectId: string; projectName: string }[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [],
  };
  for (const p of points) {
    const level = Math.round(p.complexity);
    if (level >= 1 && level <= 5) {
      by[level].push({ hours: p.hours, projectId: p.projectId, projectName: p.name });
    }
  }
  return [1, 2, 3, 4, 5].map((level) => {
    const entries = by[level];
    if (entries.length === 0) {
      return { level, count: 0, avg: 0, min: 0, max: 0, topProjects: [], overflow: 0 };
    }
    entries.sort((a, b) => b.hours - a.hours);
    const xs = entries.map((e) => e.hours);
    const sum = xs.reduce((a, b) => a + b, 0);
    const top = entries.slice(0, TOP_N).map((e) => ({
      projectId: e.projectId,
      projectName: e.projectName,
      hours: e.hours,
    }));
    const overflow = Math.max(0, entries.length - TOP_N);
    return {
      level,
      count: entries.length,
      avg: sum / entries.length,
      min: Math.min(...xs),
      max: Math.max(...xs),
      topProjects: top,
      overflow,
    };
  });
}
