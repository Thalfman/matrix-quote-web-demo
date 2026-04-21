import { ReactNode } from "react";

export function Section({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-4 mb-3">
        <span className="mono text-[11px] text-teal">{step}</span>
        <h2 className="eyebrow text-[12px] text-ink">{title}</h2>
        <span className="flex-1 h-px bg-line" />
        {description && (
          <span className="text-[11px] text-muted">{description}</span>
        )}
      </div>
      <div className="card p-5">{children}</div>
    </section>
  );
}
