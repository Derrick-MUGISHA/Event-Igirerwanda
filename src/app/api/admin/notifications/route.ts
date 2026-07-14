import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Notification } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  await dbConnect();
  const [items, unread] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ readAt: null }),
  ]);

  return ok({
    notifications: items.map((n) => ({
      id: n._id,
      kind: n.kind,
      severity: n.severity,
      title: n.title,
      body: n.body,
      read: Boolean(n.readAt),
      at: n.createdAt,
    })),
    unread,
  });
}

const Body = z.object({ ids: z.array(z.string()).optional() });

/* mark as read — specific ids, or everything when ids is omitted */
export async function PATCH(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid request");

  await dbConnect();
  const filter = parsed.data.ids ? { _id: { $in: parsed.data.ids } } : { readAt: null };
  await Notification.updateMany(filter, { readAt: new Date() });
  const unread = await Notification.countDocuments({ readAt: null });
  return ok({ unread });
}
