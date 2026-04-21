import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { RequireAdmin } from "@/components/RequireAdmin";
import { DemoApp } from "@/DemoApp";
import { IS_DEMO } from "@/lib/demoMode";
import { AdminLogin } from "@/pages/AdminLogin";
import { BatchQuotes } from "@/pages/BatchQuotes";
import { Compare } from "@/pages/Compare";
import { DataExplorer } from "@/pages/DataExplorer";
import { Drivers } from "@/pages/Drivers";
import { Overview } from "@/pages/Overview";
import { Quotes } from "@/pages/Quotes";
import { SingleQuote } from "@/pages/SingleQuote";
import { UploadTrain } from "@/pages/UploadTrain";

// Lazy-load recharts-heavy pages to split them out of the main bundle.
const ExecutiveOverview = lazy(() =>
  import("@/pages/ExecutiveOverview").then((m) => ({ default: m.ExecutiveOverview })),
);
const ModelPerformance = lazy(() =>
  import("@/pages/ModelPerformance").then((m) => ({ default: m.ModelPerformance })),
);

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48 text-muted text-sm">
      Loading…
    </div>
  );
}

export default function App() {
  if (IS_DEMO) return <DemoApp />;

  return (
    <Suspense fallback={<PageSpinner />}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RequireAdmin><SingleQuote /></RequireAdmin>} />
        <Route path="batch" element={<RequireAdmin><BatchQuotes /></RequireAdmin>} />
        <Route path="performance" element={<RequireAdmin><ModelPerformance /></RequireAdmin>} />
        <Route path="insights" element={<RequireAdmin><ExecutiveOverview /></RequireAdmin>} />
        <Route path="quotes" element={<RequireAdmin><Quotes /></RequireAdmin>} />
        <Route path="quotes/compare" element={<RequireAdmin><Compare /></RequireAdmin>} />

        <Route path="admin/login" element={<AdminLogin />} />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <Overview />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/train"
          element={
            <RequireAdmin>
              <UploadTrain />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/data"
          element={
            <RequireAdmin>
              <DataExplorer />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/drivers"
          element={
            <RequireAdmin>
              <Drivers />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
