import { dbConnect } from "@/lib/db";
import { Event, Participant, Ticket } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/http";
import type { QueryFilter } from "mongoose";
import type { ParticipantDoc } from "@/models";

/* escape a CSV cell (quote when it contains a comma, quote or newline) */
function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* Admin: export the guest list as CSV. Honours the ?event= filter. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const eventId = new URL(req.url).searchParams.get("event");
  const filter: QueryFilter<ParticipantDoc> = {};
  if (eventId) filter.event = eventId;

  await dbConnect();
  const participants = await Participant.find(filter).sort({ createdAt: 1 }).limit(10_000);
  const [events, tickets] = await Promise.all([
    Event.find({ _id: { $in: participants.map((p) => p.event) } }).select("name"),
    Ticket.find({
      holderType: "Participant",
      holderId: { $in: participants.map((p) => p._id) },
    }).select("holderId ticketNumber status scannedAt sentAt"),
  ]);
  const eventName = new Map(events.map((e) => [e._id.toString(), e.name]));
  const ticketOf = new Map(tickets.map((t) => [t.holderId.toString(), t]));

  const header = [
    "Name",
    "Email",
    "Phone",
    "Stack",
    "Gender",
    "Status",
    "Registration",
    "Event",
    "Ticket Number",
    "Ticket Status",
    "Ticket Sent",
    "Checked In",
  ];
  const rows = participants.map((p) => {
    const t = ticketOf.get(p._id.toString());
    return [
      p.name,
      p.email,
      p.phone ?? "",
      p.stack ?? "",
      p.gender ?? "",
      p.status,
      p.registrationStatus,
      eventName.get(p.event.toString()) ?? "",
      t?.ticketNumber ?? "",
      t?.status ?? "",
      t?.sentAt ? "yes" : "no",
      t?.scannedAt ? new Date(t.scannedAt).toISOString() : "",
    ].map(cell).join(",");
  });

  const csv = [header.map(cell).join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="guests-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
