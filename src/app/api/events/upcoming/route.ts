import { dbConnect } from "@/lib/db";
import { Event } from "@/models";
import { eventView } from "@/lib/eventView";
import { ok } from "@/lib/http";

/* Public: events that haven't started yet, soonest first. */
export async function GET() {
  await dbConnect();
  const now = new Date();
  const events = await Event.find({
    status: { $ne: "DRAFT" },
    isPublished: true,
    archivedAt: null,
    startTime: { $gt: now },
  }).sort({ startTime: 1 });
  return ok({ events: events.map((e) => eventView(e, now)) });
}
