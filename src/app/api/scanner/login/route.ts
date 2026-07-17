import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Scanner } from "@/models";
import { signAuthToken } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Email and password are required");

  await dbConnect();
  const scanner = await Scanner.findOne({ email: parsed.data.email.toLowerCase(), active: true });
  if (!scanner || !(await bcrypt.compare(parsed.data.password, scanner.passwordHash))) {
    return fail("Invalid email or password", 401);
  }

  scanner.lastSeenAt = new Date();
  await scanner.save();

  const accessToken = await signAuthToken({ kind: "scanner", sub: scanner._id.toString() }, "1d");
  return ok({ accessToken, scanner: { name: scanner.name, email: scanner.email } });
}
