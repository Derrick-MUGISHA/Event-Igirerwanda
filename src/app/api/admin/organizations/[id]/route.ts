import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Organization } from "@/models";
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
  const org = await Organization.findByIdAndUpdate(id, { active: parsed.data.active }, { new: true });
  if (!org) return notFound("Organization");
  return ok({ organization: { id: org._id, active: org.active } });
}
