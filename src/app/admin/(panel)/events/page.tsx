"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  ImagePlus,
  MapPin,
  Pencil,
  Tag,
  Ticket as TicketIcon,
  Users,
} from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { Note, SkeletonBar, StatusBadge } from "@/components/portal/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "SheCanCODE",
  "Entrepreneurship",
  "Web Fundamentals",
  "Advanced Backend",
  "Advanced Frontend",
  "Mentorship",
] as const;

type EventRow = {
  id: string;
  name: string;
  slug: string;
  date: string;
  endDate: string | null;
  venue: string;
  category: string;
  price: string;
  description: string;
  posterUrl: string;
  rules: string[];
  maxParticipants: number;
  maxMiniAdmins: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
};

const EVENTS_KEY = ["admin-events"];

export default function EventsPage() {
  const queryClient = useQueryClient();
  const { data, error, isPending } = useQuery({
    queryKey: EVENTS_KEY,
    queryFn: () => api<{ events: EventRow[] }>("/api/admin/events", { token: "admin" }),
    staleTime: 15_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl text-cream">Events</h1>
          <p className="mt-1 text-sm text-cream-dim">
            Every event as a live card — tickets stop working the moment an event ends.
          </p>
        </div>
        <CreateEventDialog onCreated={refresh} />
      </div>

      {error && <Note tone="error">{error.message}</Note>}
      {isPending && (
        <div role="status" className="grid gap-6 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <SkeletonBar key={i} className="h-96" />
          ))}
          <span className="sr-only">Loading events…</span>
        </div>
      )}

      {data && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.events.map((ev) => (
            <EventCard key={ev.id} event={ev} onSaved={refresh} />
          ))}
          {data.events.length === 0 && <Note tone="info">No events yet — create the first one.</Note>}
        </div>
      )}
    </div>
  );
}

/* ————— countdown ————— */

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function CountdownChip({ event }: { event: EventRow }) {
  const now = useNow();
  const start = new Date(event.date).getTime();
  const end = event.endDate
    ? new Date(event.endDate).getTime()
    : new Date(event.date).setHours(23, 59, 59, 999);

  if (now > end) {
    return (
      <span className="label rounded-lg bg-black/60 px-2.5 py-1.5 text-[10px] font-bold text-cream-dim backdrop-blur-sm">
        Ended
      </span>
    );
  }
  if (now >= start) {
    return (
      <span className="label flex items-center gap-1.5 rounded-lg bg-green/90 px-2.5 py-1.5 text-[10px] font-bold text-bg backdrop-blur-sm">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute h-full w-full animate-ping rounded-full bg-bg opacity-60" />
          <span className="h-1.5 w-1.5 rounded-full bg-bg" />
        </span>
        Happening now
      </span>
    );
  }

  const diff = start - now;
  const days = Math.floor(diff / 86_400_000);
  const hrs = Math.floor((diff % 86_400_000) / 3_600_000);
  const min = Math.floor((diff % 3_600_000) / 60_000);
  const cell = (v: number, label: string) => (
    <span className="flex flex-col items-center leading-none">
      <span className="font-display text-sm font-bold text-cream">{String(v).padStart(2, "0")}</span>
      <span className="mt-0.5 text-[8px] uppercase tracking-wider text-cream-dim">{label}</span>
    </span>
  );
  return (
    <span className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-sm">
      {cell(days, "Days")}
      <span className="text-cream-dim">:</span>
      {cell(hrs, "Hrs")}
      <span className="text-cream-dim">:</span>
      {cell(min, "Min")}
    </span>
  );
}

/* ————— event card ————— */

