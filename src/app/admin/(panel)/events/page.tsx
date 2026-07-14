"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { Panel, Field, Button, Note, StatusBadge } from "@/components/portal/ui";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  date: string;
  venue: string;
  rules: string[];
  maxParticipants: number;
  maxMiniAdmins: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ events: EventRow[] }>("/api/admin/events", { token: "admin" });
      setEvents(d.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="display text-3xl text-cream">Events</h1>
        <Button variant="ghost" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Close" : "New event"}
        </Button>
      </div>
      {error && <Note tone="error">{error}</Note>}
      {showCreate && (
        <CreateEventForm
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {!events ? (
        <Note tone="info">Loading…</Note>
      ) : (
        events.map((ev) => <EventEditor key={ev.id} event={ev} onSaved={load} />)
      )}
    </div>
  );
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/events", { token: "admin", body: { name, slug, date, venue } });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="max-w-xl">
      <h2 className="label mb-4 text-sm font-bold text-orange">New event</h2>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Slug (lowercase, dashes)"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Field label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create event"}
        </Button>
        {error && <Note tone="error">{error}</Note>}
      </form>
    </Panel>
  );
}

function EventEditor({ event, onSaved }: { event: EventRow; onSaved: () => void }) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date.slice(0, 10));
  const [venue, setVenue] = useState(event.venue);
  const [rules, setRules] = useState(event.rules.join("\n"));
  const [maxParticipants, setMaxParticipants] = useState(event.maxParticipants);
  const [maxMiniAdmins, setMaxMiniAdmins] = useState(event.maxMiniAdmins);
  const [status, setStatus] = useState(event.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        token: "admin",
        body: {
          name,
          date,
          venue,
          rules: rules.split("\n").map((r) => r.trim()).filter(Boolean),
          maxParticipants: Number(maxParticipants),
          maxMiniAdmins: Number(maxMiniAdmins),
          status,
        },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="display text-xl">{event.name}</h2>
        <StatusBadge value={event.status} />
      </div>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        <label className="block">
          <span className="label mb-1.5 block text-xs font-semibold text-cream-dim">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EventRow["status"])}
            className="w-full rounded-lg border border-line bg-panel-2 px-3.5 py-2.5 text-cream"
          >
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
        <Field
          label="Max attendees (capacity)"
          type="number"
          min={1}
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(Number(e.target.value))}
        />
        <Field
          label="Max mini admins"
          type="number"
          min={1}
          value={maxMiniAdmins}
          onChange={(e) => setMaxMiniAdmins(Number(e.target.value))}
        />
        <label className="block sm:col-span-2">
          <span className="label mb-1.5 block text-xs font-semibold text-cream-dim">
            Venue rules & requirements (one per line)
          </span>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-line bg-panel-2 px-3.5 py-2.5 text-cream"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
          {error && <Note tone="error">{error}</Note>}
          {saved && <Note tone="success">Saved.</Note>}
        </div>
      </form>
    </Panel>
  );
}
