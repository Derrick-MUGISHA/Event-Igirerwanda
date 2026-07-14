import { createHash } from "crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, VerificationToken } from "@/models";
import { signAuthToken } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

const Body = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Token is required");

  await dbConnect();
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  /* atomically claim the token so a double-click can't redeem it twice */
  const vt = await VerificationToken.findOneAndUpdate(
    { tokenHash, purpose: "LOGIN", usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() }
  );
  if (!vt) return fail("This link is invalid or has expired. Request a new one.", 400);

  const attendee = await Attendee.findById(vt.attendee);
  if (!attendee) return fail("Registration not found", 404);

  if (!attendee.emailVerifiedAt) {
    attendee.emailVerifiedAt = new Date();
    if (attendee.status === "PENDING") attendee.status = "VERIFIED";
    await attendee.save();
  }

  const accessToken = await signAuthToken({ kind: "attendee", sub: attendee._id.toString() });
  return ok({ accessToken });
}
