import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api, setAdminToken } from "@/api/client";
import { LoginResponse } from "@/api/types";

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
      const { data } = await api.post<LoginResponse>("/admin/login", { password });
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
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={onSubmit} className="card p-8 w-full max-w-sm space-y-6">
        <div>
          <div className="text-xs tracking-widest muted mb-1">ADMIN</div>
          <h1 className="text-xl font-medium">Sign in</h1>
        </div>
        <label className="block">
          <span className="text-sm muted">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-md border border-border dark:border-border-dark bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-md bg-accent text-accent-foreground py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
