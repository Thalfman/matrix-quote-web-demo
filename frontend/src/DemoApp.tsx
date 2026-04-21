import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { DemoLayout } from "@/components/DemoLayout";
import { DemoHome } from "@/pages/demo/DemoHome";

const ComparisonQuoteTool = lazy(() =>
  import("@/pages/demo/ComparisonQuoteTool").then((m) => ({
    default: m.ComparisonQuoteTool,
  })),
);
const MachineLearningQuoteTool = lazy(() =>
  import("@/pages/demo/MachineLearningQuoteTool").then((m) => ({
    default: m.MachineLearningQuoteTool,
  })),
);
const BusinessInsights = lazy(() =>
  import("@/pages/demo/BusinessInsights").then((m) => ({
    default: m.BusinessInsights,
  })),
);

function Fallback() {
  return (
    <div className="flex items-center justify-center h-48 text-muted text-sm">
      Loading…
    </div>
  );
}

export function DemoApp() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<DemoLayout />}>
          <Route index element={<DemoHome />} />
          <Route path="compare-tool" element={<ComparisonQuoteTool />} />
          <Route path="business" element={<BusinessInsights />} />
          <Route path="ml-tool" element={<MachineLearningQuoteTool />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
