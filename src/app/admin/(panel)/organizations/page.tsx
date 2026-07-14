"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { Panel, Field, Button, Note } from "@/components/portal/ui";

type Org = { id: string; name: string; contactEmail: string; active: boolean };

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ organizations: Org[] }>("/api/admin/organizations", { token: "admin" });
      setOrgs(d.organizations);
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
    setNewKey("");
    try {
      const d = await api<{ accessKey: string }>("/api/admin/organizations", {
        token: "admin",
        body: { name, contactEmail },
      });
      setNewKey(d.accessKey);
      setName("");
      setContactEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(o: Org) {
    try {
      await api(`/api/admin/organizations/${o.id}`, {
        method: "PATCH",
        token: "admin",
        body: { active: !o.active },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="display text-3xl text-cream">Partner organizations</h1>
      <p className="max-w-xl text-sm text-cream-dim">
        Organizations helping at the venue get an access key. They sign in at{" "}
        <code className="text-orange">/scan</code> and can verify tickets at the entrance.
      </p>

      <Panel className="max-w-xl">
        <h2 className="label mb-4 text-sm font-bold text-orange">Add an organization</h2>
        <form onSubmit={create} className="space-y-3">
          <Field label="Organization name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Field
            label="Contact email"
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add & generate access key"}
          </Button>
          {error && <Note tone="error">{error}</Note>}
          {newKey && (
            <div className="rounded-lg border border-orange/40 bg-panel-2 p-3">
              <p className="label text-[10px] font-bold text-orange">
                Access key — shown only once, share it now
              </p>
              <p className="mt-1 break-all font-mono text-sm">{newKey}</p>
            </div>
          )}
        </form>
      </Panel>

      {!orgs ? (
        <Note tone="info">Loading…</Note>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="label bg-panel text-[10px] font-bold text-cream-dim">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-2.5">{o.name}</td>
                  <td className="px-4 py-2.5 text-cream-dim">{o.contactEmail}</td>
                  <td className="px-4 py-2.5">{o.active ? "Yes" : "No"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" onClick={() => toggle(o)} className="!px-3 !py-1.5 text-xs">
                      {o.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-cream-dim">
                    No organizations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