function EventCard({ event, onSaved }: { event: EventRow; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPoster = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("poster", file);
      return api<{ posterUrl: string }>(`/api/admin/events/${event.id}/poster`, {
        token: "admin",
        form,
      });
    },
    onSuccess: () => {
      toast.success("Poster updated");
      onSaved();
    },
    onError: (err) =>
      toast.error("Poster upload failed", {
        description: err instanceof ApiError ? err.message : "Something went wrong",
      }),
  });

  const dateLabel = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* poster with the countdown pinned on top, like a festival flyer */}
      <div className="relative aspect-4/5 w-full overflow-hidden bg-panel-2">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-linear-to-br from-green-deep to-bg">
            <CalendarDays className="size-12 text-cream-dim/50" />
            <p className="display text-2xl text-cream-dim/70">{event.name}</p>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <CountdownChip event={event} />
        </div>
        <div className="absolute right-3 top-3">
          <StatusBadge value={event.status} />
        </div>
        <Badge className="absolute bottom-3 left-3 bg-orange text-[10px] font-bold text-bg">
          {event.category}
        </Badge>
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-1.5 text-xs text-cream-dim">
          <MapPin className="size-3.5 shrink-0 text-orange" />
          {event.venue || "Venue to be announced"}
        </div>
        <h2 className="display text-xl leading-tight text-cream">{event.name}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cream-dim">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> {dateLabel}
          </span>
          {event.endDate && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> ends{" "}
              {new Date(event.endDate).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 border-line bg-panel-2 text-xs text-cream">
            <Tag className="size-3 text-orange" /> {event.price || "Free"}
          </Badge>
          <Badge variant="outline" className="gap-1 border-line bg-panel-2 text-xs text-cream">
            <Users className="size-3 text-green" /> {event.maxParticipants} seats
          </Badge>
          <Badge variant="outline" className="gap-1 border-line bg-panel-2 text-xs text-cream">
            <TicketIcon className="size-3 text-tan" /> passes die at event end
          </Badge>
        </div>

        <div className="flex gap-2 pt-1">
          <EditEventDialog event={event} onSaved={onSaved} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPoster.mutate(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={uploadPoster.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
            {uploadPoster.isPending ? "Uploading…" : event.posterUrl ? "Change poster" : "Add poster"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ————— shared form fields ————— */

type EventForm = {
  name: string;
  slug?: string;
  date: string;
  endDate: string;
  venue: string;
  category: string;
  price: string;
  description: string;
  rules: string;
  maxParticipants: number;
  maxMiniAdmins: number;
  status: EventRow["status"];
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function FieldGroup({ label, htmlFor, children }: { label: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="label text-xs font-semibold text-cream-dim">
        {label}
      </Label>
      {children}
    </div>
  );
}

function EventFormFields({
  form,
  set,
  showSlug,
}: {
  form: EventForm;
  set: <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;
  showSlug?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FieldGroup label="Event name" htmlFor="ev-name">
        <Input
          id="ev-name"
          required
          minLength={2}
          placeholder="SheCanCODE Graduation"
          value={form.name}
          onChange={(e) => {
            set("name", e.target.value);
            if (showSlug) set("slug", slugify(e.target.value));
          }}
        />
      </FieldGroup>
      {showSlug && (
        <FieldGroup label="Slug (auto)" htmlFor="ev-slug">
          <Input
            id="ev-slug"
            required
            pattern="[a-z0-9-]+"
            value={form.slug ?? ""}
            onChange={(e) => set("slug", e.target.value)}
          />
        </FieldGroup>
      )}
      <FieldGroup label="Starts" htmlFor="ev-date">
        <Input
          id="ev-date"
          type="datetime-local"
          required
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />
      </FieldGroup>
      <FieldGroup label={<>Ends — tickets expire here</>} htmlFor="ev-end">
        <Input
          id="ev-end"
          type="datetime-local"
          value={form.endDate}
          onChange={(e) => set("endDate", e.target.value)}
        />
      </FieldGroup>
      <FieldGroup label="Venue" htmlFor="ev-venue">
        <Input
          id="ev-venue"
          placeholder="Kigali"
          value={form.venue}
          onChange={(e) => set("venue", e.target.value)}
        />
      </FieldGroup>
      <FieldGroup label="Category">
        <Select value={form.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldGroup>
      <FieldGroup label="Price" htmlFor="ev-price">
        <Input
          id="ev-price"
          placeholder="Free · From RWF 10K"
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
        />
      </FieldGroup>
      <FieldGroup label="Status">
        <Select value={form.status} onValueChange={(v) => set("status", v as EventRow["status"])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>
      <FieldGroup label="Max attendees" htmlFor="ev-cap">
        <Input
          id="ev-cap"
          type="number"
          min={1}
          value={form.maxParticipants}
          onChange={(e) => set("maxParticipants", Number(e.target.value))}
        />
      </FieldGroup>
      <FieldGroup label="Max mini admins" htmlFor="ev-admins">
        <Input
          id="ev-admins"
          type="number"
          min={1}
          value={form.maxMiniAdmins}
          onChange={(e) => set("maxMiniAdmins", Number(e.target.value))}
        />
      </FieldGroup>
      <div className="sm:col-span-2">
        <FieldGroup label="Description" htmlFor="ev-desc">
          <Textarea
            id="ev-desc"
            rows={2}
            placeholder="One or two lines on what this event is about."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </FieldGroup>
      </div>
      <div className="sm:col-span-2">
        <FieldGroup label="Venue rules & requirements (one per line)" htmlFor="ev-rules">
          <Textarea
            id="ev-rules"
            rows={3}
            placeholder={"Bring a valid ID\nDoors open one hour before start"}
            value={form.rules}
            onChange={(e) => set("rules", e.target.value)}
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formPayload(form: EventForm) {
  return {
    name: form.name,
    date: new Date(form.date),
    endDate: form.endDate ? new Date(form.endDate) : null,
    venue: form.venue,
    category: form.category,
    price: form.price || "Free",
    description: form.description,
    rules: form.rules.split("\n").map((r) => r.trim()).filter(Boolean),
    maxParticipants: Number(form.maxParticipants),
    maxMiniAdmins: Number(form.maxMiniAdmins),
    status: form.status,
  };
}

/* ————— create ————— */

const EMPTY: EventForm = {
  name: "",
  slug: "",
  date: "",
  endDate: "",
  venue: "",
  category: "Mentorship",
  price: "Free",
  description: "",
  rules: "",
  maxParticipants: 200,
  maxMiniAdmins: 10,
  status: "OPEN",
};

function CreateEventDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(EMPTY);
  const set: Parameters<typeof EventFormFields>[0]["set"] = (k, v) =>
    setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () =>
      api("/api/admin/events", {
        token: "admin",
        body: { ...formPayload(form), slug: form.slug },
      }),
    onSuccess: () => {
      toast.success(`${form.name} created`);
      setForm(EMPTY);
      setOpen(false);
      onCreated();
    },
    onError: (err) =>
      toast.error("Could not create event", {
        description: err instanceof ApiError ? err.message : "Something went wrong",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CalendarPlus className="size-4" /> New event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="display text-xl text-cream">New event</DialogTitle>
          <DialogDescription className="text-cream-dim">
            Set the end time carefully — every ticket for this event stops working at that moment.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-5"
        >
          <EventFormFields form={form} set={set} showSlug />
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ————— edit ————— */

function EditEventDialog({ event, onSaved }: { event: EventRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(() => ({
    name: event.name,
    date: toLocalInput(event.date),
    endDate: toLocalInput(event.endDate),
    venue: event.venue,
    category: event.category,
    price: event.price,
    description: event.description,
    rules: event.rules.join("\n"),
    maxParticipants: event.maxParticipants,
    maxMiniAdmins: event.maxMiniAdmins,
    status: event.status,
  }));
  const set: Parameters<typeof EventFormFields>[0]["set"] = (k, v) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      api(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        token: "admin",
        body: formPayload(form),
      }),
    onSuccess: () => {
      toast.success("Event saved");
      setOpen(false);
      onSaved();
    },
    onError: (err) =>
      toast.error("Could not save event", {
        description: err instanceof ApiError ? err.message : "Something went wrong",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Pencil className="size-3.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="display text-xl text-cream">{event.name}</DialogTitle>
          <DialogDescription className="text-cream-dim">
            Tickets for this event expire at the end time below.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-5"
        >
          <EventFormFields form={form} set={set} />
          <Button type="submit" className="w-full" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
