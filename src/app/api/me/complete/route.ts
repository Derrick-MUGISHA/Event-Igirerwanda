import { dbConnect } from "@/lib/db";
import { Participant } from "@/models";
import { requireAttendee } from "@/lib/auth";
import { issueTicket, CapacityError } from "@/lib/tickets";
import { ok, fail, unauthorized, notFound } from "@/lib/http";

/* Mandatory profile fields that must be present before a ticket is issued. */
const REQUIRED: { key: "name" | "phone" | "gender" | "stack" | "profilePicture"; label: string }[] =
  [
    { key: "name", label: "full name" },
    { key: "phone", label: "phone number" },
    { key: "gender", label: "gender" },
    { key: "stack", label: "stack" },
    { key: "profilePicture", label: "profile photo" },
  ];

/* Finalise registration: verify every mandatory field is filled, then issue
   the ticket. Fields are set via PATCH /api/me and POST /api/me/photo first. */
export async function POST(req: Request) {
  const participantId = await requireAttendee(req);
  if (!participantId) return unauthorized();

  await dbConnect();
  const participant = await Participant.findById(participantId);
  if (!participant) return notFound("Registration");
  if (participant.status === "PENDING") return fail("Verify your email first", 403);

  const missing = REQUIRED.filter((f) => !participant[f.key]).map((f) => f.label);
  if (missing.length > 0) {
    return fail(`Please complete your profile first — missing: ${missing.join(", ")}`, 422);
  }

  try {
    const ticket = await issueTicket({ kind: "Participant", doc: participant });
    return ok({
      status: participant.status,
      ticket: { id: ticket._id, ticketNumber: ticket.ticketNumber, code: ticket.code },
    });
  } catch (err) {
    if (err instanceof CapacityError) return fail(err.message, 409);
    throw err;
  }
}
