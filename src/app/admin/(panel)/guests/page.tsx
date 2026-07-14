"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { Panel, Field, Button, Note, StatusBadge } from "@/components/portal/ui";

type Guest = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  addedBy: string | null;
  ticket: { code: string; status: string } | null;
};
type EventRow = { id: string; name: string; status: string };

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [g, e] = await Promise.all([
      api<{ guests: Guest[] }>("/api/admin/guests", { token: "admin" }),
      api<{ events: EventRow[] }>("/api/admin/events", { token: "admin" }),
    ]);
    setGuests(g.guests);
    setEvents(e.events);
    if (!eventId && e.events.length > 0) {
      setEventId(e.events.find((ev) => ev.status === "OPEN")?.id ?? e.events[0].id);
    }
  }, [eventId]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/admin/guests", {
        token: "admin",
        body: { fullName, email, phone: phone || undefined, eventId },
      });
      setNotice(`${fullName} added — their ticket has been emailed.`);
      setFullName("");
      setEmail("");
      setPhone("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="display text-3xl text-cream">Guests</h1>

      <Panel className="max-w-xl">
        <h2 className="label mb-4 text-sm font-bold text-orange">Add a guest</h2>
        <form onSubmit={addGuest} className="space-y-3">
          <Field label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label className="block">
            <span className="label mb-1.5 block text-xs font-semibold text-cream-dim">Event</span>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-lg border border-line bg-panel-2 px-3.5 py-2.5 text-cream"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy || !eventId}>
            {busy ? "Adding…" : "Add guest & issue ticket"}
          </Button>
          {error && <Note tone="error">{error}</Note>}
          {notice && <Note tone="success">{notice}</Note>}
        </form>
      </Panel>

      {!guests ? (
        <Note tone="info">Loading…</Note>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="label bg-panel text-[10px] font-bold text-cream-dim">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Added by</th>
                <th className="px-4 py-3">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-t border-line">
                  <td className="px-4 py-2.5">{g.fullName}</td>
                  <td className="px-4 py-2.5 text-cream-dim">
                    {g.email}
                    {g.phone && <span className="block text-xs">{g.phone}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{g.addedBy ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {g.ticket ? <StatusBadge value={g.ticket.status} /> : "—"}
                  </td>
                </tr>
              ))}
              {guests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-cream-dim">
                    No guests yet.
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
