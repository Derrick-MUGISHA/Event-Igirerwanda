import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, VerificationToken, GENDERS, RELATIONSHIPS } from "@/models";
import { sendMagicLinkEmail } from "@/lib/mailer";
import { ok, fail } from "@/lib/http";

type Ctx = { params: Promise<{ token: string }> };

async function findInvite(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return VerificationToken.findOne({
    tokenHash,
    purpose: "PLUS_ONE_INVITE",
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  await dbConnect();
  const invite = await findInvite(token);
  if (!invite) return fail("This invite link is invalid or has expired", 404);

  const participant = await Attendee.findById(invite.attendee);
  const event = participant && (await Event.findById(participant.event));
  if (!participant || !event) return fail("This invite link is invalid or has expired", 404);
  if (await Attendee.findOne({ linkedParticipant: participant._id })) {
    return fail("This participant already has a plus-one", 409);
  }

  return ok({
    participantName: participant.fullName,
    eventName: event.name,
    email: invite.email ?? null,
  });
}

/* the plus-one is a child of the inviting participant's registration —
   only email, gender and their connection to the inviter are asked for */
const Body = z.object({
  email: z.string().email(),
  gender: z.enum(GENDERS),
  relationship: z.enum(RELATIONSHIPS),
});

export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("A valid email, gender and relationship are required");

  await dbConnect();
  const invite = await findInvite(token);
  if (!invite) return fail("This invite link is invalid or has expired", 404);

  const participant = await Attendee.findById(invite.attendee);
  const event = participant && (await Event.findOne({ _id: participant.event, status: "OPEN" }));
  if (!participant || !event) return fail("Registration for this event is closed", 409);

  const email = parsed.data.email.toLowerCase();
  let plusOne;
  try {
    plusOne = await Attendee.create({
      event: participant.event,
      type: "PLUS_ONE",
      fullName: `Guest of ${participant.fullName}`,
      email,
      gender: parsed.data.gender,
      relationship: parsed.data.relationship,
      linkedParticipant: participant._id,
      status: "PENDING",
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("This participant already has a plus-one, or that email is already registered", 409);
    }
    throw err;
  }
  invite.usedAt = new Date();
  await invite.save();

  const loginToken = randomBytes(32).toString("hex");
  await VerificationToken.create({
    tokenHash: createHash("sha256").update(loginToken).digest("hex"),
    purpose: "LOGIN",
    email,
    attendee: plusOne._id,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  });
  await sendMagicLinkEmail(
    email,
    plusOne.fullName,
    `${process.env.NEXT_PUBLIC_APP_URL}/verify/${loginToken}`,
    event.name
  );

  return ok({ message: "Check your inbox to verify your email and get your ticket." }, 201);
}
