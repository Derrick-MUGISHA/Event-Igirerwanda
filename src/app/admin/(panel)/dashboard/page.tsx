"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import { motion } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "@/lib/client";
import type { ScanEvent } from "@/lib/scanBus";
import { Panel, Note, StatusBadge, SkeletonBar } from "@/components/portal/ui";

type Face = { name: string; photoUrl: string };

type Stat = {
  event: {
    id: string;
    name: string;
    date: string;
    status: string;
    maxParticipants: number;
  };
  fullness: { issued: number; capacity: number };
  checkedIn: number;
  totalAttendees: number;
  faces: Face[];
  byType: { _id: { type: string; status: string }; n: number }[];
  byCohort: { _id: { cohort: string | null; status: string }; n: number }[];
  tickets: Record<string, number>;
};

type StatsResponse = { stats: Stat[]; recentScans: ScanEvent[] };

const STATS_KEY = ["admin-stats"];

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { data, error, isPending } = useQuery({
    queryKey: STATS_KEY,
    queryFn: () => api<StatsResponse>("/api/admin/stats", { token: "admin" }),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  /* gate activity streams straight into the cached stats — no refetch */
  useEffect(() => {
    const raw = getToken("admin");
    if (!raw) return;
    const source = new EventSource(`/api/admin/scans/stream?token=${encodeURIComponent(raw)}`);
    source.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as ScanEvent;
        queryClient.setQueryData<StatsResponse>(STATS_KEY, (old) => {
          if (!old || old.recentScans.some((s) => s.at === event.at)) return old;
          return {
            stats:
              event.result === "ACCEPTED"
                ? old.stats.map((s) =>
                    s.event.name === event.eventName ? { ...s, checkedIn: s.checkedIn + 1 } : s
                  )
                : old.stats,
            recentScans: [event, ...old.recentScans].slice(0, 8),
          };
        });
      } catch {
        /* malformed frame */
      }
    };
    return () => source.close();
  }, [queryClient]);

  if (error) return <Note tone="error">{error.message}</Note>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="display text-3xl text-cream">Dashboard</h1>
        <span className="flex items-center gap-2 text-xs text-cream-dim">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-green opacity-60" />
            <span className="h-2 w-2 rounded-full bg-green" />
          </span>
          Live
        </span>
      </div>

      {isPending && <DashboardSkeleton />}

      {data && (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {data.stats.length === 0 && <Note tone="info">No events yet.</Note>}
            {data.stats.map((s, i) => (
              <motion.div
                key={s.event.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <EventCard s={s} />
              </motion.div>
            ))}
          </div>
          <LiveFeed scans={data.recentScans} />
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-panel p-6">
          <SkeletonBar className="h-5 w-56" />
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[0, 1, 2].map((j) => (
              <SkeletonBar key={j} className="h-20" />
            ))}
          </div>
          <SkeletonBar className="mt-5 h-2.5 w-full" />
        </div>
      ))}
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

/* overlapping attendee photos, like a group chat header */
function AvatarStack({ faces, total }: { faces: Face[]; total: number }) {
  const extra = total - faces.length;
  return (
    <div className="flex items-center">
      {faces.map((f, i) => (
        <img
          key={f.photoUrl}
          src={f.photoUrl}
          alt={f.name}
          title={f.name}
          className="h-9 w-9 rounded-full border-2 border-panel object-cover"
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: faces.length - i }}
        />
      ))}
      {extra > 0 && (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-panel bg-panel-2 text-[11px] font-bold text-cream"
          style={{ marginLeft: faces.length ? -10 : 0 }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

function BigStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-panel-2 p-4">
      <p className={`display text-3xl leading-none ${accent ? "text-orange" : "text-cream"}`}>
        {value}
      </p>
      <p className="label mt-1.5 text-[10px] font-semibold text-cream-dim">{label}</p>
    </div>
  );
}

function EventCard({ s }: { s: Stat }) {
  const pct = Math.min(100, (s.fullness.issued / Math.max(1, s.fullness.capacity)) * 100);
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-xl text-cream">{s.event.name}</h2>
          <p className="mt-0.5 text-xs text-cream-dim">
            {new Date(s.event.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {s.faces.length > 0 && <AvatarStack faces={s.faces} total={s.totalAttendees} />}
          <StatusBadge value={s.event.status} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigStat label="Checked in" value={`${s.checkedIn}`} accent />
        <BigStat label="Passes issued" value={`${s.fullness.issued}`} />
        <BigStat label="Registered" value={`${s.totalAttendees}`} />
        <BigStat label="Capacity used" value={`${Math.round(pct)}%`} />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-cream-dim">
          <span className="label font-semibold">Passes</span>
          <span>
            {s.fullness.issued} / {s.fullness.capacity}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-panel-2">
          <motion.div
            className="h-full rounded-full bg-orange"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {rollupChips(s).map(([label, value]) => (
          <span
            key={label}
            className="rounded-full border border-line bg-panel-2 px-3 py-1 text-xs text-cream"
          >
            <span className="text-cream-dim">{label}</span> {value}
          </span>
        ))}
      </div>
    </Panel>
  );
}

/* condensed role/cohort/scan chips */
function rollupChips(s: Stat): [string, string][] {
  const chips: [string, string][] = [];
  const byType = new Map<string, number>();
  for (const r of s.byType) byType.set(r._id.type, (byType.get(r._id.type) ?? 0) + r.n);
  for (const [type, n] of byType) chips.push([type === "PLUS_ONE" ? "Guests" : titleCase(type), `${n}`]);
  const byCohort = new Map<string, number>();
  for (const r of s.byCohort) {
    if (!r._id.cohort) continue;
    byCohort.set(r._id.cohort, (byCohort.get(r._id.cohort) ?? 0) + r.n);
  }
  for (const [cohort, n] of byCohort) chips.push([titleCase(cohort), `${n}`]);
  for (const [status, n] of Object.entries(s.tickets)) chips.push([titleCase(status), `${n}`]);
  return chips;
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function LiveFeed({ scans }: { scans: ScanEvent[] }) {
  const DOT: Record<ScanEvent["result"], string> = {
    ACCEPTED: "bg-green",
    ALREADY_USED: "bg-terracotta",
    REVOKED: "bg-terracotta",
    INVALID: "bg-terracotta",
  };
  return (
    <Panel className="h-fit">
      <h3 className="label mb-4 text-xs font-bold text-orange">Gate activity</h3>
      {scans.length === 0 ? (
        <p className="text-sm text-cream-dim">No scans yet — activity shows up here live.</p>
      ) : (
        <ul className="space-y-3">
          {scans.map((e) => (
            <motion.li
              key={e.at}
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              {e.attendee?.photoUrl ? (
                <img
                  src={e.attendee.photoUrl}
                  alt=""
                  className="h-9 w-9 rounded-full border border-line object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-2 text-xs text-cream-dim">
                  ?
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-cream">
                  {e.attendee?.fullName ?? "Unknown ticket"}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-cream-dim">
                  <span className={`h-1.5 w-1.5 rounded-full ${DOT[e.result]}`} />
                  {titleCase(e.result.replace("_", " "))} ·{" "}
                  {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
