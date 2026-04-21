import { NavLink, Outlet } from "react-router-dom";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/compare-tool", label: "Comparison Tool" },
  { to: "/business", label: "Business Insights" },
  { to: "/ml-tool", label: "Machine Learning Tool" },
];

export function DemoLayout() {
  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-ink text-white p-6 gap-8">
        <div>
          <div className="display-hero text-2xl tracking-tight leading-none">Matrix</div>
          <div className="eyebrow text-[10px] text-white/50 mt-1">Quote Estimation · Demo</div>
        </div>

        <nav className="flex flex-col gap-1">
          <div className="eyebrow text-[10px] text-white/40 mb-1 px-3">Demo</div>
          {NAV.map((item) => (
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

        <div className="mt-auto">
          <div className="eyebrow text-[10px] text-white/40 mb-2">Mode</div>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            Static demo · no backend
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b hairline bg-surface">
          <div className="display-hero text-lg leading-none">Matrix</div>
          <span className="text-[10px] eyebrow px-2 py-1 rounded-sm bg-amber/20 text-amber">
            Demo
          </span>
        </div>

        <div className="hidden lg:block border-b hairline bg-white/60 backdrop-blur">
          <div className="max-w-content mx-auto px-8 h-12 flex items-center justify-between text-xs">
            <div className="text-muted">Demo</div>
            <span className="text-[10px] eyebrow px-2 py-1 rounded-sm bg-amber/20 text-amber">
              Static · client-side only
            </span>
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
