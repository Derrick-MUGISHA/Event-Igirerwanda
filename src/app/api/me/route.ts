import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, Ticket, GENDERS } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { ticketQrDataUrl } from "@/lib/qr";
import { attendeeRoleLine } from "@/lib/tickets";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

export async function GET(req: Request) {
  const attendeeId = await requireAttendee(req);
  if (!attendeeId) return unauthorized();

  await dbConnect();
  const attendee = await Attendee.findById(attendeeId);
  if (!attendee) return notFound("Registration");

  const [event, ticket, plusOne] = await Promise.all([
    Event.findById(attendee.event),
    Ticket.findOne({ attendee: attendee._id }),
    attendee.type === "PARTICIPANT"
      ? Attendee.findOne({ linkedParticipant: attendee._id })
      : Promise.resolve(null),
  ]);

  return ok({
    attendee: {
      id: attendee._id,
      type: attendee.type,
      fullName: attendee.fullName,
      email: attendee.email,
      phone: attendee.phone,
      gender: attendee.gender ?? null,
      position: attendee.position ?? "",
      relationship: attendee.relationship ?? null,
      roleLine: await attendeeRoleLine(attendee),
      cohort: attendee.cohort,
      photoUrl: attendee.photoUrl ?? null,
      status: attendee.status,
    },
    event: event && {
      id: event._id,
      name: event.name,
      date: event.date,
      venue: event.venue,
      rules: event.rules,
    },
    ticket: ticket && {
      code: ticket.code,
      status: ticket.status,
      qrDataUrl: await ticketQrDataUrl(ticket.code, {
        name: attendee.fullName,
        type: attendee.type,
        eventName: event?.name,
      }),
    },
    plusOne: plusOne && {
      id: plusOne._id,
      fullName: plusOne.fullName,
      email: plusOne.email,
      gender: plusOne.gender ?? null,
      relationship: plusOne.relationship ?? null,
      status: plusOne.status,
    },
  });
}

const ProfileBody = z
  .object({
    fullName: z.string().min(2),
    phone: z.string().min(6),
    gender: z.enum(GENDERS),
    position: z.string().min(2),
  })
  .partial();

/* the attendee fills in whatever personal details are still missing
   after verifying their email — the ticket is only issued once done */
export async function PATCH(req: Request) {
  const attendeeId = await requireAttendee(req);
  if (!attendeeId) return unauthorized();

  const parsed = ProfileBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid profile details");

  await dbConnect();
  const attendee = await Attendee.findById(attendeeId);
  if (!attendee) return notFound("Registration");
  if (!attendee.emailVerifiedAt) return fail("Verify your email first", 403);

  const { fullName, phone, gender, position } = parsed.data;
  if (fullName) attendee.fullName = fullName;
  if (phone) attendee.phone = phone;
  if (gender) attendee.gender = gender;
  if (position) attendee.position = position;
  await attendee.save();

  return ok({
    attendee: {
      fullName: attendee.fullName,
      phone: attendee.phone,
      gender: attendee.gender,
      position: attendee.position,
    },
  });
}
