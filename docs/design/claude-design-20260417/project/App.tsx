import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { RequireAdmin } from "@/components/RequireAdmin";
import { AdminLogin } from "@/pages/AdminLogin";
import { BatchQuotes } from "@/pages/BatchQuotes";
import { DataExplorer } from "@/pages/DataExplorer";
import { Drivers } from "@/pages/Drivers";
import { ModelPerformance } from "@/pages/ModelPerformance";
import { Overview } from "@/pages/Overview";
import { SingleQuote } from "@/pages/SingleQuote";
import { UploadTrain } from "@/pages/UploadTrain";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SingleQuote />} />
        <Route path="batch" element={<BatchQuotes />} />
        <Route path="performance" element={<ModelPerformance />} />

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
  );
}
