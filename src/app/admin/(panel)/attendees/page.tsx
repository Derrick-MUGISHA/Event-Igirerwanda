"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Note, StatusBadge } from "@/components/portal/ui";

type Row = {
  id: string;
  type: string;
  fullName: string;
  email: string;
  phone?: string;
  cohort?: string | null;
  status: string;
  photoUrl: string | null;
  ticket: { code: string; status: string } | null;
};

const SELECT_CLS =
  "rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-cream";

export default function AttendeesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [type, setType] = useState("");
  const [cohort, setCohort] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (cohort) params.set("cohort", cohort);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    try {
      const d = await api<{ attendees: Row[] }>(`/api/admin/attendees?${params}`, { token: "admin" });
      setRows(d.attendees);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [type, cohort, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="display text-3xl text-cream">Attendees</h1>

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${SELECT_CLS} w-64`}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className={SELECT_CLS}>
          <option value="">All roles</option>
          <option value="PARTICIPANT">Participants</option>
          <option value="PLUS_ONE">Plus-ones</option>
          <option value="GUEST">Guests</option>
        </select>
        <select value={cohort} onChange={(e) => setCohort(e.target.value)} className={SELECT_CLS}>
          <option value="">All cohorts</option>
          <option value="FRONTEND">Frontend</option>
          <option value="BACKEND">Backend</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLS}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="COMPLETE">Complete</option>
        </select>
      </div>

      {error && <Note tone="error">{error}</Note>}
      {!rows ? (
        <Note tone="info">Loading…</Note>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="label bg-panel text-[10px] font-bold text-cream-dim">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Cohort</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      {r.photoUrl ? (
                        <img src={r.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="h-8 w-8 rounded-full border border-dashed border-line" />
                      )}
                      {r.fullName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-cream-dim">
                    {r.email}
                    {r.phone && <span className="block text-xs">{r.phone}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{r.type}</td>
                  <td className="px-4 py-2.5 text-xs">{r.cohort ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge value={r.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    {r.ticket ? <StatusBadge value={r.ticket.status} /> : <span className="text-xs text-cream-dim">—</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-cream-dim">
                    No attendees match these filters.
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
