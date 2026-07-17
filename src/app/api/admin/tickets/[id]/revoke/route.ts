import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Ticket } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { cancelTicket } from "@/lib/tickets";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

/* Admin: revoke a ticket — invalidates the pass and frees its capacity slot. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return notFound("Ticket");

  await dbConnect();
  const ticket = await Ticket.findById(id);
  if (!ticket) return notFound("Ticket");
  if (ticket.status === "REVOKED") return fail("This ticket is already revoked", 409);

  await cancelTicket(ticket);
  return ok({ ticket: { id: ticket._id, status: ticket.status, cancelledAt: ticket.cancelledAt } });
}
