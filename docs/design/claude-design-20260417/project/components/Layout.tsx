import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { HealthResponse } from "@/api/types";
import { cn } from "@/lib/utils";

type NavEntry = { to: string; label: string; end?: boolean };
type NavGroup = { label: string; items: NavEntry[] };

const PUBLIC_NAV: NavGroup[] = [
  {
    label: "ESTIMATE",
    items: [
      { to: "/", label: "Single Quote", end: true },
      { to: "/batch", label: "Batch Quotes" },
    ],
  },
  {
    label: "INSIGHTS",
    items: [{ to: "/performance", label: "Model Performance" }],
  },
];

const ADMIN_NAV: NavGroup = {
  label: "ADMIN",
  items: [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/train", label: "Upload & Train" },
    { to: "/admin/data", label: "Data Explorer" },
    { to: "/admin/drivers", label: "Drivers & Similar" },
  ],
};

export function Layout() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<HealthResponse>("/health")).data,
    refetchInterval: 60_000,
  });

  const groups = isAdminRoute ? [ADMIN_NAV] : PUBLIC_NAV;
  const modelsReady = health?.models_ready ?? false;

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border dark:border-border-dark p-6 gap-8">
        <div>
          <div className="text-xs tracking-widest muted">MATRIX</div>
          <div className="text-lg font-medium">Quote Estimation</div>
        </div>

        {groups.map((group) => (
          <nav key={group.label} className="flex flex-col gap-1">
            <div className="text-[10px] tracking-widest muted mb-1">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "text-sm px-3 py-2 rounded-md transition-colors",
                    isActive
                      ? "bg-accent/10 text-ink dark:text-ink-dark font-medium"
                      : "muted hover:bg-border/50 dark:hover:bg-border-dark/50",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ))}

        <div className="mt-auto">
          <div className="text-[10px] tracking-widest muted mb-2">MODEL STATUS</div>
          <div
            className={cn(
              "inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs",
              modelsReady ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                modelsReady ? "bg-success" : "bg-warning",
              )}
            />
            {modelsReady ? "Ready" : "Not trained"}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-content mx-auto px-6 lg:px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
