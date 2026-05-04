import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Tooltip, TooltipProvider, GlossaryHelpIcon } from "./Tooltip";

export function Field({
  label,
  hint,
  error,
  glossaryTerm,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Optional glossary term key. When set, the label gets a focusable HelpCircle that opens the glossary tooltip. */
  glossaryTerm?: string;
  children: ReactNode;
  className?: string;
}) {
  const labelContent = glossaryTerm ? (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <TooltipProvider delayDuration={200}>
        <Tooltip term={glossaryTerm} side="top">
          <GlossaryHelpIcon ariaLabel={`What is ${glossaryTerm}?`} />
        </Tooltip>
      </TooltipProvider>
    </span>
  ) : (
    label
  );

  return (
    <label className={cn("block", className)}>
      <span className="eyebrow text-[10px] text-muted block mb-1.5">{labelContent}</span>
      {children}
      {hint && !error && <span className="text-[11px] text-muted block mt-1">{hint}</span>}
      {error && <span className="text-[11px] text-danger block mt-1">{error}</span>}
    </label>
  );
}
