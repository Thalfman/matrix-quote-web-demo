import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { HealthResponse } from "@/api/types";
import { cn } from "@/lib/utils";
import { DemoChip } from "@/components/DemoChip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserPill } from "@/components/UserPill";

type NavEntry = { to: string; label: string; end?: boolean };
type NavGroup = { label: string; items: NavEntry[] };

const PUBLIC_NAV: NavGroup[] = [
  {
    label: "Estimate",
    items: [
      { to: "/", label: "Single Quote", end: true },
      { to: "/batch", label: "Batch Quotes" },
    ],
  },
  {
    label: "Quotes",
    items: [{ to: "/quotes", label: "Saved Quotes" }],
  },
  {
    label: "Insights",
    items: [
      { to: "/performance", label: "Estimate Accuracy" },
      { to: "/insights", label: "Executive Overview" },
    ],
  },
];

const ADMIN_NAV: NavGroup = {
  label: "Admin",
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

  // Breadcrumb derives label from the active nav entry.
  const allEntries = [...PUBLIC_NAV.flatMap((g) => g.items), ...ADMIN_NAV.items];
  const active = allEntries.find((e) =>
    e.end ? pathname === e.to : pathname.startsWith(e.to),
  );
  const sectionLabel = isAdminRoute ? "Admin" : "Estimate";

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-ink text-white p-6 gap-8">
        <div>
          <div className="display-hero text-2xl tracking-tight leading-none">Matrix</div>
          <div className="eyebrow text-[10px] text-white/50 mt-1">Quote Estimation</div>
        </div>

        {groups.map((group) => (
          <nav key={group.label} className="flex flex-col gap-1">
            <div className="eyebrow text-[10px] text-white/40 mb-1 px-3">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "text-sm px-3 py-2 rounded-sm transition-colors",
                    isActive
                      ? "bg-white/5 border-l-2 border-amber text-white font-medium"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ))}

        <div className="mt-auto">
          <div className="eyebrow text-[10px] text-white/40 mb-2">Model Status</div>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="relative flex w-1.5 h-1.5">
              {modelsReady && (
                <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
              )}
              <span
                className={cn(
                  "relative w-1.5 h-1.5 rounded-full",
                  modelsReady ? "bg-success" : "bg-danger",
                )}
              />
            </span>
            {modelsReady ? "Ready · models online" : "Not trained"}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile top bar — below lg breakpoint */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b hairline bg-surface">
          <div className="display-hero text-lg leading-none">Matrix</div>
          <div className="flex items-center gap-2">
            <DemoChip />
            <UserPill />
          </div>
        </div>

        {/* Desktop top strip — breadcrumb + demo + user */}
        <div className="hidden lg:block border-b hairline bg-white/60 backdrop-blur">
          <div className="max-w-content mx-auto px-8 h-12 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted">
              <span>{sectionLabel}</span>
              <span className="text-muted2">/</span>
              <span className="text-ink font-medium">{active?.label ?? ""}</span>
            </div>
            <div className="flex items-center gap-3">
              <DemoChip />
              <span className="w-px h-4 bg-line" />
              <UserPill />
            </div>
          </div>
        </div>

        <div className="max-w-content mx-auto px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      <ThemeToggle />
    </div>
  );
}
