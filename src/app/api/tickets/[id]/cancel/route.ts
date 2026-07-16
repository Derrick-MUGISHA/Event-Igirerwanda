import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Ticket } from "@/models";
import { getAuth } from "@/lib/auth";
import { cancelTicket, participantOwnsTicket } from "@/lib/tickets";
import { ok, fail, unauthorized, forbidden, notFound } from "@/lib/http";

/* Cancel a ticket and release its capacity slot. Owner (participant) or admin;
   only a still-VALID ticket can be cancelled. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth || auth.kind === "scanner") return unauthorized();

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return notFound("Ticket");

  await dbConnect();
  const ticket = await Ticket.findById(id);
  if (!ticket) return notFound("Ticket");

  if (auth.kind === "attendee" && !(await participantOwnsTicket(ticket, auth.sub))) {
    return forbidden();
  }
  if (ticket.status !== "VALID") {
    return fail(`This ticket is ${ticket.status.toLowerCase()} and can't be cancelled`, 409);
  }

  await cancelTicket(ticket);
  return ok({ ticket: { id: ticket._id, status: ticket.status, cancelledAt: ticket.cancelledAt } });
}
