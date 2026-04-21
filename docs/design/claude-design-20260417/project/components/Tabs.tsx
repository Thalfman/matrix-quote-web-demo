import { ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

export type TabDef = { id: string; label: string; content: ReactNode };

export function Tabs({ tabs, defaultId }: { tabs: TabDef[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active);
  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 border-b border-border dark:border-border-dark mb-4"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              active === t.id
                ? "border-accent text-ink dark:text-ink-dark font-medium"
                : "border-transparent muted hover:text-ink dark:hover:text-ink-dark",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
