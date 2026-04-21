import { Search } from "lucide-react";

type Props = {
  projects: string[];
  industries: string[];
  project: string | null;
  industry: string | null;
  search: string;
  onChange: (next: { project: string | null; industry: string | null; search: string }) => void;
};

export function QuotesFilters({
  projects,
  industries,
  project,
  industry,
  search,
  onChange,
}: Props) {
  return (
    <div className="card flex items-stretch overflow-hidden">
      <div className="relative flex-1 min-w-0 flex items-center">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onChange({ project, industry, search: e.target.value })}
          placeholder="Search name, project, client"
          className="flex-1 bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted"
        />
      </div>
      <div className="w-px bg-line" aria-hidden="true" />
      <label className="flex items-center gap-2 px-3 py-2.5">
        <span className="eyebrow text-[10px] text-muted">Project</span>
        <select
          value={project ?? ""}
          onChange={(e) => onChange({ project: e.target.value || null, industry, search })}
          className={
            "bg-transparent text-sm outline-none " +
            (project ? "text-ink font-medium" : "text-muted")
          }
        >
          <option value="">All</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <div className="w-px bg-line" aria-hidden="true" />
      <label className="flex items-center gap-2 px-3 py-2.5">
        <span className="eyebrow text-[10px] text-muted">Industry</span>
        <select
          value={industry ?? ""}
          onChange={(e) => onChange({ project, industry: e.target.value || null, search })}
          className={
            "bg-transparent text-sm outline-none " +
            (industry ? "text-ink font-medium" : "text-muted")
          }
        >
          <option value="">All</option>
          {industries.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
