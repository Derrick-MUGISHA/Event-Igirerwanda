import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, ScanLog, Ticket } from "@/models";
import { requireScanner, verifyQrToken } from "@/lib/auth";
import { publishScan, type ScanEvent } from "@/lib/scanBus";
import { ok, fail, unauthorized } from "@/lib/http";

const Body = z.object({ qr: z.string().min(10) });

export async function POST(req: Request) {
  const scanner = await requireScanner(req);
  if (!scanner) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("QR payload is required");

  await dbConnect();
  const scannedBy = { scannedByAdmin: scanner.adminId ?? null, scannedByOrg: scanner.orgId ?? null };

  const broadcast = (event: ScanEvent) => {
    publishScan(event);
    return event;
  };
  const now = new Date().toISOString();

  /* handshake: the QR must carry a token we signed — it also tells us who
     the holder claims to be before we even touch the database */
  const qr = await verifyQrToken(parsed.data.qr);
  if (!qr) {
    await ScanLog.create({ ...scannedBy, result: "INVALID" });
    return ok(broadcast({ at: now, result: "INVALID" }));
  }

  /* atomic claim: two gates scanning the same ticket can't both accept it */
  const ticket = await Ticket.findOneAndUpdate(
    { code: qr.code, status: "VALID" },
    { status: "USED", scannedAt: new Date() },
    { new: true }
  );

  if (!ticket) {
    const known = await Ticket.findOne({ code: qr.code });
    const result = !known ? "INVALID" : known.status === "REVOKED" ? "REVOKED" : "ALREADY_USED";
    await ScanLog.create({ ...scannedBy, ticket: known?._id ?? null, result });
    const attendee = known ? await Attendee.findById(known.attendee) : null;
    return ok({
      ...broadcast({
        at: now,
        result,
        attendee: attendee
          ? { fullName: attendee.fullName, type: attendee.type, photoUrl: attendee.photoUrl ?? null }
          : qr.name
            ? { fullName: qr.name, type: qr.type ?? "GUEST", photoUrl: null }
            : null,
        eventName: qr.eventName ?? null,
      }),
      scannedAt: known?.scannedAt ?? null,
    });
  }

  await ScanLog.create({ ...scannedBy, ticket: ticket._id, result: "ACCEPTED" });
  const [attendee, event] = await Promise.all([
    Attendee.findById(ticket.attendee),
    Event.findById(ticket.event),
  ]);
  return ok({
    ...broadcast({
      at: now,
      result: "ACCEPTED",
      attendee: attendee
        ? { fullName: attendee.fullName, type: attendee.type, photoUrl: attendee.photoUrl ?? null }
        : qr.name
          ? { fullName: qr.name, type: qr.type ?? "GUEST", photoUrl: null }
          : null,
      eventName: event?.name ?? qr.eventName ?? null,
    }),
    cohort: attendee?.cohort ?? null,
  });
}
