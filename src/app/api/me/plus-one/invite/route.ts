import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, VerificationToken } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { sendPlusOneInviteEmail } from "@/lib/mailer";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

const Body = z.object({ email: z.string().email().optional() });

/* alternative path: generate a link the plus-one uses to fill their own
   details; optionally emailed straight to them */
export async function POST(req: Request) {
  const attendeeId = await requireAttendee(req);
  if (!attendeeId) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid email");

  await dbConnect();
  const participant = await Attendee.findById(attendeeId);
  if (!participant) return notFound("Registration");
  if (participant.type !== "PARTICIPANT") return fail("Only participants can add a plus-one", 403);

  const existing = await Attendee.findOne({ linkedParticipant: participant._id });
  if (existing) return fail("You already have a plus-one", 409);

  const event = await Event.findOne({ _id: participant.event, status: "OPEN" });
  if (!event) return fail("Registration for this event is closed", 409);

  const token = randomBytes(32).toString("hex");
  await VerificationToken.create({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    purpose: "PLUS_ONE_INVITE",
    email: parsed.data.email?.toLowerCase(),
    attendee: participant._id,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/plus-one/${token}`;
  if (parsed.data.email) {
    await sendPlusOneInviteEmail(parsed.data.email, participant.fullName, inviteUrl, event.name);
  }
  return ok({ inviteUrl });
}
