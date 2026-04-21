import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs muted block mb-1">{label}</span>
      {children}
      {hint && !error && <span className="text-[11px] muted block mt-1">{hint}</span>}
      {error && <span className="text-[11px] text-danger block mt-1">{error}</span>}
    </label>
  );
}
