import { dbConnect } from "@/lib/db";
import { eventView, findPublicEvent } from "@/lib/eventView";
import { ok, notFound } from "@/lib/http";

/* Public: a single published event by id or slug. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await dbConnect();
  const event = await findPublicEvent(id);
  if (!event) return notFound("Event");
  return ok({ event: eventView(event) });
}
