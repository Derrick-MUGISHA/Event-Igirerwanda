"use client";

import { useEffect, useState } from "react";
import { api, ApiError, getToken, setToken, clearToken } from "@/lib/client";
import { PortalShell, Panel, Field, Button, Note } from "@/components/portal/ui";
import Scanner from "@/components/portal/Scanner";

/* Entrance scanning for partner organizations: sign in with the access key
   given by the super admin, then scan tickets */
export default function OrgScanPage() {
  const [authed, setAuthed] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getToken("org")) {
      setAuthed(true);
      setOrgName(localStorage.getItem("iems_org_name") ?? "");
    }
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api<{ accessToken: string; organization: { name: string } }>(
        "/api/org/login",
        { body: { accessKey } }
      );
      setToken("org", d.accessToken);
      localStorage.setItem("iems_org_name", d.organization.name);
      setOrgName(d.organization.name);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell eyebrow="Venue check-in" title={authed ? `Scanning as ${orgName}` : "Partner sign in"}>
      {authed ? (
        <div className="space-y-4">
          <Scanner token="org" />
          <Button
            variant="ghost"
            onClick={() => {
              clearToken("org");
              localStorage.removeItem("iems_org_name");
              setAuthed(false);
            }}
          >
            Sign out
          </Button>
        </div>
      ) : (
        <Panel>
          <form onSubmit={login} className="space-y-4">
            <p className="text-sm text-cream-dim">
              Enter the access key provided by the event organizers.
            </p>
            <Field
              label="Access key"
              required
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Checking…" : "Start scanning"}
            </Button>
            {error && <Note tone="error">{error}</Note>}
          </form>
        </Panel>
      )}
    </PortalShell>
  );
}
