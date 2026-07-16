import { dbConnect } from "@/lib/db";
import { Participant, Ticket } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { buildTicketView } from "@/lib/tickets";
import { ok, unauthorized, notFound } from "@/lib/http";

/* The authenticated participant's ticket for their current registration. */
export async function GET(req: Request) {
  const participantId = await requireAttendee(req);
  if (!participantId) return unauthorized();

  await dbConnect();
  const participant = await Participant.findById(participantId);
  if (!participant) return notFound("Registration");

  const ticket = await Ticket.findOne({ holderType: "Participant", holderId: participant._id });
  if (!ticket) return notFound("Ticket");

  return ok({ ticket: await buildTicketView(ticket, { qr: true }) });
}
