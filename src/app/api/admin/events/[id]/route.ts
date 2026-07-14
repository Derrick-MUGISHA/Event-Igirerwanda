import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Event, EVENT_CATEGORIES } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { publishContentChange } from "@/lib/scanBus";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

const Body = z
  .object({
    name: z.string().min(2),
    date: z.coerce.date(),
    endDate: z.coerce.date().nullable(),
    venue: z.string(),
    category: z.enum(EVENT_CATEGORIES),
    price: z.string(),
    description: z.string(),
    posterUrl: z.string(),
    isPublic: z.boolean(),
    rules: z.array(z.string()),
    maxParticipants: z.number().int().positive(),
    maxMiniAdmins: z.number().int().positive(),
    status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  })
  .partial();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req, { superOnly: true });
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid event settings");

  const { id } = await ctx.params;
  await dbConnect();
  const event = await Event.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!event) return notFound("Event");
  publishContentChange("events");
  return ok({ event: { id: event._id, name: event.name, status: event.status } });
}
