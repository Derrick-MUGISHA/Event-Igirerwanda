import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Scanner } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/http";

/* Admin: list scanner accounts. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  await dbConnect();
  const scanners = await Scanner.find().sort({ createdAt: 1 });
  return ok({
    scanners: scanners.map((s) => ({
      id: s._id,
      name: s.name,
      email: s.email,
      active: s.active,
      lastSeenAt: s.lastSeenAt ?? null,
      createdAt: s.createdAt,
    })),
  });
}

const Body = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

/* Admin: create a scanner account. */
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Name, valid email and a password of 8+ characters are required");

  await dbConnect();
  try {
    const scanner = await Scanner.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      createdBy: admin.id,
    });
    return ok(
      { scanner: { id: scanner._id, name: scanner.name, email: scanner.email } },
      201
    );
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("A scanner with that email already exists", 409);
    }
    throw err;
  }
}
