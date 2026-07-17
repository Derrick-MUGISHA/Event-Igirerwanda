import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import { Participant } from "@/models";
import { signParticipantAccessToken } from "@/lib/auth";
import {
  REFRESH_COOKIE,
  rotateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} from "@/lib/session";
import { ok, fail } from "@/lib/http";

/* Exchange the httpOnly refresh cookie for a new access token, rotating the
   refresh token in the process. */
export async function POST() {
  const raw = (await cookies()).get(REFRESH_COOKIE)?.value;

  await dbConnect();
  const rotated = await rotateRefreshToken(raw);
  if (!rotated) {
    const res = fail("Your session has expired. Please sign in again.", 401);
    return clearRefreshCookie(res);
  }

  /* the participant may have been deleted (e.g. checked in at the gate) */
  const participant = await Participant.findById(rotated.participantId);
  if (!participant) {
    const res = fail("Registration not found", 404);
    return clearRefreshCookie(res);
  }

  const accessToken = await signParticipantAccessToken(rotated.participantId);
  const res = ok({ accessToken, expiresIn: 900 });
  return setRefreshCookie(res, rotated.token);
}
