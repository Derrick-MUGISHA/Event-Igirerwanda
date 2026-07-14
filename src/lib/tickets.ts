import { randomUUID } from "crypto";
import { Attendee, Event, Ticket, eventDeadline, type AttendeeDoc, type EventDoc } from "@/models";
import { ticketQrPngBuffer } from "./qr";
import { sendTicketEmail } from "./mailer";
import { ticketPdfBuffer } from "./ticketPdf";

/* subtitle under the name on the pass: cohort/position for participants,
   connection to the inviter for plus-ones */
export async function attendeeRoleLine(attendee: AttendeeDoc): Promise<string> {
  if (attendee.type === "PLUS_ONE") {
    const inviter = attendee.linkedParticipant
      ? await Attendee.findById(attendee.linkedParticipant)
      : null;
    const rel = attendee.relationship
      ? attendee.relationship.charAt(0) + attendee.relationship.slice(1).toLowerCase()
      : "Guest";
    return inviter ? `${rel} of ${inviter.fullName}` : rel;
  }
  if (attendee.position) return attendee.position;
  if (attendee.cohort) {
    const c = attendee.cohort.charAt(0) + attendee.cohort.slice(1).toLowerCase();
    return `${c} cohort`;
  }
  return "Participant";
}

export class CapacityError extends Error {
  constructor() {
    super("This event has reached its maximum capacity");
  }
}

/* Called when an attendee completes registration (photo submitted) or an
   admin adds a guest. Idempotent: returns the existing ticket if one exists. */
export async function issueTicket(attendee: AttendeeDoc, opts: { email?: boolean } = {}) {
  const existing = await Ticket.findOne({ attendee: attendee._id });
  if (existing) return existing;

  const event = await Event.findById(attendee.event);
  if (!event) throw new Error("Event not found");

  const issued = await Ticket.countDocuments({ event: event._id, status: { $ne: "REVOKED" } });
  if (issued >= event.maxParticipants) throw new CapacityError();

  const ticket = await Ticket.create({
    code: randomUUID(),
    event: event._id,
    attendee: attendee._id,
  });

  if (opts.email !== false) {
    try {
      await emailTicket(attendee, event, ticket.code);
    } catch (err) {
      /* ticket stays valid even if the email bounces; it's visible on the dashboard */
      console.error("ticket email failed", err);
    }
  }
  return ticket;
}

export async function emailTicket(attendee: AttendeeDoc, event: EventDoc, code: string) {
  const qr = await ticketQrPngBuffer(code, {
    name: attendee.fullName,
    type: attendee.type,
    eventName: event.name,
  });
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${code}`;
  const role = await attendeeRoleLine(attendee);

  /* pull the profile photo so it can be embedded in the PDF ticket */
  let photo: Buffer | null = null;
  if (attendee.photoUrl) {
    try {
      const res = await fetch(attendee.photoUrl);
      if (res.ok) photo = Buffer.from(await res.arrayBuffer());
    } catch {
      /* the pass is still valid without the photo */
    }
  }

  const pdf = await ticketPdfBuffer({
    name: attendee.fullName,
    role,
    type: attendee.type,
    eventName: event.name,
    eventDate: event.date,
    venue: event.venue,
    code,
    qrPng: qr,
    photo,
  });

  await sendTicketEmail({
    to: attendee.email,
    name: attendee.fullName,
    role,
    photoUrl: attendee.photoUrl ?? null,
    type: attendee.type,
    eventName: event.name,
    eventDate: event.date,
    venue: event.venue,
    ticketCode: code,
    ticketUrl: url,
    validUntil: eventDeadline(event),
    qrPng: qr,
    pdf,
  });
}

export async function attendeeWithTicket(attendeeId: string) {
  const attendee = await Attendee.findById(attendeeId);
  if (!attendee) return null;
  const ticket = await Ticket.findOne({ attendee: attendee._id });
  return { attendee, ticket };
}
