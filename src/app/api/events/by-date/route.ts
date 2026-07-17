import { dbConnect } from "@/lib/db";
import { Event } from "@/models";
import { eventView } from "@/lib/eventView";
import { ok, fail } from "@/lib/http";

/* Public: events whose start time falls on a given calendar day.
   GET /api/events/by-date?date=YYYY-MM-DD */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail("A `date` query in YYYY-MM-DD format is required");
  }
  const dayStart = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) return fail("Invalid date");
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  await dbConnect();
  const now = new Date();
  const events = await Event.find({
    status: { $ne: "DRAFT" },
    isPublished: true,
    archivedAt: null,
    startTime: { $gte: dayStart, $lte: dayEnd },
  }).sort({ startTime: 1 });
  return ok({ date, events: events.map((e) => eventView(e, now)) });
}
