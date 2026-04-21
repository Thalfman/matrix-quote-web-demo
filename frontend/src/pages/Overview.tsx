import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

import { api } from "@/api/client";
import { HealthResponse } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

import {
  SAMPLE_ALERTS,
  SAMPLE_RUNS,
  SAMPLE_SOURCES,
  type AdminAlert,
} from "./admin/fixtures";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function alertIcon(tone: AdminAlert["tone"]) {
  switch (tone) {
    case "danger":  return <AlertOctagon  size={16} className="text-danger"  strokeWidth={1.75} />;
    case "warning": return <AlertTriangle size={16} className="text-amber"   strokeWidth={1.75} />;
    default:        return <CheckCircle2  size={16} className="text-success" strokeWidth={1.75} />;
  }
}

export function Overview() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<HealthResponse>("/health")).data,
  });

  const modelsReady = health?.models_ready ?? false;

  return (
    <>
      <PageHeader
        eyebrow="Admin · Overview"
        title="System Overview"
        description="Dataset health, training status, and recent admin activity. Functional wiring for the per-source actions lands with the admin endpoints."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 relative overflow-hidden">
          <span
            aria-hidden="true"
            className={
              "absolute top-0 left-0 right-0 h-1 " +
              (modelsReady ? "bg-success" : "bg-danger")
            }
          />
          <div className="eyebrow text-[10px] text-muted">Models ready</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">
            {modelsReady ? "12 / 12" : "0 / 12"}
          </div>
          <div className="text-[11px] text-muted mono mt-1">
            {modelsReady ? "all operations" : "training required"}
          </div>
        </div>
        <div className="card p-4">
          <div className="eyebrow text-[10px] text-muted">Training rows</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">{fmt(1284)}</div>
          <div className="text-[11px] text-muted mono mt-1">+37 since last run</div>
        </div>
        <div className="card p-4">
          <div className="eyebrow text-[10px] text-muted">API uptime · 30d</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">99.87%</div>
          <div className="text-[11px] text-muted mono mt-1">target ≥ 99.5%</div>
        </div>
        <div className="card p-4 relative overflow-hidden">
          <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-amber" />
          <div className="eyebrow text-[10px] text-muted">Open flags</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">
            {SAMPLE_ALERTS.filter((a) => a.tone !== "info").length}
          </div>
          <div className="text-[11px] text-muted mono mt-1">sample data</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Training runs */}
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
            <div className="eyebrow text-[10px] text-muted">Training runs</div>
            <div className="text-[11px] text-muted mono">sample data</div>
          </div>
          <div
            className="grid items-center gap-x-3 px-4 py-2 bg-paper/40 border-b hairline"
            style={{ gridTemplateColumns: "90px 90px 90px 90px 90px" }}
          >
            {["Ran", "Rows", "Seconds", "MAPE", "By"].map((h, i) => (
              <div
                key={h}
                className={
                  "eyebrow text-[10px] text-muted " +
                  (i >= 1 && i <= 3 ? "text-right" : "")
                }
              >
                {h}
              </div>
            ))}
          </div>
          {SAMPLE_RUNS.map((r) => (
            <div
              key={r.id}
              className="grid items-center gap-x-3 px-4 py-2.5 border-b hairline last:border-b-0"
              style={{ gridTemplateColumns: "90px 90px 90px 90px 90px" }}
            >
              <div className="mono text-[12px] text-muted">{relativeTime(r.trainedAt)}</div>
              <div className="mono tnum text-[12px] text-right text-ink">{fmt(r.rows)}</div>
              <div className="mono tnum text-[12px] text-right text-muted">{r.durationSec}</div>
              <div className="mono tnum text-[12px] text-right text-ink">
                {r.mapePct.toFixed(1)}%
              </div>
              <div className="text-[12px] text-muted truncate">{r.by}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
            <div className="eyebrow text-[10px] text-muted">System alerts</div>
            <div className="text-[11px] text-muted mono">sample data</div>
          </div>
          {SAMPLE_ALERTS.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 px-4 py-3 border-b hairline last:border-b-0"
            >
              <div className="pt-0.5">{alertIcon(a.tone)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">{a.title}</div>
                <div className="text-[12px] text-muted mt-0.5">{a.body}</div>
                <div className="text-[11px] text-muted mono mt-1">{relativeTime(a.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data sources */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
          <div className="eyebrow text-[10px] text-muted">Data sources</div>
          <div className="text-[11px] text-muted mono">sample data</div>
        </div>
        <div
          className="grid items-center gap-x-3 px-4 py-2 bg-paper/40 border-b hairline"
          style={{ gridTemplateColumns: "2fr 80px 80px 80px 120px 90px" }}
        >
          {["File", "Rows", "New", "Dupes", "Uploaded", "Status"].map((h, i) => (
            <div
              key={h}
              className={
                "eyebrow text-[10px] text-muted " +
                (i >= 1 && i <= 3 ? "text-right" : "")
              }
            >
              {h}
            </div>
          ))}
        </div>
        {SAMPLE_SOURCES.map((s) => (
          <div
            key={s.id}
            className="grid items-center gap-x-3 px-4 py-3 border-b hairline last:border-b-0"
            style={{ gridTemplateColumns: "2fr 80px 80px 80px 120px 90px" }}
          >
            <div className="mono text-[12px] text-ink truncate">{s.fileName}</div>
            <div className="mono tnum text-right text-ink text-[12px]">{fmt(s.rows)}</div>
            <div className="mono tnum text-right text-success text-[12px]">{fmt(s.newRows)}</div>
            <div className="mono tnum text-right text-muted text-[12px]">{fmt(s.dupes)}</div>
            <div className="mono text-[12px] text-muted">
              {new Date(s.uploadedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1.5 text-[12px]">
              <span
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (s.status === "ok"
                    ? "bg-success"
                    : s.status === "stale"
                      ? "bg-amber"
                      : "bg-danger")
                }
                aria-hidden="true"
              />
              <span className="capitalize text-ink">{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
