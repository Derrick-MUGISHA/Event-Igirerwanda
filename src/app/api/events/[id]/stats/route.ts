import { dbConnect } from "@/lib/db";
import { Guest, Participant, Ticket } from "@/models";
import { capacityView, computeStatus, findPublicEvent } from "@/lib/eventView";
import { ok, notFound } from "@/lib/http";

/* Public-safe per-event statistics: registration, check-in and stack split.
   No personal data — just counts. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await dbConnect();
  const event = await findPublicEvent(id);
  if (!event) return notFound("Event");

  const [participants, guests, checkedIn, byStack] = await Promise.all([
    Participant.countDocuments({ event: event._id }),
    Guest.countDocuments({ event: event._id }),
    Ticket.countDocuments({ event: event._id, status: "USED" }),
    Participant.aggregate<{ _id: string | null; n: number }>([
      { $match: { event: event._id } },
      { $group: { _id: "$stack", n: { $sum: 1 } } },
    ]),
  ]);

  return ok({
    eventId: event._id,
    title: event.name,
    status: computeStatus(event),
    ...capacityView(event),
    participants,
    guests,
    checkedIn,
    byStack: Object.fromEntries(byStack.map((s) => [s._id ?? "UNSET", s.n])),
  });
}
