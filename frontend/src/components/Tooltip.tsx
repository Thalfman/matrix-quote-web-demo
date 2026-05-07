/**
 * Project-owned wrapper around @radix-ui/react-tooltip.
 *
 * Why a wrapper? So callers depend on this module, not Radix directly. If we
 * ever swap tooltip libraries the change lives here.
 *
 * USAGE:
 *
 *   import { Tooltip, TooltipProvider } from "@/components/Tooltip";
 *
 *   // Mount the provider once, high in the tree (or per-component).
 *   <TooltipProvider>
 *     <Tooltip term="System Category">
 *       <span tabIndex={0}>System Category</span>
 *     </Tooltip>
 *   </TooltipProvider>
 *
 * The trigger child MUST be focusable. A plain <span> is NOT focusable —
 * pass tabIndex={0} and role="button" if wrapping inert text.
 *
 * If `term` resolves in the glossary, the tooltip shows the definition.
 * If `term` does not resolve, the tooltip shows "Definition coming soon" —
 * we never crash the build over a missing term.
 *
 * Override behavior: pass `content` to skip the glossary lookup entirely.
 */
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import { ComponentPropsWithoutRef, ReactNode, forwardRef, useState } from "react";

import { lookup } from "@/lib/glossary";

const FALLBACK_DEFINITION = "Definition coming soon.";

export const TooltipProvider = ({
  children,
  delayDuration = 200,
}: {
  children: ReactNode;
  delayDuration?: number;
}) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration}>
    {children}
  </TooltipPrimitive.Provider>
);

type TooltipProps = {
  /** Glossary term key. Resolved via lookup() at render time. */
  term?: string;
  /** Override content. When provided, skips the glossary lookup. */
  content?: ReactNode;
  /** Side preference; Radix flips automatically near viewport edges. */
  side?: "top" | "right" | "bottom" | "left";
  /** Delay override (default inherits from provider, 200ms). */
  delayDuration?: number;
  /** Trigger element. Must be focusable. */
  children: ReactNode;
};

export function Tooltip({
  term,
  content,
  side = "top",
  delayDuration,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const resolved =
    content ??
    (term ? lookup(term)?.definition ?? FALLBACK_DEFINITION : FALLBACK_DEFINITION);

  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration}
      open={open}
      onOpenChange={setOpen}
    >
      <TooltipPrimitive.Trigger asChild onClick={() => setOpen(true)}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E1D8",
            borderRadius: 2,
            fontSize: 13,
            fontFamily: "Inter",
            color: "#0D1B2A",
            padding: "8px 10px",
            maxWidth: 280,
            lineHeight: 1.4,
            boxShadow: "0 1px 4px rgba(13, 27, 42, 0.08)",
            zIndex: 100,
          }}
        >
          {resolved}
          <TooltipPrimitive.Arrow style={{ fill: "#FFFFFF", stroke: "#E5E1D8" }} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/**
 * Inline question-mark icon, useful for adding a glossary affordance next to
 * a label that itself isn't focusable. Renders a real <button> so it's
 * keyboard-reachable. Pair with <Tooltip term="...">.
 *
 *   <Tooltip term="Sales Bucket">
 *     <GlossaryHelpIcon ariaLabel="What is Sales Bucket?" />
 *   </Tooltip>
 */
export const GlossaryHelpIcon = forwardRef<
  HTMLButtonElement,
  { ariaLabel: string; className?: string } & Omit<
    ComponentPropsWithoutRef<"button">,
    "aria-label"
  >
>(function GlossaryHelpIcon({ ariaLabel, className, ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={
        className ??
        "inline-flex items-center text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal rounded-sm"
      }
    >
      <HelpCircle size={12} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
});
