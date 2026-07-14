import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Admin, Event } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const admin = await requireAdmin(req, { superOnly: true });
  if (!admin) return unauthorized();

  await dbConnect();
  const admins = await Admin.find().sort({ createdAt: 1 });
  return ok({
    admins: admins.map((a) => ({
      id: a._id,
      name: a.name,
      email: a.email,
      role: a.role,
      active: a.active,
    })),
  });
}

const Body = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const admin = await requireAdmin(req, { superOnly: true });
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Name, valid email and a password of 8+ characters are required");

  await dbConnect();

  /* the mini-admin cap is an event setting; enforce against the most
     recently created open event */
  const event = await Event.findOne({ status: "OPEN" }).sort({ createdAt: -1 });
  if (event) {
    const miniCount = await Admin.countDocuments({ role: "MINI_ADMIN", active: true });
    if (miniCount >= event.maxMiniAdmins) {
      return fail(`The mini-admin limit (${event.maxMiniAdmins}) has been reached`, 409);
    }
  }

  try {
    const created = await Admin.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: "MINI_ADMIN",
      createdBy: admin.id,
    });
    return ok({ admin: { id: created._id, name: created.name, email: created.email } }, 201);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("An admin with that email already exists", 409);
    }
    throw err;
  }
}
