"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Percent, Search, UserCheck, UserX, Users } from "lucide-react";
import { api } from "@/lib/client";
import { Note, SkeletonBar, StatusBadge } from "@/components/portal/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  type: string;
  fullName: string;
  email: string;
  phone?: string;
  cohort?: string | null;
  status: string;
  photoUrl: string | null;
  event: { id: string; name: string; date: string; status: string } | null;
  ticket: { code: string; status: string; scannedAt: string | null } | null;
};

type EventRow = { id: string; name: string; status: string };

/* attendance is derived from the ticket: scanned = attended */
type Attendance = "ATTENDED" | "NOT_CHECKED_IN" | "NO_TICKET";

function attendanceOf(r: Row): Attendance {
  if (r.ticket?.status === "USED") return "ATTENDED";
  if (r.ticket) return "NOT_CHECKED_IN";
  return "NO_TICKET";
}

export default function AttendeesPage() {
  const [type, setType] = useState("all");
  const [cohort, setCohort] = useState("all");
  const [status, setStatus] = useState("all");
  const [eventId, setEventId] = useState("all");
  const [attendance, setAttendance] = useState("all");
  const [q, setQ] = useState("");

  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => api<{ events: EventRow[] }>("/api/admin/events", { token: "admin" }),
    staleTime: 60_000,
  });

  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (cohort !== "all") params.set("cohort", cohort);
  if (status !== "all") params.set("status", status);
  if (eventId !== "all") params.set("event", eventId);
  if (q) params.set("q", q);

  const { data, error, isPending } = useQuery({
    queryKey: ["admin-attendees", params.toString()],
    queryFn: () => api<{ attendees: Row[] }>(`/api/admin/attendees?${params}`, { token: "admin" }),
    staleTime: 15_000,
  });

  const rows = useMemo(() => {
    if (!data) return null;
    if (attendance === "all") return data.attendees;
    return data.attendees.filter((r) => attendanceOf(r) === attendance);
  }, [data, attendance]);

  /* attendance summary for whatever is currently in view */
  const summary = useMemo(() => {
    const all = data?.attendees ?? [];
    const attended = all.filter((r) => attendanceOf(r) === "ATTENDED").length;
    const ticketed = all.filter((r) => r.ticket).length;
    return {
      total: all.length,
      attended,
      noShow: ticketed - attended,
      rate: ticketed ? Math.round((attended / ticketed) * 100) : 0,
    };
  }, [data]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl text-cream">Attendees</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Everyone registered, with their real attendance — who actually walked through the gate.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile icon={Users} tone="bg-orange/15 text-orange" label="Registered" value={summary.total} />
        <SummaryTile icon={UserCheck} tone="bg-green/15 text-green" label="Attended" value={summary.attended} />
        <SummaryTile icon={UserX} tone="bg-terracotta/15 text-terracotta" label="Not checked in" value={summary.noShow} />
        <SummaryTile icon={Percent} tone="bg-tan/15 text-tan" label="Attendance rate" value={`${summary.rate}%`} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-dim" />
          <Input
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64 pl-9"
          />
        </div>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="w-52">
            <CalendarDays className="size-4 text-cream-dim" />
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {events?.events.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={attendance} onValueChange={setAttendance}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Attendance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All attendance</SelectItem>
            <SelectItem value="ATTENDED">Attended</SelectItem>
            <SelectItem value="NOT_CHECKED_IN">Not checked in</SelectItem>
            <SelectItem value="NO_TICKET">No ticket</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="PARTICIPANT">Participants</SelectItem>
            <SelectItem value="PLUS_ONE">Plus-ones</SelectItem>
            <SelectItem value="GUEST">Guests</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cohort} onValueChange={setCohort}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All cohorts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cohorts</SelectItem>
            <SelectItem value="FRONTEND">Frontend</SelectItem>
            <SelectItem value="BACKEND">Backend</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <Note tone="error">{error.message}</Note>}
      {isPending && (
        <div role="status" className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBar key={i} className="h-12" />
          ))}
          <span className="sr-only">Loading attendees…</span>
        </div>
      )}

      {rows && (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <Table className="min-w-215">
            <TableHeader>
              <TableRow className="border-line hover:bg-transparent">
                <TableHead className="label text-[10px] font-bold text-cream-dim">Name</TableHead>
                <TableHead className="label text-[10px] font-bold text-cream-dim">Contact</TableHead>
                <TableHead className="label text-[10px] font-bold text-cream-dim">Event</TableHead>
                <TableHead className="label text-[10px] font-bold text-cream-dim">Role</TableHead>
                <TableHead className="label text-[10px] font-bold text-cream-dim">Status</TableHead>
                <TableHead className="label text-[10px] font-bold text-cream-dim">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-line">
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      {r.photoUrl ? (
                        <img src={r.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-2 text-[11px] font-bold text-cream-dim">
                          {r.fullName
                            .split(" ")
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join("")}
                        </span>
                      )}
                      <span className="font-medium text-cream">{r.fullName}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-cream-dim">
                    {r.email}
                    {r.phone && <span className="block text-xs">{r.phone}</span>}
                  </TableCell>
                  <TableCell className="text-xs text-cream-dim">{r.event?.name ?? "—"}</TableCell>
                  <TableCell>
                    <span className="text-xs text-cream-dim">
                      {r.type === "PLUS_ONE" ? "GUEST" : r.type}
                      {r.cohort ? ` · ${r.cohort}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r.status} />
                  </TableCell>
                  <TableCell>
                    <AttendanceCell row={r} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-cream-dim">
                    No attendees match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Users;
  tone: string;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="display text-2xl leading-none text-cream">{value}</p>
          <p className="label mt-1 text-[10px] font-semibold text-cream-dim">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceCell({ row }: { row: Row }) {
  const a = attendanceOf(row);
  if (a === "ATTENDED") {
    return (
      <span>
        <Badge className="bg-green/15 text-[10px] font-bold text-green">Attended</Badge>
        {row.ticket?.scannedAt && (
          <span className="mt-0.5 block text-[11px] text-cream-dim">
            {new Date(row.ticket.scannedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </span>
    );
  }
  if (a === "NOT_CHECKED_IN") {
    return <Badge className="bg-tan/15 text-[10px] font-bold text-tan">Not checked in</Badge>;
  }
  return <Badge className="bg-panel-2 text-[10px] font-bold text-cream-dim">No ticket</Badge>;
}
