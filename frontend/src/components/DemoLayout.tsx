import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const ICON_STROKE = 1.75;

function SidebarLink({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "text-sm px-3 py-2 rounded-sm transition-colors duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          isActive
            ? "bg-white/[0.06] border-l-2 border-amber text-white font-medium"
            : "text-white/70 hover:text-white hover:bg-white/5",
        )
      }
    >
      {label}
    </NavLink>
  );
}

/**
 * MobileToolSwitch — lightweight two-segment tool selector + insights link
 * shown in the mobile/tablet top bar. Keeps the two-tool demo navigable
 * below the `lg` breakpoint where the sidebar is hidden.
 */
function MobileToolSwitch({
  compareActive,
  mlActive,
}: {
  compareActive: boolean;
  mlActive: boolean;
}) {
  const segmentBase =
    "inline-flex items-center justify-center px-3 py-1.5 text-[11px] eyebrow rounded-sm" +
    " transition-colors duration-150 ease-out focus-visible:outline-none" +
    " focus-visible:ring-2 focus-visible:ring-teal";
  return (
    <nav
      aria-label="Switch tool"
      className="flex items-center gap-2"
    >
      <div
        className="inline-flex rounded-sm border hairline bg-surface p-0.5"
        role="group"
        aria-label="Tool"
      >
        <NavLink
          to="/compare/quote"
          className={cn(
            segmentBase,
            compareActive ? "bg-ink text-white" : "text-muted hover:text-ink",
          )}
          aria-current={compareActive ? "page" : undefined}
        >
          Compare
        </NavLink>
        <NavLink
          to="/ml/quote"
          className={cn(
            segmentBase,
            mlActive ? "bg-ink text-white" : "text-muted hover:text-ink",
          )}
          aria-current={mlActive ? "page" : undefined}
        >
          ML
        </NavLink>
      </div>
      {(compareActive || mlActive) && (
        <NavLink
          to={compareActive ? "/compare/insights" : "/ml/insights"}
          className={({ isActive }) =>
            cn(
              "text-[11px] eyebrow px-2 py-1.5 rounded-sm transition-colors duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
              isActive
                ? "text-teal"
                : "text-muted hover:text-ink",
            )
          }
        >
          Insights
        </NavLink>
      )}
    </nav>
  );
}

export function DemoLayout() {
  const { pathname } = useLocation();

  const compareActive = pathname.startsWith("/compare");
  const mlActive = pathname.startsWith("/ml");

  const datasetLabel = mlActive
    ? "Training projects"
    : compareActive
      ? "Historical projects"
      : "Select a tool";

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-ink text-white p-6 gap-0">
        {/* Brand header */}
        <div className="mb-8">
          <div className="display-hero text-2xl tracking-tight leading-none">Matrix</div>
          <div className="eyebrow text-[10px] text-white/55 mt-1">Quote Estimation · Demo</div>
        </div>

        <nav aria-label="Primary" className="contents">
          {/* Home link */}
          <div className="flex flex-col gap-1 mb-6">
            <SidebarLink to="/" label="Home" end />
          </div>

          {/* Section divider + Comparison Tool */}
          <div
            className="border-t border-white/10 mt-0 mb-4"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1 mb-6">
            <div
              className={cn(
                "eyebrow text-[10px] mb-1 px-3 transition-colors duration-150 ease-out",
                compareActive ? "text-white/70" : "text-white/40",
              )}
            >
              Real Data
            </div>
            <SidebarLink to="/compare/quote" label="Quote" />
            <SidebarLink to="/compare/compare" label="Compare" />
            <SidebarLink to="/compare/insights" label="Business Insights" />
          </div>

          {/* Section divider + Synthetic Data */}
          <div
            className="border-t border-white/10 mt-0 mb-4"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1">
            <div
              className={cn(
                "eyebrow text-[10px] mb-1 px-3 transition-colors duration-150 ease-out",
                mlActive ? "text-white/70" : "text-white/40",
              )}
            >
              Synthetic Data
            </div>
            <SidebarLink to="/ml/quote" label="Quote" />
            <SidebarLink to="/ml/compare" label="Compare" />
            <SidebarLink to="/ml/insights" label="Business Insights" />
          </div>
        </nav>

        {/* Push controls + toggle to the bottom */}
        <div className="mt-auto pt-6 flex flex-col gap-3">
          {/* Demo Controls panel */}
          <div
            className="rounded-sm border border-white/10 bg-white/[0.04] p-3 flex flex-col gap-1.5"
            role="group"
            aria-label="Demo controls"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles
                size={12}
                strokeWidth={ICON_STROKE}
                className="text-amber shrink-0"
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold text-amber">Demo mode</span>
            </div>
            <p className="text-[11px] text-white/60 leading-snug">
              Runs entirely in your browser. No backend, no sign-in.
            </p>
            <p className="text-[11px] text-white/50 leading-snug">
              Dataset:{" "}
              <span className="text-white/75">{datasetLabel}</span>
            </p>
          </div>

          {/* Theme toggle — inline variant, last element */}
          <ThemeToggle variant="inline" />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile / tablet header (below lg) */}
        <div className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 border-b hairline bg-surface">
          <div className="display-hero text-lg leading-none">Matrix</div>
          <MobileToolSwitch compareActive={compareActive} mlActive={mlActive} />
        </div>

        {/* Desktop top bar */}
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
    </div>
  );
}
