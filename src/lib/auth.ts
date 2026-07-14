import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@/models/Admin";

const encoder = new TextEncoder();

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return encoder.encode(s);
}

export type AuthPayload =
  | { kind: "attendee"; sub: string }
  | { kind: "admin"; sub: string; role: AdminRole }
  | { kind: "org"; sub: string };

export async function signAuthToken(payload: AuthPayload, expiresIn = "7d"): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind === "attendee" || payload.kind === "admin" || payload.kind === "org") {
      return payload as unknown as AuthPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/* QR payloads are their own token kind so an access token can never be
   scanned as a ticket or vice versa. Besides the ticket code, the signed
   payload carries the holder's identity so the gate can greet them even
   before the database answers. */
export type QrIdentity = {
  name?: string;
  type?: string;
  eventName?: string;
};

export async function signQrToken(ticketCode: string, who: QrIdentity = {}): Promise<string> {
  return new SignJWT({
    kind: "qr",
    t: ticketCode,
    ...(who.name ? { n: who.name } : {}),
    ...(who.type ? { y: who.type } : {}),
    ...(who.eventName ? { e: who.eventName } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(secret());
}

export type QrPayload = { code: string } & QrIdentity;

export async function verifyQrToken(token: string): Promise<QrPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "qr" || typeof payload.t !== "string") return null;
    return {
      code: payload.t,
      name: typeof payload.n === "string" ? payload.n : undefined,
      type: typeof payload.y === "string" ? payload.y : undefined,
      eventName: typeof payload.e === "string" ? payload.e : undefined,
    };
  } catch {
    return null;
  }
}

export async function getAuth(req: Request): Promise<AuthPayload | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return verifyAuthToken(header.slice("Bearer ".length));
}

export async function requireAttendee(req: Request): Promise<string | null> {
  const auth = await getAuth(req);
  return auth?.kind === "attendee" ? auth.sub : null;
}

export async function requireAdmin(
  req: Request,
  opts: { superOnly?: boolean } = {}
): Promise<{ id: string; role: AdminRole } | null> {
  const auth = await getAuth(req);
  if (auth?.kind !== "admin") return null;
  if (opts.superOnly && auth.role !== "SUPER_ADMIN") return null;
  return { id: auth.sub, role: auth.role };
}

/* gate scanning is open to admins and partner organizations */
export async function requireScanner(
  req: Request
): Promise<{ adminId?: string; orgId?: string } | null> {
  const auth = await getAuth(req);
  if (auth?.kind === "admin") return { adminId: auth.sub };
  if (auth?.kind === "org") return { orgId: auth.sub };
  return null;
}
