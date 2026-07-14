import { dbConnect } from "@/lib/db";
import { Attendee } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { issueTicket, CapacityError } from "@/lib/tickets";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const attendeeId = await requireAttendee(req);
  if (!attendeeId) return unauthorized();

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return fail("Attach an image as the 'photo' field");
  if (!file.type.startsWith("image/")) return fail("Only image files are accepted");
  if (file.size > MAX_BYTES) return fail("Image must be under 8MB");

  await dbConnect();
  const attendee = await Attendee.findById(attendeeId);
  if (!attendee) return notFound("Registration");
  if (!attendee.emailVerifiedAt) return fail("Verify your email first", 403);

  const buffer = Buffer.from(await file.arrayBuffer());
  attendee.photoUrl = await uploadImage(buffer, "attendees");
  attendee.status = "COMPLETE";
  await attendee.save();

  try {
    const ticket = await issueTicket(attendee);
    return ok({ photoUrl: attendee.photoUrl, ticketCode: ticket.code });
  } catch (err) {
    if (err instanceof CapacityError) return fail(err.message, 409);
    throw err;
  }
}
