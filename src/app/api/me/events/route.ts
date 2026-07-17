import { dbConnect } from "@/lib/db";
import { Event, Participant } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { eventView } from "@/lib/eventView";
import { ok, unauthorized, notFound } from "@/lib/http";

/* Every event this person is registered for (matched by email across their
   per-event Participant records), each with its computed status. */
export async function GET(req: Request) {
  const participantId = await requireAttendee(req);
  if (!participantId) return unauthorized();

  await dbConnect();
  const me = await Participant.findById(participantId);
  if (!me) return notFound("Registration");

  const registrations = await Participant.find({ email: me.email }).select("event status ticket");
  const events = await Event.find({ _id: { $in: registrations.map((r) => r.event) } });
  const byId = new Map(events.map((e) => [e._id.toString(), e]));
  const now = new Date();

  return ok({
    events: registrations
      .map((r) => {
        const event = byId.get(r.event.toString());
        if (!event) return null;
        return {
          registrationStatus: r.status,
          hasTicket: !!r.ticket,
          event: eventView(event, now),
        };
      })
      .filter(Boolean),
  });
}
