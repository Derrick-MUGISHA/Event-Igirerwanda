import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Event, EVENT_CATEGORIES } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  await dbConnect();
  const events = await Event.find().sort({ date: -1 });
  return ok({
    events: events.map((e) => ({
      id: e._id,
      name: e.name,
      slug: e.slug,
      date: e.date,
      endDate: e.endDate,
      venue: e.venue,
      category: e.category,
      price: e.price,
      description: e.description,
      isPublic: e.isPublic,
      rules: e.rules,
      maxParticipants: e.maxParticipants,
      maxMiniAdmins: e.maxMiniAdmins,
      status: e.status,
    })),
  });
}

const Body = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  date: z.coerce.date(),
  endDate: z.coerce.date().nullish(),
  venue: z.string().default(""),
  category: z.enum(EVENT_CATEGORIES).default("Mentorship"),
  price: z.string().default("Free"),
  description: z.string().default(""),
  isPublic: z.boolean().default(true),
  rules: z.array(z.string()).default([]),
  maxParticipants: z.number().int().positive().default(200),
  maxMiniAdmins: z.number().int().positive().default(10),
});

export async function POST(req: Request) {
  const admin = await requireAdmin(req, { superOnly: true });
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid event details");

  await dbConnect();
  try {
    const event = await Event.create({ ...parsed.data, createdBy: admin.id });
    return ok({ event: { id: event._id, name: event.name, slug: event.slug } }, 201);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("An event with that slug already exists", 409);
    }
    throw err;
  }
}
