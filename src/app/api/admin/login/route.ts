import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Admin } from "@/models";
import { signAuthToken } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Email and password are required");

  await dbConnect();
  const admin = await Admin.findOne({ email: parsed.data.email.toLowerCase(), active: true });
  if (!admin || !(await bcrypt.compare(parsed.data.password, admin.passwordHash))) {
    return fail("Invalid email or password", 401);
  }

  /* 12h covers a working event day; deactivation revokes sooner via the
     per-request active-check in requireAdmin (see lib/auth.ts) */
  const accessToken = await signAuthToken(
    { kind: "admin", sub: admin._id.toString(), role: admin.role },
    "12h"
  );
  return ok({ accessToken, admin: { name: admin.name, email: admin.email, role: admin.role } });
}
