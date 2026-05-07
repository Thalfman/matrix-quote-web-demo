import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { DemoLayout } from "@/components/DemoLayout";
import { DemoHome } from "@/pages/demo/DemoHome";

const ComparisonQuote = lazy(() =>
  import("@/pages/demo/compare/ComparisonQuote").then((m) => ({
    default: m.ComparisonQuote,
  })),
);
const ComparisonCompare = lazy(() =>
  import("@/pages/demo/compare/ComparisonCompare").then((m) => ({
    default: m.ComparisonCompare,
  })),
);
const ComparisonInsights = lazy(() =>
  import("@/pages/demo/compare/ComparisonInsights").then((m) => ({
    default: m.ComparisonInsights,
  })),
);
const CompareFindSimilar = lazy(() =>
  import("@/pages/demo/compare/CompareFindSimilar").then((m) => ({
    default: m.CompareFindSimilar,
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
const MachineLearningCompare = lazy(() =>
  import("@/pages/demo/ml/MachineLearningCompare").then((m) => ({
    default: m.MachineLearningCompare,
  })),
);
const MyQuotesPage = lazy(() =>
  import("@/pages/quotes/MyQuotesPage").then((m) => ({
    default: m.MyQuotesPage,
  })),
);
const SavedQuotePage = lazy(() =>
  import("@/pages/quotes/SavedQuotePage").then((m) => ({
    default: m.SavedQuotePage,
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

          {/* Comparison Tool - Real Data */}
          <Route path="compare" element={<Navigate to="/compare/quote" replace />} />
          <Route path="compare/quote" element={<ComparisonQuote />} />
          <Route path="compare/compare" element={<ComparisonCompare />} />
          <Route path="compare/browse" element={<Navigate to="/compare/compare" replace />} />
          <Route path="compare/find-similar" element={<CompareFindSimilar />} />
          <Route path="compare/insights" element={<ComparisonInsights />} />

          {/* Machine Learning Tool - Synthetic Data */}
          <Route path="ml" element={<Navigate to="/ml/quote" replace />} />
          <Route path="ml/quote" element={<MachineLearningQuote />} />
          <Route path="ml/compare" element={<MachineLearningCompare />} />
          <Route path="ml/insights" element={<MachineLearningInsights />} />

          {/* Legacy redirects - preserve shareable links */}
          <Route path="compare-tool" element={<Navigate to="/compare/quote" replace />} />
          <Route path="business" element={<Navigate to="/compare/insights" replace />} />
          <Route path="ml-tool" element={<Navigate to="/ml/quote" replace />} />

          {/* My Quotes (Phase 5 - quote persistence) */}
          <Route path="quotes" element={<MyQuotesPage />} />
          <Route path="quotes/:id" element={<SavedQuotePage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
