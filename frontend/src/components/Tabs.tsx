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
        className="flex gap-0 border-b hairline mb-4"
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
                ? "border-teal text-ink font-medium"
                : "border-transparent text-muted hover:text-ink",
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
