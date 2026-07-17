import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Scanner } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

const Body = z
  .object({
    name: z.string().min(2),
    active: z.boolean(),
    password: z.string().min(8),
  })
  .partial();

/* Admin: edit a scanner (rename, activate/deactivate, reset password). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return notFound("Scanner");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid scanner details");

  await dbConnect();
  const scanner = await Scanner.findById(id);
  if (!scanner) return notFound("Scanner");

  if (parsed.data.name !== undefined) scanner.name = parsed.data.name;
  if (parsed.data.active !== undefined) scanner.active = parsed.data.active;
  if (parsed.data.password) scanner.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await scanner.save();

  return ok({
    scanner: { id: scanner._id, name: scanner.name, email: scanner.email, active: scanner.active },
  });
}

/* Admin: delete a scanner account. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return notFound("Scanner");

  await dbConnect();
  const res = await Scanner.deleteOne({ _id: id });
  if (res.deletedCount === 0) return notFound("Scanner");
  return ok({ deleted: true });
}
