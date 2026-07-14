import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, Ticket } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { issueTicket, CapacityError } from "@/lib/tickets";
import { ok, fail, unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  await dbConnect();
  /* guests are tied to the admin who added them; the super admin sees all */
  const filter =
    admin.role === "SUPER_ADMIN"
      ? { type: "GUEST" as const }
      : { type: "GUEST" as const, addedBy: admin.id };
  const guests = await Attendee.find(filter).sort({ createdAt: -1 }).populate("addedBy", "name");
  const tickets = await Ticket.find({ attendee: { $in: guests.map((g) => g._id) } });
  const ticketByAttendee = new Map(tickets.map((t) => [t.attendee.toString(), t]));

  return ok({
    guests: guests.map((g) => ({
      id: g._id,
      fullName: g.fullName,
      email: g.email,
      phone: g.phone,
      addedBy: (g.addedBy as unknown as { name?: string } | null)?.name ?? null,
      ticket: (() => {
        const t = ticketByAttendee.get(g._id.toString());
        return t ? { code: t.code, status: t.status } : null;
      })(),
    })),
  });
}

const Body = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).optional(),
  eventId: z.string().min(1),
});

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Full name, valid email and event are required");

  await dbConnect();
  const event = await Event.findById(parsed.data.eventId);
  if (!event) return fail("Event not found", 404);

  let guest;
  try {
    guest = await Attendee.create({
      event: event._id,
      type: "GUEST",
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      addedBy: admin.id,
      /* guests are vouched for by the admin — no email verification step */
      status: "COMPLETE",
      emailVerifiedAt: new Date(),
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("That email is already registered for this event", 409);
    }
    throw err;
  }

  try {
    const ticket = await issueTicket(guest);
    return ok({ guest: { id: guest._id, fullName: guest.fullName, ticketCode: ticket.code } }, 201);
  } catch (err) {
    if (err instanceof CapacityError) {
      await Attendee.deleteOne({ _id: guest._id });
      return fail(err.message, 409);
    }
    throw err;
  }
}
