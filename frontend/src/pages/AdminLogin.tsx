import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api, setAdminToken } from "@/api/client";
import { LoginResponse } from "@/api/types";
import { getDisplayName } from "@/lib/displayName";

type LocationState = { from?: { pathname?: string } };

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? "/admin";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const name = getDisplayName() || undefined;
      const { data } = await api.post<LoginResponse>("/admin/login", { password, name });
      setAdminToken(data.token);
      toast.success("Signed in");
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error("Invalid password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="card p-8 w-full max-w-sm relative overflow-hidden"
      >
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-1 bg-amber"
        />
        <div className="mb-6">
          <div className="eyebrow text-[11px] text-teal">Admin · access</div>
          <h1 className="display-hero text-2xl text-ink mt-1">Sign in</h1>
          <p className="text-xs text-muted mt-2">
            Admin endpoints (dataset upload, training, demo load) require the shared password.
          </p>
        </div>
        <label className="block mb-5">
          <span className="eyebrow text-[10px] text-muted block mb-1.5">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-sm border hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-sm bg-ink text-white py-2.5 text-sm font-medium hover:bg-ink2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
