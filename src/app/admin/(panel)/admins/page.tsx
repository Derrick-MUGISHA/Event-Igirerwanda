"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { Panel, Field, Button, Note } from "@/components/portal/ui";

type AdminRow = { id: string; name: string; email: string; role: string; active: boolean };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ admins: AdminRow[] }>("/api/admin/admins", { token: "admin" });
      setAdmins(d.admins);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/admin/admins", { token: "admin", body: { name, email, password } });
      setNotice(`Mini admin ${name} created. Share their password with them securely.`);
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(a: AdminRow) {
    try {
      await api(`/api/admin/admins/${a.id}`, {
        method: "PATCH",
        token: "admin",
        body: { active: !a.active },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="display text-3xl text-cream">Mini admins</h1>

      <Panel className="max-w-xl">
        <h2 className="label mb-4 text-sm font-bold text-orange">Create a mini admin</h2>
        <form onSubmit={create} className="space-y-3">
          <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field
            label="Password (8+ characters)"
            type="text"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create mini admin"}
          </Button>
          {error && <Note tone="error">{error}</Note>}
          {notice && <Note tone="success">{notice}</Note>}
        </form>
      </Panel>

      {!admins ? (
        <Note tone="info">Loading…</Note>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="label bg-panel text-[10px] font-bold text-cream-dim">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-4 py-2.5">{a.name}</td>
                  <td className="px-4 py-2.5 text-cream-dim">{a.email}</td>
                  <td className="px-4 py-2.5 text-xs">{a.role}</td>
                  <td className="px-4 py-2.5">{a.active ? "Yes" : "No"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {a.role !== "SUPER_ADMIN" && (
                      <Button variant="ghost" onClick={() => toggle(a)} className="!px-3 !py-1.5 text-xs">
                        {a.active ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
