import { createHash, randomBytes } from "crypto";
import type { NextResponse } from "next/server";
import { RefreshToken } from "@/models";

/* Rotating refresh-token sessions for participants. The raw token only ever
   lives in the httpOnly cookie; the DB stores its hash. This module is
   server-only (touches Mongo) — keep it out of edge/middleware. */

export const REFRESH_COOKIE = "iems_refresh";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: maxAgeSeconds,
});

/* mint a fresh refresh token for a participant and persist its hash */
export async function issueRefreshToken(participantId: string): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await RefreshToken.create({
    tokenHash: hash(raw),
    participant: participantId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return raw;
}

/* Validate + rotate: consumes the presented token and issues a replacement.
   Returns the participant id + new raw token, or null when the token is
   missing / already used / expired. Reuse of a spent token revokes the whole
   chain for that participant (basic reuse-detection). */
export async function rotateRefreshToken(
  raw: string | undefined
): Promise<{ participantId: string; token: string } | null> {
  if (!raw) return null;
  const tokenHash = hash(raw);
  const current = await RefreshToken.findOne({ tokenHash });
  if (!current || current.expiresAt < new Date()) return null;

  if (current.usedAt) {
    /* token already rotated — likely stolen. Nuke every live token. */
    await RefreshToken.updateMany(
      { participant: current.participant, usedAt: null },
      { usedAt: new Date() }
    );
    return null;
  }

  const participantId = current.participant.toString();
  const nextRaw = randomBytes(32).toString("hex");
  await RefreshToken.create({
    tokenHash: hash(nextRaw),
    participant: participantId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  current.usedAt = new Date();
  current.replacedBy = hash(nextRaw);
  await current.save();

  return { participantId, token: nextRaw };
}

/* invalidate a single token (logout) */
export async function revokeRefreshToken(raw: string | undefined): Promise<void> {
  if (!raw) return;
  await RefreshToken.updateOne({ tokenHash: hash(raw), usedAt: null }, { usedAt: new Date() });
}

export function setRefreshCookie(res: NextResponse, raw: string): NextResponse {
  res.cookies.set(REFRESH_COOKIE, raw, cookieOptions(REFRESH_TTL_MS / 1000));
  return res;
}

export function clearRefreshCookie(res: NextResponse): NextResponse {
  res.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
  return res;
}
