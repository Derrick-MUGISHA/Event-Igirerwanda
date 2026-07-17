import { dbConnect } from "@/lib/db";
import { capacityView, findPublicEvent } from "@/lib/eventView";
import { ok, notFound } from "@/lib/http";

/* Public: live capacity + available slots for an event. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await dbConnect();
  const event = await findPublicEvent(id);
  if (!event) return notFound("Event");
  return ok({ eventId: event._id, ...capacityView(event) });
}
