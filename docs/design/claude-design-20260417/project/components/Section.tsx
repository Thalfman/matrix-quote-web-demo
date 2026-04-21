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
      <div className="flex items-baseline gap-3 mb-4">
        <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded bg-border dark:bg-border-dark text-[11px] font-mono muted">
          {step}
        </span>
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          {description && <p className="muted text-sm">{description}</p>}
        </div>
      </div>
      <div className="card p-5">{children}</div>
    </section>
  );
}
