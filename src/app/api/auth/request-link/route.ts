import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Attendee, Event, VerificationToken } from "@/models";
import { sendMagicLinkEmail } from "@/lib/mailer";
import { ok, fail } from "@/lib/http";

const Body = z.object({
  email: z.string().email(),
  /* set when the visitor came through a specific event's terms popup —
     when they're registered for several events, that one wins */
  eventSlug: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("A valid email is required");
  const email = parsed.data.email.toLowerCase();

  await dbConnect();

  /* guests are checked in by admins and don't log in themselves */
  const attendees = await Attendee.find({ email, type: { $in: ["PARTICIPANT", "PLUS_ONE"] } });
  let match: { attendeeId: string; eventName: string; name: string } | null = null;
  for (const a of attendees) {
    const event = await Event.findOne({ _id: a.event, status: "OPEN" });
    if (!event) continue;
    const candidate = { attendeeId: a._id.toString(), eventName: event.name, name: a.fullName };
    if (event.slug === parsed.data.eventSlug) {
      match = candidate;
      break;
    }
    match ??= candidate;
  }

  /* same response whether or not the email is registered, so the endpoint
     can't be used to probe the attendee list */
  if (match) {
    const token = randomBytes(32).toString("hex");
    await VerificationToken.create({
      tokenHash: createHash("sha256").update(token).digest("hex"),
      purpose: "LOGIN",
      email,
      attendee: match.attendeeId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${token}`;
    await sendMagicLinkEmail(email, match.name, url, match.eventName);
  }

  return ok({ message: "If that email is registered, a verification link is on its way." });
}
