import { dbConnect } from "@/lib/db";
import { Event } from "@/models";
import { ok } from "@/lib/http";
import type { VenueEvent } from "@/lib/events";

/* Public events feed for the landing page calendar / up-next card.
   Responses are cached in-process for CACHE_TTL_MS and marked cacheable
   downstream, so the DB isn't hit on every visitor. */

const CACHE_TTL_MS = 60_000;

let cache: { at: number; events: VenueEvent[] } | null = null;

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function clockTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

async function loadEvents(): Promise<VenueEvent[]> {
  await dbConnect();
  const events = await Event.find({ status: { $ne: "DRAFT" }, isPublic: true }).sort({
    date: 1,
  });
  return events.map((e) => ({
    id: e.slug,
    title: e.name,
    category: e.category,
    date: isoDay(e.date),
    time: clockTime(e.date),
    endTime: e.endDate ? clockTime(e.endDate) : "",
    space: e.venue,
    price: e.price,
    description: e.description,
    rules: e.rules,
    soldOut: e.status === "CLOSED",
  }));
}

export async function GET() {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    cache = { at: Date.now(), events: await loadEvents() };
  }
  const res = ok({ events: cache.events });
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  );
  return res;
}
