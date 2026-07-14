"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api, ApiError, clearToken, getToken } from "@/lib/client";
import {
  PortalShell,
  Panel,
  Field,
  Select,
  Button,
  Note,
  StatusBadge,
  SkeletonBar,
} from "@/components/portal/ui";
import IdCard from "@/components/portal/IdCard";

type Gender = "FEMALE" | "MALE" | "OTHER";
type Relationship = "RELATIVE" | "FRIEND" | "COLLEAGUE" | "PARTNER" | "MENTOR" | "OTHER";

type Me = {
  attendee: {
    type: "PARTICIPANT" | "PLUS_ONE" | "GUEST";
    fullName: string;
    email: string;
    phone?: string;
    gender: Gender | null;
    roleLine: string;
    cohort?: string | null;
    photoUrl: string | null;
    status: string;
  };
  event: { name: string; date: string; venue: string; rules: string[] } | null;
  ticket: { code: string; status: string; qrDataUrl: string } | null;
  plusOne: {
    fullName: string;
    email: string;
    gender: Gender | null;
    relationship: Relationship | null;
    status: string;
  } | null;
};

const GENDER_OPTIONS: [Gender, string][] = [
  ["FEMALE", "Female"],
  ["MALE", "Male"],
  ["OTHER", "Other / prefer not to say"],
];

const RELATIONSHIP_OPTIONS: [Relationship, string][] = [
  ["RELATIVE", "Relative"],
  ["FRIEND", "Friend"],
  ["COLLEAGUE", "Colleague"],
  ["PARTNER", "Partner"],
  ["MENTOR", "Mentor"],
  ["OTHER", "Other"],
];

/* cards drift up one after another as the dashboard loads */
const cardMotion = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.08, ease: "easeOut" as const },
});

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your dashboard" className="grid gap-6 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-panel p-6">
          <SkeletonBar className="h-3 w-24" />
          <div className="mt-5 flex items-center gap-4">
            <div className="h-20 w-20 animate-pulse rounded-xl bg-panel-2" />
            <div className="flex-1 space-y-2">
              <SkeletonBar className="h-4 w-3/4" />
              <SkeletonBar className="h-3 w-1/2" />
              <SkeletonBar className="h-3 w-2/3" />
            </div>
          </div>
          <SkeletonBar className="mt-6 h-10 w-full" />
        </div>
      ))}
      <span className="sr-only">Loading your dashboard…</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setMe(await api<Me>("/api/me", { token: "attendee" }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken("attendee");
        router.replace("/verify");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }, [router]);

  useEffect(() => {
    if (!getToken("attendee")) {
      router.replace("/verify");
      return;
    }
    load();
  }, [load, router]);

  if (error)
    return (
      <PortalShell eyebrow="Ticket portal" title="Dashboard">
        <Panel>
          <Note tone="error">{error}</Note>
        </Panel>
      </PortalShell>
    );
  if (!me)
    return (
      <PortalShell eyebrow="Ticket portal" title="Dashboard" wide>
        <DashboardSkeleton />
      </PortalShell>
    );

  const firstName = me.attendee.fullName.startsWith("Guest of ")
    ? "Guest"
    : me.attendee.fullName.split(" ")[0];

  /* once the pass exists, the pass IS the dashboard */
  if (me.ticket) {
    return (
      <PortalShell eyebrow="Ticket portal" title={`Hi, ${firstName}`} wide>
        <div className="space-y-6">
          <motion.div {...cardMotion(0)}>
            <IdCard
              name={me.attendee.fullName}
              role={me.attendee.roleLine}
              type={me.attendee.type}
              photoUrl={me.attendee.photoUrl}
              eventName={me.event?.name ?? "Event"}
              eventDate={me.event?.date}
              venue={me.event?.venue}
              qrDataUrl={me.ticket.qrDataUrl}
              code={me.ticket.code}
              status={me.ticket.status}
            />
            <p className="mt-3 text-center text-xs text-cream-dim">
              Your pass was also emailed to you with a printable PDF ticket.
            </p>
          </motion.div>
          {me.attendee.type === "PARTICIPANT" && (
            <motion.div {...cardMotion(1)}>
              <PlusOneCard me={me} onChanged={load} />
            </motion.div>
          )}
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell eyebrow="Ticket portal" title={`Hi, ${firstName}`} wide>
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div {...cardMotion(0)}>
          <CompleteCard me={me} onDone={load} />
        </motion.div>
        {me.event && (
          <motion.div {...cardMotion(1)}>
            <EventCard event={me.event} />
          </motion.div>
        )}
        {me.attendee.type === "PARTICIPANT" && (
          <motion.div {...cardMotion(2)} className="md:col-span-2">
            <PlusOneCard me={me} onChanged={load} />
          </motion.div>
        )}
      </div>
    </PortalShell>
  );
}

/* One step to the pass: participants only add their photo (we already
   have their details); plus-ones can also put their real name on it */
