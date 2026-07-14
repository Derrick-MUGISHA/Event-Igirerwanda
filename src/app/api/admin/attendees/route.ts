import { dbConnect } from "@/lib/db";
import {
  ATTENDEE_STATUSES,
  ATTENDEE_TYPES,
  Attendee,
  COHORTS,
  Ticket,
  type AttendeeDoc,
  type AttendeeStatus,
  type AttendeeType,
  type Cohort,
} from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/http";
import type { QueryFilter } from "mongoose";

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const filter: QueryFilter<AttendeeDoc> = {};
  const type = pick<AttendeeType>(url.searchParams.get("type"), ATTENDEE_TYPES);
  if (type) filter.type = type;
  const cohort = pick<Cohort>(url.searchParams.get("cohort"), COHORTS);
  if (cohort) filter.cohort = cohort;
  const status = pick<AttendeeStatus>(url.searchParams.get("status"), ATTENDEE_STATUSES);
  if (status) filter.status = status;
  const eventId = url.searchParams.get("event");
  if (eventId) filter.event = eventId;
  const q = url.searchParams.get("q");
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
  }

  await dbConnect();
  const attendees = await Attendee.find(filter).sort({ createdAt: 1 }).limit(500);
  const tickets = await Ticket.find({ attendee: { $in: attendees.map((a) => a._id) } });
  const ticketByAttendee = new Map(tickets.map((t) => [t.attendee.toString(), t]));

  return ok({
    attendees: attendees.map((a) => ({
      id: a._id,
      type: a.type,
      fullName: a.fullName,
      email: a.email,
      phone: a.phone,
      cohort: a.cohort,
      status: a.status,
      photoUrl: a.photoUrl ?? null,
      ticket: (() => {
        const t = ticketByAttendee.get(a._id.toString());
        return t ? { code: t.code, status: t.status } : null;
      })(),
    })),
  });
}
