"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import { motion } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarDays,
  Gauge,
  MapPin,
  Ticket as TicketIcon,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/client";
import { subscribeLive } from "@/lib/liveStream";
import type { ScanEvent } from "@/lib/scanBus";
import { Note, SkeletonBar, StatusBadge } from "@/components/portal/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Face = { name: string; photoUrl: string };

type Stat = {
  event: {
    id: string;
    name: string;
    date: string;
    endDate: string | null;
    venue: string;
    category: string;
    price: string;
    posterUrl: string;
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
    return subscribeLive("admin", {
      onScan: (event) => {
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
      },
    });
  }, [queryClient]);

  if (error) return <Note tone="error">{error.message}</Note>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-3xl text-cream">Dashboard</h1>
          <p className="mt-1 text-sm text-cream-dim">
            Live overview of every event, ticket and gate.
          </p>
        </div>
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
        <>
          <TotalsRow stats={data.stats} />
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
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
        </>
      )}
    </div>
  );
}

/* cross-event totals along the top */
function TotalsRow({ stats }: { stats: Stat[] }) {
  const totals = stats.reduce(
    (acc, s) => ({
      checkedIn: acc.checkedIn + s.checkedIn,
      issued: acc.issued + s.fullness.issued,
      registered: acc.registered + s.totalAttendees,
      capacity: acc.capacity + s.fullness.capacity,
    }),
    { checkedIn: 0, issued: 0, registered: 0, capacity: 0 }
  );
  const pct = totals.capacity ? Math.round((totals.issued / totals.capacity) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile icon={UserCheck} tone="green" label="Checked in" value={`${totals.checkedIn}`} hint="across all events" />
      <StatTile icon={TicketIcon} tone="orange" label="Passes issued" value={`${totals.issued}`} hint={`of ${totals.capacity} seats`} />
      <StatTile icon={Users} tone="tan" label="Registered" value={`${totals.registered}`} hint="all roles" />
      <StatTile icon={Gauge} tone="sage" label="Capacity used" value={`${pct}%`} hint="tickets vs seats" />
    </div>
  );
}

const TONES = {
  green: "bg-green/15 text-green",
  orange: "bg-orange/15 text-orange",
  tan: "bg-tan/15 text-tan",
  sage: "bg-sage/15 text-sage",
  terracotta: "bg-terracotta/15 text-terracotta",
} as const;

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  tone: keyof typeof TONES;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="flex items-center gap-3.5 px-4">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="display text-2xl leading-none text-cream">{value}</p>
          <p className="label mt-1 truncate text-[10px] font-semibold text-cream-dim">{label}</p>
          {hint && <p className="truncate text-[11px] text-cream-dim/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBar key={i} className="h-20" />
        ))}
      </div>
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

function EventCard({ s }: { s: Stat }) {
  const pct = Math.min(100, (s.fullness.issued / Math.max(1, s.fullness.capacity)) * 100);
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex">
        {s.event.posterUrl && (
          <img
            src={s.event.posterUrl}
            alt=""
            className="hidden w-36 shrink-0 object-cover sm:block"
          />
        )}
        <CardContent className="flex-1 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="display text-xl text-cream">{s.event.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream-dim">
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {new Date(s.event.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {s.event.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {s.event.venue}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {s.faces.length > 0 && <AvatarStack faces={s.faces} total={s.totalAttendees} />}
              <StatusBadge value={s.event.status} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat icon={UserCheck} tone="green" label="Checked in" value={`${s.checkedIn}`} />
            <MiniStat icon={TicketIcon} tone="orange" label="Passes issued" value={`${s.fullness.issued}`} />
            <MiniStat icon={Users} tone="tan" label="Registered" value={`${s.totalAttendees}`} />
            <MiniStat icon={Gauge} tone="sage" label="Capacity used" value={`${Math.round(pct)}%`} />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-cream-dim">
              <span className="label font-semibold">Passes</span>
              <span>
                {s.fullness.issued} / {s.fullness.capacity}
              </span>
            </div>
            <Progress value={pct} className="h-2.5 bg-panel-2 [&>div]:bg-orange" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {rollupChips(s).map(([label, value]) => (
              <Badge key={label} variant="outline" className="border-line bg-panel-2 text-xs font-normal text-cream">
                <span className="text-cream-dim">{label}</span> {value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Users;
  tone: keyof typeof TONES;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-panel-2 p-3.5">
      <span className={cn("mb-2 flex size-8 items-center justify-center rounded-lg", TONES[tone])}>
        <Icon className="size-4" />
      </span>
      <p className="display text-2xl leading-none text-cream">{value}</p>
      <p className="label mt-1.5 text-[10px] font-semibold text-cream-dim">{label}</p>
    </div>
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

const SCAN_BADGE: Record<ScanEvent["result"], { label: string; className: string }> = {
  ACCEPTED: { label: "Checked in", className: "bg-green/15 text-green" },
  ALREADY_USED: { label: "Already used", className: "bg-terracotta/15 text-terracotta" },
  REVOKED: { label: "Revoked", className: "bg-terracotta/15 text-terracotta" },
  INVALID: { label: "Invalid", className: "bg-terracotta/15 text-terracotta" },
  EXPIRED: { label: "Expired", className: "bg-tan/15 text-tan" },
};

function LiveFeed({ scans }: { scans: ScanEvent[] }) {
  return (
    <Card className="h-fit gap-0 py-0">
      <CardContent className="p-5">
        <h3 className="label mb-4 flex items-center gap-2 text-xs font-bold text-orange">
          <Activity className="size-4" />
          Gate activity
        </h3>
        {scans.length === 0 ? (
          <p className="text-sm text-cream-dim">No scans yet — activity shows up here live.</p>
        ) : (
          <ul className="space-y-3">
            {scans.map((e) => {
              const badge = SCAN_BADGE[e.result] ?? SCAN_BADGE.INVALID;
              return (
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
                    <p className="text-xs text-cream-dim">
                      {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {e.eventName ? ` · ${e.eventName}` : ""}
                    </p>
                  </div>
                  <Badge className={cn("shrink-0 text-[10px] font-bold", badge.className)}>
                    {badge.label}
                  </Badge>
                </motion.li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