function CompleteCard({ me, onDone }: { me: Me; onDone: () => void }) {
  const { attendee } = me;
  const nameMissing =
    attendee.type === "PLUS_ONE" && attendee.fullName.startsWith("Guest of ");
  const [fullName, setFullName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(f: File | null) {
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (nameMissing && fullName) {
        await api("/api/me", { method: "PATCH", token: "attendee", body: { fullName } });
      }
      const form = new FormData();
      form.append("photo", file);
      await api("/api/me/photo", { token: "attendee", form });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Panel>
      <h2 className="label mb-4 text-sm font-bold text-orange">One step to your pass</h2>
      <p className="mb-4 text-sm text-cream-dim">
        {nameMissing
          ? "Tell us your name and add a clear photo — your event pass is generated right after."
          : "We already have your details — just add a clear photo of yourself and your event pass is generated instantly."}
      </p>
      <form onSubmit={submit} className="space-y-4">
        {nameMissing && (
          <Field
            label="Your full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As it should appear on your pass"
          />
        )}
        <div className="flex items-center gap-4">
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="Photo preview"
              className="h-20 w-20 shrink-0 rounded-xl border-2 border-orange object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-line text-2xl text-cream-dim">
              ?
            </div>
          )}
          <label className="flex-1 cursor-pointer">
            <span className="label mb-1.5 block text-left text-xs font-semibold text-cream-dim">
              Your photo
            </span>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-cream-dim file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-panel-2 file:px-4 file:py-2 file:text-cream"
            />
          </label>
        </div>
        <Button type="submit" busy={busy} disabled={!file} className="w-full">
          {busy ? "Generating your pass…" : "Submit & get my pass"}
        </Button>
        {error && <Note tone="error">{error}</Note>}
      </form>
    </Panel>
  );
}

function PlusOneCard({ me, onChanged }: { me: Me; onChanged: () => void }) {
  const [mode, setMode] = useState<"none" | "form" | "link">("none");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [relationship, setRelationship] = useState<Relationship | "">("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (me.plusOne) {
    const rel = me.plusOne.relationship
      ? RELATIONSHIP_OPTIONS.find(([v]) => v === me.plusOne?.relationship)?.[1]
      : null;
    /* the plus-one hangs off this registration like a child record */
    return (
      <Panel>
        <h2 className="label mb-4 text-sm font-bold text-orange">Your plus-one</h2>
        <div className="border-l-2 border-orange/50 pl-4">
          <p className="text-sm font-semibold">{me.plusOne.fullName}</p>
          <p className="text-sm text-cream-dim">
            {me.plusOne.email}
            {rel && ` · ${rel}`}
          </p>
          <div className="mt-2">
            <StatusBadge value={me.plusOne.status} />
          </div>
        </div>
        <p className="mt-3 text-xs text-cream-dim">
          They ride on your registration — they&apos;ll get their own pass after
          verifying their email and adding a photo.
        </p>
      </Panel>
    );
  }

  async function addDirect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/me/plus-one", {
        token: "attendee",
        body: { fullName, email, gender, relationship },
      });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function makeLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { inviteUrl } = await api<{ inviteUrl: string }>("/api/me/plus-one/invite", {
        token: "attendee",
        body: inviteEmail ? { email: inviteEmail } : {},
      });
      setInviteUrl(inviteUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <h2 className="label mb-4 text-sm font-bold text-orange">Bring a plus-one</h2>
      {mode === "none" && (
        <div className="space-y-3">
          <p className="text-sm text-cream-dim">
            You can bring one guest. Fill in their details yourself, or send them an invite to do it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setMode("form")}>Fill their details</Button>
            <Button variant="ghost" onClick={() => setMode("link")}>
              Send them an invite
            </Button>
          </div>
        </div>
      )}
      {mode === "form" && (
        <form onSubmit={addDirect} className="space-y-3">
          <p className="text-xs text-cream-dim">
            Fill in your guest&apos;s details — their pass will carry this
            information; they just verify their email and add a photo.
          </p>
          <Field
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As it should appear on their pass"
          />
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select
            label="Gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <option value="" disabled>
              Select…
            </option>
            {GENDER_OPTIONS.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </Select>
          <Select
            label="Relationship to you"
            required
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as Relationship)}
          >
            <option value="" disabled>
              Select…
            </option>
            {RELATIONSHIP_OPTIONS.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Button type="submit" busy={busy}>
              {busy ? "Adding…" : "Add plus-one"}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setMode("none")}>
              Back
            </Button>
          </div>
        </form>
      )}
      {mode === "link" && !inviteUrl && (
        <form onSubmit={makeLink} className="space-y-3">
          <p className="text-sm text-cream-dim">
            Enter their email to send the invite straight to their inbox, or
            leave it empty to just get a shareable link (valid 72h).
          </p>
          <Field
            label="Their email (optional)"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div className="flex gap-3">
            <Button type="submit" busy={busy}>
              {busy ? "Creating…" : inviteEmail ? "Email the invite" : "Create link"}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setMode("none")}>
              Back
            </Button>
          </div>
        </form>
      )}
      {mode === "link" && inviteUrl && (
        <div className="space-y-3">
          {inviteEmail && <Note tone="success">Invite sent to {inviteEmail}.</Note>}
          <p className="text-sm text-cream-dim">Share this link with your plus-one (valid 72h):</p>
          <p className="break-all rounded-lg bg-panel-2 p-3 text-xs">{inviteUrl}</p>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(inviteUrl);
              setCopied(true);
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      )}
      {error && <Note tone="error">{error}</Note>}
    </Panel>
  );
}

function EventCard({ event }: { event: NonNullable<Me["event"]> }) {
  return (
    <Panel>
      <h2 className="label mb-4 text-sm font-bold text-orange">Event</h2>
      <p className="display text-2xl">{event.name}</p>
      <p className="mt-1 text-sm text-cream-dim">
        {new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        {event.venue && ` · ${event.venue}`}
      </p>
      {event.rules.length > 0 && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-cream-dim">
          {event.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
