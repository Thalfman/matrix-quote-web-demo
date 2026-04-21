import { Navigate, useLocation } from "react-router-dom";

import { getAdminToken } from "@/api/client";
import { IS_DEMO } from "@/lib/demoMode";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (IS_DEMO) return <>{children}</>;
  if (!getAdminToken()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
