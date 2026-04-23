import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { useDemoManifest } from "@/demo/realProjects";

type TabChip = {
  to: string;
  label: string;
};

function CountChip({
  tone,
  value,
  unit,
}: {
  tone: "teal" | "amber";
  value: number | undefined;
  unit: string;
}) {
  const toneClass =
    tone === "teal" ? "bg-tealSoft text-tealDark" : "bg-amberSoft text-ink";
  return (
    <span
      className={`text-xs eyebrow px-2 py-1 rounded-sm ${toneClass} tnum`}
    >
      {value != null ? `${value} ${unit}` : "…"}
    </span>
  );
}

/**
 * SectionCard - one of two top-level entry points on the demo home.
 * Each card surfaces the Real-Data or Synthetic-Data story: eyebrow +
 * count chip, a headline + description, and a 3-chip strip of sub-tabs
 * (Quote / Compare / Business Insights) that route into that side.
 */
function SectionCard({
  eyebrow,
  eyebrowTone,
  title,
  description,
  chip,
  tabs,
}: {
  eyebrow: string;
  eyebrowTone: "teal" | "amber";
  title: string;
  description: string;
  chip: React.ReactNode;
  tabs: TabChip[];
}) {
  const eyebrowClass = eyebrowTone === "teal" ? "text-teal" : "text-amber";
  const chipClass =
    eyebrowTone === "teal"
      ? "border-teal/30 bg-tealSoft/40 text-tealDark hover:bg-tealSoft"
      : "border-amber/40 bg-amberSoft/40 text-ink hover:bg-amberSoft";
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`eyebrow text-sm ${eyebrowClass}`}>{eyebrow}</span>
        {chip}
      </div>
      <h2 className="display-hero text-2xl leading-tight text-ink">{title}</h2>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={
              "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium" +
              " transition-colors duration-150 ease-out" +
              " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" +
              ` ${chipClass}`
            }
          >
            {t.label}
            <ArrowRight
              size={12}
              strokeWidth={1.75}
              className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DemoHome() {
  const { data: manifest } = useDemoManifest();

  return (
    <>
      <PageHeader
        eyebrow="Matrix · Demo"
        title="The quoting engine"
        description="The same engine trained on two different sets of projects. Real Data draws from twenty-four completed historical projects. Synthetic Data extends the training set to five hundred generated projects to show how the engine behaves at larger scale."
      />

      <div className="mt-6 grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        <SectionCard
          eyebrow="Real Data"
          eyebrowTone="teal"
          title="Today's book"
          description="Twenty-four billed projects, each with hours, a likely range, and the drivers behind them."
          chip={
            <CountChip tone="teal" value={manifest?.real_count} unit="projects" />
          }
          tabs={[
            { to: "/compare/quote", label: "Quote" },
            { to: "/compare/compare", label: "Compare" },
            { to: "/compare/insights", label: "Business Insights" },
          ]}
        />

        <SectionCard
          eyebrow="Synthetic Data"
          eyebrowTone="amber"
          title="At scale"
          description="Five hundred generated training projects. The same views and outputs, at a larger training scale."
          chip={
            <CountChip
              tone="amber"
              value={manifest?.synthetic_count}
              unit="training rows"
            />
          }
          tabs={[
            { to: "/ml/quote", label: "Quote" },
            { to: "/ml/compare", label: "Compare" },
            { to: "/ml/insights", label: "Business Insights" },
          ]}
        />
      </div>
    </>
  );
}
