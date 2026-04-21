import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { api } from "@/api/client";

type DemoStatus = { is_demo: boolean; enabled_env: boolean; has_real_data: boolean };

export function DemoChip() {
  const { pathname } = useLocation();
  const { data } = useQuery<DemoStatus>({
    queryKey: ["demoStatus"],
    queryFn: async () => (await api.get<DemoStatus>("/demo/status")).data,
    refetchInterval: 60_000,
    enabled: !pathname.startsWith("/admin/login"),
  });
  if (pathname.startsWith("/admin/login")) return null;
  if (!data?.is_demo) return null;
  return (
    <div
      title="Demo data is loaded. Estimates and insights come from a synthetic dataset."
      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-teal/30 bg-tealSoft text-tealDark text-[11px] font-semibold"
    >
      <Sparkles size={12} strokeWidth={1.75} />
      Demo mode
    </div>
  );
}
