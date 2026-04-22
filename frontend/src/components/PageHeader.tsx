import { cn } from "@/lib/utils";

type ChipTone = "success" | "warning" | "accent" | "muted";

export type Chip = { label: string; tone?: ChipTone };

const toneClasses: Record<ChipTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-amberSoft text-ink",
  accent:  "bg-tealSoft text-tealDark",
  muted:   "bg-line text-muted",
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
    <header className="flex items-end justify-between gap-4 sm:gap-6 pb-5 sm:pb-6 mb-6 sm:mb-8 border-b hairline flex-wrap">
      <div>
        {eyebrow && <div className="eyebrow text-xs sm:text-sm text-teal">{eyebrow}</div>}
        <h1 className="display-hero text-3xl sm:text-4xl leading-none mt-1.5 sm:mt-2 text-ink">{title}</h1>
        {description && (
          <p className="text-sm text-muted mt-2 sm:mt-3 max-w-xl">{description}</p>
        )}
      </div>
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.label}
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-sm text-xs",
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
