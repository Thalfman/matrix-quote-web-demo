import { useEffect, useState } from "react";

import { PyodideStatus, subscribe } from "@/demo/pyodideClient";
import { cn } from "@/lib/utils";

const STAGE_ORDER: { stage: PyodideStatus["stage"]; label: string }[] = [
  { stage: "script", label: "Runtime" },
  { stage: "runtime", label: "Python" },
  { stage: "packages", label: "Packages" },
  { stage: "python", label: "Shim" },
  { stage: "models", label: "Models" },
  { stage: "ready", label: "Ready" },
];

function stageIndex(stage: PyodideStatus["stage"]): number {
  const idx = STAGE_ORDER.findIndex((s) => s.stage === stage);
  return idx >= 0 ? idx : 0;
}

export function PyodideLoader() {
  const [status, setStatus] = useState<PyodideStatus>({
    stage: "script",
    message: "Waiting…",
  });

  useEffect(() => subscribe(setStatus), []);

  const current = stageIndex(status.stage);
  const isError = status.stage === "error";
  const isReady = status.stage === "ready";

  return (
    <div className="card p-6">
      <div className="eyebrow text-[11px] text-teal mb-1">Pyodide · Warmup</div>
      <h2 className="display-hero text-xl text-ink mt-2">
        {isError
          ? "Runtime failed to load"
          : isReady
            ? "Runtime ready"
            : "Loading Python runtime in your browser"}
      </h2>
      <p className="text-sm text-muted mt-2">{status.message}</p>

      <div className="mt-5 h-1.5 bg-line2 rounded-sm overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isError ? "bg-danger" : "bg-teal",
          )}
          style={{ width: `${status.percent ?? 0}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-6 gap-2">
        {STAGE_ORDER.map((s, i) => (
          <div
            key={s.stage}
            className={cn(
              "text-[10px] eyebrow text-center py-1.5 rounded-sm",
              i < current
                ? "bg-tealSoft text-tealDark"
                : i === current && !isError
                  ? "bg-amberSoft text-ink"
                  : "bg-line text-muted",
            )}
          >
            {s.label}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted mt-4 mono">
        ~30 MB one-time download. Cached by the browser for subsequent loads.
      </p>
    </div>
  );
}
