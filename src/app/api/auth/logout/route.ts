import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import { REFRESH_COOKIE, revokeRefreshToken, clearRefreshCookie } from "@/lib/session";
import { ok } from "@/lib/http";

/* End the participant session: revoke the refresh token and clear the cookie.
   The short-lived access token simply expires on its own. */
export async function POST() {
  const raw = (await cookies()).get(REFRESH_COOKIE)?.value;
  await dbConnect();
  await revokeRefreshToken(raw);
  return clearRefreshCookie(ok({ message: "Signed out" }));
}
