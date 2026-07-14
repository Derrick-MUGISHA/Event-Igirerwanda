"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Mail,
  Phone,
  Search,
  Send,
  Ticket as TicketIcon,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { Note, SkeletonBar, StatusBadge } from "@/components/portal/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Guest = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  addedBy: string | null;
  eventName: string | null;
  addedAt: string;
  ticket: { code: string; status: string; scannedAt: string | null } | null;
};
type EventRow = { id: string; name: string; status: string };

export default function GuestsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const { data: guestData, error, isPending } = useQuery({
    queryKey: ["admin-guests"],
    queryFn: () => api<{ guests: Guest[] }>("/api/admin/guests", { token: "admin" }),
    staleTime: 15_000,
  });
  const { data: eventData } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => api<{ events: EventRow[] }>("/api/admin/events", { token: "admin" }),
    staleTime: 60_000,
  });

  const guests = guestData?.guests;
  const stats = useMemo(() => {
    const all = guests ?? [];
    return {
      total: all.length,
      checkedIn: all.filter((g) => g.ticket?.status === "USED").length,
      pending: all.filter((g) => g.ticket?.status === "VALID").length,
    };
  }, [guests]);

  const filtered = useMemo(() => {
    if (!guests) return null;
    if (!q) return guests;
    const needle = q.toLowerCase();
    return guests.filter((g) =>
      [g.fullName, g.email, g.phone ?? "", g.eventName ?? ""].some((v) =>
        v.toLowerCase().includes(needle)
      )
    );
  }, [guests, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl text-cream">Guests</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Invite special guests directly — no registration needed. Their pass is emailed the moment
          you add them.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <GuestStat icon={UserPlus} tone="bg-orange/15 text-orange" label="Guests invited" value={stats.total} />
        <GuestStat icon={UserCheck} tone="bg-green/15 text-green" label="Checked in" value={stats.checkedIn} />
        <GuestStat icon={TicketIcon} tone="bg-tan/15 text-tan" label="Passes unused" value={stats.pending} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        <AddGuestCard
          events={eventData?.events ?? []}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ["admin-guests"] })}
        />

        <div className="space-y-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-dim" />
            <Input
              placeholder="Search guests…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          {error && <Note tone="error">{error.message}</Note>}
          {isPending && (
            <div role="status" className="space-y-2">
              {[0, 1, 2].map((i) => (
                <SkeletonBar key={i} className="h-12" />
              ))}
              <span className="sr-only">Loading guests…</span>
            </div>
          )}

          {filtered && (
            <div className="overflow-x-auto rounded-xl border border-line bg-panel">
              <Table className="min-w-155">
                <TableHeader>
                  <TableRow className="border-line hover:bg-transparent">
                    <TableHead className="label text-[10px] font-bold text-cream-dim">Guest</TableHead>
                    <TableHead className="label text-[10px] font-bold text-cream-dim">Event</TableHead>
                    <TableHead className="label text-[10px] font-bold text-cream-dim">Invited by</TableHead>
                    <TableHead className="label text-[10px] font-bold text-cream-dim">Pass</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((g) => (
                    <TableRow key={g.id} className="border-line">
                      <TableCell>
                        <p className="font-medium text-cream">{g.fullName}</p>
                        <p className="text-xs text-cream-dim">
                          {g.email}
                          {g.phone ? ` · ${g.phone}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-cream-dim">{g.eventName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-cream-dim">{g.addedBy ?? "—"}</TableCell>
                      <TableCell>
                        {g.ticket ? (
                          <span>
                            <StatusBadge value={g.ticket.status} />
                            {g.ticket.scannedAt && (
                              <span className="mt-0.5 block text-[11px] text-cream-dim">
                                in at{" "}
                                {new Date(g.ticket.scannedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-cream-dim">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-cream-dim">
                        {q ? "No guests match your search." : "No guests yet — add the first one on the left."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GuestStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof UserPlus;
  tone: string;
  label: string;
  value: number;
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

function AddGuestCard({ events, onAdded }: { events: EventRow[]; onAdded: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventId, setEventId] = useState("");

  const open = events.find((ev) => ev.status === "OPEN");
  const selected = eventId || open?.id || events[0]?.id || "";

  const add = useMutation({
    mutationFn: () =>
      api("/api/admin/guests", {
        token: "admin",
        body: { fullName, email, phone: phone || undefined, eventId: selected },
      }),
    onSuccess: () => {
      toast.success(`${fullName} added`, {
        description: "Their pass with the QR code has been emailed.",
      });
      setFullName("");
      setEmail("");
      setPhone("");
      onAdded();
    },
    onError: (err) =>
      toast.error("Could not add guest", {
        description: err instanceof ApiError ? err.message : "Something went wrong",
      }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label flex items-center gap-2 text-sm font-bold text-orange">
          <UserPlus className="size-4" /> Add a guest
        </CardTitle>
        <CardDescription className="text-cream-dim">
          Guests skip verification — you vouch for them. A personal QR pass goes straight to their
          inbox.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="guest-name" className="label text-xs font-semibold text-cream-dim">
              Full name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-dim" />
              <Input
                id="guest-name"
                required
                minLength={2}
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-email" className="label text-xs font-semibold text-cream-dim">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-dim" />
              <Input
                id="guest-email"
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-phone" className="label text-xs font-semibold text-cream-dim">
              Phone <span className="normal-case text-cream-dim/60">(optional)</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-dim" />
              <Input
                id="guest-phone"
                placeholder="+250 7xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="label text-xs font-semibold text-cream-dim">Event</Label>
            <Select value={selected} onValueChange={setEventId}>
              <SelectTrigger className="w-full">
                <CalendarDays className="size-4 text-cream-dim" />
                <SelectValue placeholder="Pick an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.name}
                    {ev.status !== "OPEN" ? ` (${ev.status.toLowerCase()})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={add.isPending || !selected}>
            <Send className="size-4" />
            {add.isPending ? "Sending pass…" : "Add guest & email their pass"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
