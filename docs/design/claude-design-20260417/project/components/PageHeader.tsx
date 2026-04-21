import { cn } from "@/lib/utils";

type ChipTone = "success" | "warning" | "accent" | "muted";

export type Chip = { label: string; tone?: ChipTone };

const toneClasses: Record<ChipTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  accent: "bg-accent/10 text-accent",
  muted: "bg-border dark:bg-border-dark text-muted dark:text-muted-dark",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  chips,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  chips?: Chip[];
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <div className="text-xs tracking-widest muted mb-2">{eyebrow}</div>}
        <h1 className="text-3xl font-medium">{title}</h1>
        {description && <p className="muted mt-2 max-w-2xl">{description}</p>}
      </div>
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.label}
              className={cn(
                "inline-flex items-center px-2 py-1 rounded-md text-xs",
                toneClasses[c.tone ?? "muted"],
              )}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
