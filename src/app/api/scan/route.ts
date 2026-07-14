import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, ScanLog, Ticket, VerificationToken, eventDeadline } from "@/models";
import { requireScanner, verifyQrToken } from "@/lib/auth";
import { publishScan, type ScanEvent } from "@/lib/scanBus";
import { notifyAdmins } from "@/lib/notify";
import { ok, fail, unauthorized } from "@/lib/http";

const Body = z.object({ qr: z.string().min(10) });

const timeOf = (d: Date | string) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

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
  const now = new Date();
  const at = now.toISOString();

  /* handshake: the QR must carry a token we signed — it also tells us who
     the holder claims to be before we even touch the database */
  const qr = await verifyQrToken(parsed.data.qr);
  if (!qr) {
    await ScanLog.create({ ...scannedBy, result: "INVALID" });
    void notifyAdmins({
      kind: "SCAN_ALERT",
      severity: "error",
      title: "Invalid QR presented at the gate",
      body: "A code that isn't one of our signed tickets was scanned.",
    });
    return ok(broadcast({ at, result: "INVALID" }));
  }

  const known = await Ticket.findOne({ code: qr.code });
  const [attendee, event] = known
    ? await Promise.all([Attendee.findById(known.attendee), Event.findById(known.event)])
    : [null, null];
  const who = attendee
    ? { fullName: attendee.fullName, type: attendee.type, photoUrl: attendee.photoUrl ?? null }
    : known?.holder
      ? {
          fullName: known.holder.fullName,
          type: known.holder.type,
          photoUrl: known.holder.photoUrl ?? null,
        }
      : qr.name
        ? { fullName: qr.name, type: qr.type ?? "GUEST", photoUrl: null }
        : null;
  const eventName = event?.name ?? qr.eventName ?? null;
  const deadline = event ? eventDeadline(event) : null;
  const expiresAt = deadline?.toISOString() ?? null;

  /* a signed code we've never issued, or a revoked pass */
  if (!known || known.status === "REVOKED") {
    const result = !known ? "INVALID" : "REVOKED";
    await ScanLog.create({ ...scannedBy, ticket: known?._id ?? null, result });
    void notifyAdmins({
      kind: "SCAN_ALERT",
      severity: "error",
      title: result === "REVOKED" ? "Revoked ticket presented" : "Unknown ticket scanned",
      body: who ? `${who.fullName}${eventName ? ` · ${eventName}` : ""}` : "",
      eventId: event?._id ?? null,
    });
    return ok(broadcast({ at, result, attendee: who, eventName, expiresAt }));
  }

  /* second scan of the same pass — tell the gate when it was first used */
  if (known.status === "USED") {
    await ScanLog.create({ ...scannedBy, ticket: known._id, result: "ALREADY_USED" });
    const usedAt = known.scannedAt?.toISOString() ?? null;
    void notifyAdmins({
      kind: "SCAN_ALERT",
      severity: "warning",
      title: "Ticket scanned twice",
      body: `${who?.fullName ?? "Unknown"}${eventName ? ` · ${eventName}` : ""} — first used at ${
        known.scannedAt ? timeOf(known.scannedAt) : "an unknown time"
      }.`,
      eventId: event?._id ?? null,
    });
    return ok(broadcast({ at, result: "ALREADY_USED", attendee: who, eventName, usedAt, expiresAt }));
  }

  /* the ticket dies with its event — past the deadline nothing gets in */
  if (deadline && now > deadline) {
    await ScanLog.create({ ...scannedBy, ticket: known._id, result: "EXPIRED" });
    void notifyAdmins({
      kind: "SCAN_ALERT",
      severity: "warning",
      title: "Expired ticket presented",
      body: `${who?.fullName ?? "Unknown"}${eventName ? ` · ${eventName}` : ""} — the event ended ${deadline.toLocaleString(
        "en-US",
        { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
      )}.`,
      eventId: event?._id ?? null,
    });
    return ok(broadcast({ at, result: "EXPIRED", attendee: who, eventName, expiresAt }));
  }

  /* atomic claim: two gates scanning the same ticket can't both accept it */
  const ticket = await Ticket.findOneAndUpdate(
    { code: qr.code, status: "VALID" },
    { status: "USED", scannedAt: now },
    { new: true }
  );
  if (!ticket) {
    /* lost the race to another gate a moment ago */
    await ScanLog.create({ ...scannedBy, ticket: known._id, result: "ALREADY_USED" });
    return ok(
      broadcast({ at, result: "ALREADY_USED", attendee: who, eventName, usedAt: at, expiresAt })
    );
  }

  await ScanLog.create({ ...scannedBy, ticket: ticket._id, result: "ACCEPTED" });

  /* the pass is consumed — archive the holder on the ticket, then delete the
     attendee so the same person is free to register for any other event */
  if (attendee) {
    ticket.holder = {
      fullName: attendee.fullName,
      email: attendee.email,
      phone: attendee.phone ?? null,
      type: attendee.type,
      cohort: attendee.cohort ?? null,
      photoUrl: attendee.photoUrl ?? null,
      addedBy: attendee.addedBy ?? null,
    };
    await ticket.save();
    await Promise.all([
      Attendee.deleteOne({ _id: attendee._id }),
      VerificationToken.deleteMany({ attendee: attendee._id }),
    ]);
  }

  void notifyAdmins({
    kind: "CHECK_IN",
    severity: "success",
    title: `${who?.fullName ?? "A guest"} checked in`,
    body: `${eventName ?? "Event"} · ${timeOf(now)}`,
    eventId: event?._id ?? null,
  });
  return ok({
    ...broadcast({ at, result: "ACCEPTED", attendee: who, eventName, usedAt: at, expiresAt }),
    cohort: attendee?.cohort ?? null,
  });
}
