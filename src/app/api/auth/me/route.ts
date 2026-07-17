import { dbConnect } from "@/lib/db";
import { Participant } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { ok, unauthorized, notFound } from "@/lib/http";

/* The currently authenticated participant — the identity behind the access
   token. For the full profile + ticket + plus-one, use GET /api/me. */
export async function GET(req: Request) {
  const participantId = await requireAttendee(req);
  if (!participantId) return unauthorized();

  await dbConnect();
  const p = await Participant.findById(participantId);
  if (!p) return notFound("Registration");

  return ok({
    participant: {
      id: p._id,
      event: p.event,
      name: p.name,
      email: p.email,
      phone: p.phone ?? null,
      gender: p.gender ?? null,
      stack: p.stack ?? null,
      profilePicture: p.profilePicture ?? null,
      status: p.status,
    },
  });
}
