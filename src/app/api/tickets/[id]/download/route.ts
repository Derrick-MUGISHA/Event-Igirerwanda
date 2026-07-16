import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Event, Ticket } from "@/models";
import { getAuth } from "@/lib/auth";
import { ticketQrPngBuffer } from "@/lib/qr";
import { ticketPdfBuffer } from "@/lib/ticketPdf";
import { ticketIdentity, participantOwnsTicket } from "@/lib/tickets";
import { unauthorized, forbidden, notFound } from "@/lib/http";

/* Stream the printable PDF pass. Owner (participant) or admin only. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const [event, who] = await Promise.all([Event.findById(ticket.event), ticketIdentity(ticket)]);

  let photo: Buffer | null = null;
  if (who.photoUrl) {
    try {
      const res = await fetch(who.photoUrl);
      if (res.ok) photo = Buffer.from(await res.arrayBuffer());
    } catch {
      /* the pass renders fine without the photo */
    }
  }

  const qr = await ticketQrPngBuffer(ticket.code, {
    name: who.name,
    type: who.type,
    eventName: event?.name,
  });
  const pdf = await ticketPdfBuffer({
    name: who.name,
    type: who.type,
    eventName: event?.name ?? "Event",
    eventDate: event?.startTime,
    venue: event?.location,
    code: ticket.code,
    qrPng: qr,
    photo,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-${ticket.ticketNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
