import { dbConnect } from "@/lib/db";
import { Attendee, Event, ScanLog, Ticket } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  await dbConnect();
  const events = await Event.find().sort({ date: -1 });

  const stats = await Promise.all(
    events.map(async (event) => {
      const [byType, byCohort, tickets, faces, liveAttendees, byHolderType, byHolderCohort, holderFaces, archivedCount] =
        await Promise.all([
          Attendee.aggregate([
            { $match: { event: event._id } },
            { $group: { _id: { type: "$type", status: "$status" }, n: { $sum: 1 } } },
          ]),
          Attendee.aggregate([
            { $match: { event: event._id, type: "PARTICIPANT" } },
            { $group: { _id: { cohort: "$cohort", status: "$status" }, n: { $sum: 1 } } },
          ]),
          Ticket.aggregate([
            { $match: { event: event._id } },
            { $group: { _id: "$status", n: { $sum: 1 } } },
          ]),
          /* a handful of faces for the avatar stack */
          Attendee.find({ event: event._id, photoUrl: { $nin: [null, ""] } })
            .sort({ updatedAt: -1 })
            .limit(5)
            .select("fullName photoUrl"),
          Attendee.countDocuments({ event: event._id }),
          /* checked-in people whose attendee record was deleted at the gate
             live on as holder snapshots on their tickets */
          Ticket.aggregate([
            { $match: { event: event._id, "holder.fullName": { $exists: true } } },
            { $group: { _id: { type: "$holder.type", status: "COMPLETE" }, n: { $sum: 1 } } },
          ]),
          Ticket.aggregate([
            { $match: { event: event._id, "holder.type": "PARTICIPANT" } },
            { $group: { _id: { cohort: "$holder.cohort", status: "COMPLETE" }, n: { $sum: 1 } } },
          ]),
          Ticket.find({ event: event._id, "holder.photoUrl": { $nin: [null, ""] } })
            .sort({ scannedAt: -1 })
            .limit(5)
            .select("holder.fullName holder.photoUrl"),
          Ticket.countDocuments({ event: event._id, "holder.fullName": { $exists: true } }),
        ]);
      byType.push(...byHolderType);
      byCohort.push(...byHolderCohort);
      const totalAttendees = liveAttendees + archivedCount;
      const allFaces = [
        ...faces.map((f) => ({ name: f.fullName, photoUrl: f.photoUrl! })),
        ...holderFaces.map((t) => ({ name: t.holder!.fullName, photoUrl: t.holder!.photoUrl! })),
      ].slice(0, 5);
      const ticketCounts = Object.fromEntries(tickets.map((t) => [t._id, t.n]));
      const issued = (ticketCounts.VALID ?? 0) + (ticketCounts.USED ?? 0);
      return {
        event: {
          id: event._id,
          name: event.name,
          slug: event.slug,
          date: event.date,
          endDate: event.endDate,
          venue: event.venue,
          category: event.category,
          price: event.price,
          posterUrl: event.posterUrl ?? "",
          status: event.status,
          maxParticipants: event.maxParticipants,
          maxMiniAdmins: event.maxMiniAdmins,
        },
        fullness: { issued, capacity: event.maxParticipants },
        checkedIn: ticketCounts.USED ?? 0,
        totalAttendees,
        faces: allFaces,
        byType,
        byCohort,
        tickets: ticketCounts,
      };
    })
  );

  /* the most recent gate activity, for the dashboard's live feed */
  const recentLogs = await ScanLog.find().sort({ createdAt: -1 }).limit(8).populate({
    path: "ticket",
    populate: { path: "attendee", select: "fullName type photoUrl" },
  });
  const recentScans = recentLogs.map((log) => {
    const ticket = log.ticket as unknown as {
      attendee?: { fullName: string; type: string; photoUrl?: string | null } | null;
      holder?: { fullName: string; type: string; photoUrl?: string | null } | null;
    } | null;
    /* checked-in attendees are deleted — their holder snapshot fills in */
    const who = ticket?.attendee ?? ticket?.holder ?? null;
    return {
      at: log.createdAt.toISOString(),
      result: log.result,
      attendee: who
        ? { fullName: who.fullName, type: who.type, photoUrl: who.photoUrl ?? null }
        : null,
    };
  });

  return ok({ stats, recentScans });
}
