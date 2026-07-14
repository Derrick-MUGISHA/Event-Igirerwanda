import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Admin } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

const Body = z.object({ active: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req, { superOnly: true });
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("'active' boolean is required");

  const { id } = await ctx.params;
  await dbConnect();
  const target = await Admin.findById(id);
  if (!target) return notFound("Admin");
  if (target.role === "SUPER_ADMIN") return fail("The super admin cannot be deactivated", 403);

  target.active = parsed.data.active;
  await target.save();
  return ok({ admin: { id: target._id, active: target.active } });
}
