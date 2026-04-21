import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/api/client";
import { PageHeader } from "@/components/PageHeader";

type DemoStatus = { is_demo: boolean; enabled_env: boolean; has_real_data: boolean };
type LoadResponse = { loaded: boolean; reason: string | null };

const STEPS = [
  { n: 1, label: "Upload" },
  { n: 2, label: "Validate" },
  { n: 3, label: "Train" },
  { n: 4, label: "Review" },
];

export function UploadTrain() {
  const qc = useQueryClient();

  const { data: status } = useQuery<DemoStatus>({
    queryKey: ["demoStatus"],
    queryFn: async () => (await api.get<DemoStatus>("/demo/status")).data,
  });

  const load = useMutation<LoadResponse, unknown, void>({
    mutationFn: async () => (await api.post<LoadResponse>("/admin/demo/load")).data,
    onSuccess: (r) => {
      if (r.loaded) {
        toast.success("Demo data loaded. Reload the app to see estimates.");
        qc.invalidateQueries();
      } else {
        toast.error(r.reason ?? "Could not load demo data.");
      }
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin · Train"
        title="Upload & Train"
        description="Upload the latest project-hours export, merge into master, and retrain all per-operation models. Non-demo upload lands with the admin dataset endpoint."
      />

      {/* Demo data card */}
      <div className="card p-4 flex items-center justify-between mb-6 relative overflow-hidden">
        <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-teal" />
        <div>
          <div className="eyebrow text-[11px] text-teal">Demo mode</div>
          <div className="text-sm text-ink mt-1">
            Load a synthetic dataset + pretrained models so every screen works.
          </div>
          {status?.has_real_data && (
            <div className="mt-1 text-xs text-danger">
              Real data is already present — demo load is disabled to avoid clobbering it.
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={status?.has_real_data || load.isPending}
          onClick={() => load.mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-ink text-white text-sm font-medium hover:bg-ink2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
          {load.isPending ? "Loading…" : "Load demo data"}
        </button>
      </div>

      {/* Step rail */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className="inline-flex items-center gap-2.5">
              <span
                className={
                  "w-6 h-6 rounded-full grid place-items-center mono text-[11px] " +
                  (s.n === 1
                    ? "bg-ink text-white"
                    : "border hairline text-muted bg-surface")
                }
              >
                {s.n}
              </span>
              <span
                className={
                  "eyebrow text-[11px] " +
                  (s.n === 1 ? "text-ink" : "text-muted")
                }
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="flex-1 h-px bg-line" />}
          </div>
        ))}
      </div>

      {/* Upload-resolved shell */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6 border-dashed border-line2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-sm bg-ink text-white grid place-items-center">
              <Upload size={20} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-medium text-ink">
                Awaiting an XLSX or CSV from the admin endpoint
              </div>
              <div className="text-[12px] text-muted mono mt-0.5">
                Accepted: .xlsx · .csv · max 10 MB
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-0 border-t hairline">
            {[
              { label: "Total", value: "—" },
              { label: "New",   value: "—" },
              { label: "Dupes", value: "—" },
              { label: "Invalid", value: "—" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={
                  "py-3 text-center " + (i < 3 ? "border-r hairline" : "")
                }
              >
                <div className="eyebrow text-[10px] text-muted">{s.label}</div>
                <div className="display-hero text-xl tnum text-ink mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="eyebrow text-[11px] text-ink mb-4">Config</div>
          <div className="space-y-3">
            <div>
              <div className="eyebrow text-[10px] text-muted mb-1.5">Model family</div>
              <div className="flex gap-1">
                {["LightGBM", "GBM", "RandomForest"].map((m, i) => (
                  <span
                    key={m}
                    className={
                      "px-3 py-1.5 text-xs border rounded-sm " +
                      (i === 0
                        ? "bg-ink text-white border-ink"
                        : "hairline text-muted bg-surface")
                    }
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="eyebrow text-[10px] text-muted mb-1.5">CV folds</div>
                <div className="mono tnum text-ink text-sm border hairline rounded-sm px-3 py-2 bg-surface">5</div>
              </div>
              <div>
                <div className="eyebrow text-[10px] text-muted mb-1.5">Random seed</div>
                <div className="mono tnum text-ink text-sm border hairline rounded-sm px-3 py-2 bg-surface">42</div>
              </div>
            </div>
            <div className="text-[11px] text-muted pt-2 border-t hairline">
              Click <span className="text-ink font-medium">Load demo data</span> above to populate
              models without waiting for the real training pipeline.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
