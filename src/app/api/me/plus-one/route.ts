import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, VerificationToken, GENDERS, RELATIONSHIPS } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/mailer";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

/* the plus-one rides on the participant's registration — only their
   email, gender and connection to the inviter are collected; the name
   starts as "Guest of <participant>" and they can set it after verifying */
const Body = z.object({
  /* the participant can fill the guest's name directly; when they send an
     invite link instead, the guest names themselves later */
  fullName: z.string().min(2).optional(),
  email: z.string().email(),
  gender: z.enum(GENDERS),
  relationship: z.enum(RELATIONSHIPS),
});

/* participant fills the plus-one's details directly; the plus-one then
   receives a magic link to verify their email and add a photo */
export async function POST(req: Request) {
  const attendeeId = await requireAttendee(req);
  if (!attendeeId) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("A valid email, gender and relationship are required");

  await dbConnect();
  const participant = await Attendee.findById(attendeeId);
  if (!participant) return notFound("Registration");
  if (participant.type !== "PARTICIPANT") return fail("Only participants can add a plus-one", 403);

  const email = parsed.data.email.toLowerCase();
  if (email === participant.email) return fail("Your plus-one needs their own email address");

  const existing = await Attendee.findOne({ linkedParticipant: participant._id });
  if (existing) return fail("You already have a plus-one", 409);

  const event = await Event.findOne({ _id: participant.event, status: "OPEN" });
  if (!event) return fail("Registration for this event is closed", 409);

  let plusOne;
  try {
    plusOne = await Attendee.create({
      event: participant.event,
      type: "PLUS_ONE",
      fullName: parsed.data.fullName ?? `Guest of ${participant.fullName}`,
      email,
      gender: parsed.data.gender,
      relationship: parsed.data.relationship,
      linkedParticipant: participant._id,
      status: "PENDING",
    });
  } catch (err: unknown) {
    /* unique indexes: (event,email) or one-plus-one-per-participant */
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("That email is already registered for this event", 409);
    }
    throw err;
  }

  const token = randomBytes(32).toString("hex");
  await VerificationToken.create({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    purpose: "LOGIN",
    email,
    attendee: plusOne._id,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  });
  await sendMagicLinkEmail(
    email,
    plusOne.fullName,
    `${process.env.NEXT_PUBLIC_APP_URL}/verify/${token}`,
    event.name
  );

  return ok({ plusOne: { id: plusOne._id, fullName: plusOne.fullName, email, status: plusOne.status } }, 201);
}
