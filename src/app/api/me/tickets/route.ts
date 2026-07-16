import { dbConnect } from "@/lib/db";
import { Participant, Ticket } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { buildTicketView } from "@/lib/tickets";
import { ok, unauthorized, notFound } from "@/lib/http";

/* The participant's ticket history: live participant tickets across all their
   registrations (matched by email) plus any archived (checked-in) passes whose
   holder snapshot carries their email. */
export async function GET(req: Request) {
  const participantId = await requireAttendee(req);
  if (!participantId) return unauthorized();

  await dbConnect();
  const me = await Participant.findById(participantId);
  if (!me) return notFound("Registration");

  const registrations = await Participant.find({ email: me.email }).select("_id");
  const ids = registrations.map((r) => r._id);

  const tickets = await Ticket.find({
    $or: [
      { holderType: "Participant", holderId: { $in: ids } },
      { "holder.email": me.email },
    ],
  }).sort({ issuedAt: -1 });

  const views = await Promise.all(tickets.map((t) => buildTicketView(t)));
  return ok({ tickets: views });
}
