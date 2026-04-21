import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";

import {
  downloadScenarioPdf,
  useDeleteScenario,
  useDuplicateScenario,
  useSavedQuotes,
} from "@/api/quote";
import { PageHeader } from "@/components/PageHeader";

import { QuotesBulkBar } from "./quotes/QuotesBulkBar";
import { QuotesFilters } from "./quotes/QuotesFilters";
import { QuotesKpiStrip } from "./quotes/QuotesKpiStrip";
import { QuotesTable } from "./quotes/QuotesTable";

export function Quotes() {
  const [project, setProject] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const query = useSavedQuotes({
    project: project ?? undefined,
    industry: industry ?? undefined,
    search: search || undefined,
  });
  const rows = query.data?.rows ?? [];

  const projects = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project_name))).sort(),
    [rows],
  );
  const industries = useMemo(
    () => Array.from(new Set(rows.map((r) => r.industry_segment))).sort(),
    [rows],
  );

  const del = useDeleteScenario();
  const dup = useDuplicateScenario();

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const canCompare = selected.size >= 2 && selected.size <= 3;
  const compareSelected = () => {
    if (!canCompare) return;
    navigate(`/quotes/compare?ids=${[...selected].join(",")}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Quotes · Library"
        title="Saved Quotes"
        description="Every saved scenario — filter, compare, or export."
      />

      <QuotesKpiStrip rows={rows} />

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <QuotesFilters
            projects={projects}
            industries={industries}
            project={project}
            industry={industry}
            search={searchInput}
            onChange={({ project: p, industry: i, search: s }) => {
              setProject(p);
              setIndustry(i);
              setSearchInput(s);
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs border hairline rounded-sm bg-surface hover:bg-paper"
        >
          <Plus size={14} strokeWidth={1.75} /> New quote
        </button>
        <button
          type="button"
          onClick={() => toast.info("CSV export lands later")}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs border hairline rounded-sm bg-surface hover:bg-paper"
        >
          <Download size={14} strokeWidth={1.75} /> Export CSV
        </button>
      </div>

      <QuotesBulkBar
        selectedCount={selected.size}
        canCompare={canCompare}
        onCompare={compareSelected}
        onClear={() => setSelected(new Set())}
      />

      <QuotesTable
        rows={rows}
        selected={selected}
        onToggle={toggle}
        onRowAction={async (id, action) => {
          if (action === "duplicate") {
            const copy = await dup.mutateAsync(id);
            toast.success(`Duplicated as "${copy.name}"`);
          } else if (action === "delete") {
            if (!confirm("Delete this scenario?")) return;
            await del.mutateAsync(id);
            toast.success("Deleted");
          } else if (action === "pdf") {
            try {
              await downloadScenarioPdf(id);
            } catch {
              toast.error("Could not generate PDF");
            }
          } else if (action === "open") {
            toast.info("Opening saved quotes in the cockpit lands in a follow-up");
          }
        }}
      />
    </>
  );
}
