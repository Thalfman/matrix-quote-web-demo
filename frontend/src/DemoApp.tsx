import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { DemoLayout } from "@/components/DemoLayout";
import { DemoHome } from "@/pages/demo/DemoHome";

const ComparisonQuote = lazy(() =>
  import("@/pages/demo/compare/ComparisonQuote").then((m) => ({
    default: m.ComparisonQuote,
  })),
);
const ComparisonInsights = lazy(() =>
  import("@/pages/demo/compare/ComparisonInsights").then((m) => ({
    default: m.ComparisonInsights,
  })),
);
const MachineLearningQuote = lazy(() =>
  import("@/pages/demo/ml/MachineLearningQuote").then((m) => ({
    default: m.MachineLearningQuote,
  })),
);
const MachineLearningInsights = lazy(() =>
  import("@/pages/demo/ml/MachineLearningInsights").then((m) => ({
    default: m.MachineLearningInsights,
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
          {/* Home */}
          <Route index element={<DemoHome />} />

          {/* Comparison Tool */}
          <Route path="compare" element={<Navigate to="/compare/quote" replace />} />
          <Route path="compare/quote" element={<ComparisonQuote />} />
          <Route path="compare/insights" element={<ComparisonInsights />} />

          {/* Machine Learning Tool */}
          <Route path="ml" element={<Navigate to="/ml/quote" replace />} />
          <Route path="ml/quote" element={<MachineLearningQuote />} />
          <Route path="ml/insights" element={<MachineLearningInsights />} />

          {/* Legacy redirects — preserve shareable links */}
          <Route path="compare-tool" element={<Navigate to="/compare/quote" replace />} />
          <Route path="business" element={<Navigate to="/compare/insights" replace />} />
          <Route path="ml-tool" element={<Navigate to="/ml/quote" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
