import { PageHeader } from "@/components/PageHeader";
import { SAMPLE_IMPORTANCE } from "./admin/fixtures";

const OPERATIONS = ["mechanical", "electrical", "controls", "robotics"];

export function Drivers() {
  return (
    <>
      <PageHeader
        eyebrow="Admin · Drivers"
        title="Drivers & Similar Projects"
        description="Per-operation feature importance + partial-dependence curves. Live wiring lands when the admin driver endpoint ships — placeholder values shown below."
      />

      {/* Operation picker */}
      <div className="flex items-center gap-1 mb-6">
        {OPERATIONS.map((op, i) => (
          <button
            key={op}
            type="button"
            className={
              "px-3 py-1.5 text-xs rounded-sm " +
              (i === 0
                ? "bg-ink text-white border border-ink"
                : "border hairline text-muted bg-surface hover:text-ink")
            }
          >
            {op}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[11px] text-muted mono">sample data</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Global importance */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b hairline bg-paper/60">
            <div className="eyebrow text-[10px] text-muted">Global importance</div>
          </div>
          <div className="p-5 space-y-2">
            {SAMPLE_IMPORTANCE.map((f) => (
              <div key={f.feature} className="flex items-center gap-3 text-sm">
                <div className="w-44 mono text-[12px] text-ink truncate">{f.feature}</div>
                <div className="flex-1 h-2 bg-line rounded-sm overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-ink"
                    style={{ width: `${f.importance * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="mono tnum w-10 text-right text-[11px] text-muted">
                  {(f.importance * 100).toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partial dependence (placeholder) */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b hairline bg-paper/60">
            <div className="eyebrow text-[10px] text-muted">Partial dependence · stations_count</div>
          </div>
          <div className="p-5 h-[240px] relative">
            <svg
              viewBox="0 0 400 200"
              preserveAspectRatio="none"
              className="w-full h-full"
              aria-hidden="true"
            >
              {/* Confidence band */}
              <polygon
                fill="#1F8FA6"
                fillOpacity="0.12"
                points="10,160 50,130 110,95 170,72 240,58 300,52 360,48 390,46 390,76 360,80 300,84 240,90 170,108 110,130 50,165 10,190"
              />
              {/* Mean line */}
              <polyline
                fill="none"
                stroke="#0D1B2A"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                points="10,175 50,148 110,112 170,90 240,74 300,68 360,60 390,57"
              />
              {/* Grid */}
              <line x1="0"   y1="195" x2="400" y2="195" stroke="#E5E1D8" strokeWidth="1" />
              <line x1="0.5" y1="0"   x2="0.5" y2="200" stroke="#E5E1D8" strokeWidth="1" />
            </svg>
            <div className="absolute bottom-2 left-5 text-[10px] text-muted mono">0</div>
            <div className="absolute bottom-2 right-5 text-[10px] text-muted mono">40</div>
            <div className="absolute top-2 left-5 text-[10px] text-muted mono">max</div>
          </div>
        </div>
      </div>

      {/* Neighbor pool config */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b hairline bg-paper/60 flex items-baseline justify-between">
          <div className="eyebrow text-[10px] text-muted">Neighbor pool</div>
          <div className="text-[11px] text-muted mono">defaults shown</div>
        </div>
        <div className="grid lg:grid-cols-2 divide-x hairline">
          <div className="p-5 space-y-3">
            <div>
              <div className="eyebrow text-[10px] text-muted">Distance metric</div>
              <div className="text-sm text-ink mt-1">Weighted Euclidean · normalized features</div>
            </div>
            <div>
              <div className="eyebrow text-[10px] text-muted">k (returned)</div>
              <div className="mono tnum text-ink text-sm mt-1">4</div>
            </div>
            <div>
              <div className="eyebrow text-[10px] text-muted">Similarity floor</div>
              <div className="mono tnum text-ink text-sm mt-1">0.50</div>
            </div>
          </div>
          <div className="p-5">
            <div className="eyebrow text-[10px] text-muted mb-2">Debug sample</div>
            <div className="text-[12px] text-muted">
              Paste a project profile to preview which neighbors the pool returns. Wiring lands with
              the admin driver endpoint.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
