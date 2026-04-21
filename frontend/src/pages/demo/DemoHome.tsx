import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { DEMO_ASSETS } from "@/lib/demoMode";
import { PageHeader } from "@/components/PageHeader";

type Manifest = {
  built_at: string;
  real_count: number;
  synthetic_count: number;
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
    tone === "teal"
      ? "bg-tealSoft text-tealDark"
      : "bg-amberSoft text-ink";
  return (
    <span
      className={`text-[10px] eyebrow px-2 py-1 rounded-sm ${toneClass} tnum`}
    >
      {value != null ? `${value} ${unit}` : "…"}
    </span>
  );
}

function ToolCard({
  to,
  eyebrow,
  eyebrowTone,
  title,
  description,
  chip,
  ctaTone,
}: {
  to: string;
  eyebrow: string;
  eyebrowTone: "teal" | "amber";
  title: string;
  description: string;
  chip: React.ReactNode;
  ctaTone: "teal" | "amber";
}) {
  const eyebrowClass =
    eyebrowTone === "teal" ? "text-teal" : "text-amber";
  const ctaClass =
    ctaTone === "teal"
      ? "text-teal group-hover:text-tealDark"
      : "text-amber group-hover:text-amber";
  return (
    <Link
      to={to}
      className={
        "group card p-6 flex flex-col gap-4 transition-colors duration-150 ease-out" +
        " hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`eyebrow text-[11px] ${eyebrowClass}`}>{eyebrow}</span>
        {chip}
      </div>
      <h2 className="display-hero text-2xl leading-tight text-ink">{title}</h2>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
      <div className={`mt-auto text-xs font-medium inline-flex items-center gap-1.5 ${ctaClass}`}>
        Open
        <ArrowRight
          size={14}
          strokeWidth={1.75}
          className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export function DemoHome() {
  const { data: manifest } = useQuery<Manifest>({
    queryKey: ["demo", "manifest"],
    queryFn: async () => {
      const res = await fetch(`${DEMO_ASSETS}/manifest.json`);
      if (!res.ok) throw new Error(`manifest.json ${res.status}`);
      return res.json();
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Matrix · Demo"
        title="Pick a tool"
        description="Two lenses on the quoting engine. Real Data surfaces patterns from today's historical book. Synthetic Data shows what the models can do at scale — trained on generated data, running live in your browser."
      />

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <ToolCard
          to="/compare/quote"
          eyebrow="Real Data · Quote"
          eyebrowTone="teal"
          title="Real Data Quote Tool"
          description="Enter project parameters to surface the three closest historical matches by weighted distance. Today's book, exactly as billed."
          ctaTone="teal"
          chip={<CountChip tone="teal" value={manifest?.real_count} unit="projects" />}
        />

        <ToolCard
          to="/ml/quote"
          eyebrow="Synthetic Data · Quote"
          eyebrowTone="amber"
          title="Synthetic Data Quote Tool"
          description="Fill in project parameters. Twelve Gradient Boosting models run locally and return P10–P90 confidence intervals. Trained on a generated pool at scale."
          ctaTone="amber"
          chip={<CountChip tone="amber" value={manifest?.synthetic_count} unit="training rows" />}
        />

        <ToolCard
          to="/compare/insights"
          eyebrow="Real Data · Insights"
          eyebrowTone="teal"
          title="Business Insights"
          description="Portfolio-level view — hours by discipline, industry mix, complexity drivers, and ranked projects across the real historical book."
          ctaTone="teal"
          chip={<CountChip tone="teal" value={manifest?.real_count} unit="projects" />}
        />
      </div>
    </>
  );
}
