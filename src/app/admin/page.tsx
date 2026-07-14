"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, setToken } from "@/lib/client";
import { PortalShell, Panel, Field, Button, Note } from "@/components/portal/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { accessToken, admin } = await api<{
        accessToken: string;
        admin: { role: string; name: string };
      }>("/api/admin/login", { body: { email, password } });
      setToken("admin", accessToken);
      localStorage.setItem("iems_admin_role", admin.role);
      localStorage.setItem("iems_admin_name", admin.name);
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <PortalShell eyebrow="Staff only" title="Admin sign in">
      <Panel>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          {error && <Note tone="error">{error}</Note>}
        </form>
      </Panel>
    </PortalShell>
  );
}
