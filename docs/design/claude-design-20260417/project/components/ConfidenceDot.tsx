import { cn } from "@/lib/utils";

type Confidence = "high" | "medium" | "low";

const styles: Record<Confidence, { dot: string; label: string }> = {
  high: { dot: "bg-success", label: "text-success" },
  medium: { dot: "bg-warning", label: "text-warning" },
  low: { dot: "bg-danger", label: "text-danger" },
};

export function ConfidenceDot({
  value,
  showLabel = true,
}: {
  value: Confidence;
  showLabel?: boolean;
}) {
  const s = styles[value];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {showLabel && <span className={cn("capitalize", s.label)}>{value}</span>}
    </span>
  );
}
