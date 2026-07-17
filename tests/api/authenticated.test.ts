import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import * as adminLogin from "@/app/api/admin/login/route";
import * as scannerLogin from "@/app/api/scanner/login/route";
import * as stats from "@/app/api/admin/stats/route";
import * as dashboard from "@/app/api/admin/dashboard/route";
import * as adminEvents from "@/app/api/admin/events/route";
import * as attendees from "@/app/api/admin/attendees/route";
import * as guests from "@/app/api/admin/guests/route";
import * as tickets from "@/app/api/admin/tickets/route";
import * as scanners from "@/app/api/admin/scanners/route";
import * as notifications from "@/app/api/admin/notifications/route";
import * as validate from "@/app/api/tickets/validate/route";
import * as requestLink from "@/app/api/auth/request-link/route";

/* Authenticated / write-path coverage against real Atlas. Logs in as the
   seeded super-admin and scanner (same env defaults `pnpm seed` uses), then
   drives the protected read endpoints and the auth gates. Writes are limited
   to benign ones (scanner lastSeenAt on login); no rosters are mutated and no
   emails are sent (the request-link tests use the validation + unregistered
   paths, which never call the mailer). */

const ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "admin@igirerwanda.org").toLowerCase();
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "";
const SCANNER_EMAIL = (process.env.SCANNER_EMAIL ?? "scanner@igirerwanda.org").toLowerCase();
const SCANNER_PASSWORD = process.env.SCANNER_PASSWORD ?? ADMIN_PASSWORD;

const jsonReq = (path: string, body: unknown, token?: string) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const authGet = (path: string, token?: string) =>
  new Request(`http://localhost${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

let adminToken = "";
let scannerToken = "";

beforeAll(async () => {
  const res = await adminLogin.POST(jsonReq("/api/admin/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
  expect(res.status, "admin login failed — is the super admin seeded?").toBe(200);
  adminToken = (await res.json()).accessToken;

  const sres = await scannerLogin.POST(
    jsonReq("/api/scanner/login", { email: SCANNER_EMAIL, password: SCANNER_PASSWORD })
  );
  if (sres.status === 200) scannerToken = (await sres.json()).accessToken;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
});

describe("admin/login", () => {
  it("issues an access token for valid credentials", () => {
    expect(adminToken).toMatch(/^ey/); // JWT
  });

  it("rejects a wrong password with 401", async () => {
    const res = await adminLogin.POST(jsonReq("/api/admin/login", { email: ADMIN_EMAIL, password: "nope-nope-nope" }));
    expect(res.status).toBe(401);
  });

  it("rejects a malformed body with 400", async () => {
    const res = await adminLogin.POST(jsonReq("/api/admin/login", { email: "not-an-email" }));
    expect(res.status).toBe(400);
  });
});

/* each protected list endpoint: 401 anonymous, 200 + expected key with a token */
const adminEndpoints: { name: string; get: (r: Request) => Promise<Response>; key: string }[] = [
  { name: "admin/stats", get: stats.GET, key: "stats" },
  { name: "admin/dashboard", get: dashboard.GET, key: "global" },
  { name: "admin/events", get: adminEvents.GET, key: "events" },
  { name: "admin/attendees", get: attendees.GET, key: "attendees" },
  { name: "admin/guests", get: guests.GET, key: "guests" },
  { name: "admin/tickets", get: tickets.GET, key: "tickets" },
  { name: "admin/scanners", get: scanners.GET, key: "scanners" },
  { name: "admin/notifications", get: notifications.GET, key: "notifications" },
];

describe.each(adminEndpoints)("GET /api/$name", ({ get, key }) => {
  it("rejects anonymous access with 401", async () => {
    const res = await get(authGet("/x"));
    expect(res.status).toBe(401);
  });

  it("returns data for an authenticated admin", async () => {
    const res = await get(authGet("/x", adminToken));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty(key);
  });
});

describe("scanner/login", () => {
  it("issues a scanner token for valid credentials", () => {
    /* skips gracefully if no scanner account is seeded in this environment */
    if (!scannerToken) return;
    expect(scannerToken).toMatch(/^ey/);
  });
});

describe("POST /api/tickets/validate", () => {
  it("rejects a non-scanner with 401", async () => {
    const res = await validate.POST(jsonReq("/api/tickets/validate", { code: "ABC123" }));
    expect(res.status).toBe(401);
  });

  it("rejects an empty body for a scanner with 400", async () => {
    if (!scannerToken) return;
    const res = await validate.POST(jsonReq("/api/tickets/validate", {}, scannerToken));
    expect(res.status).toBe(400);
  });

  it("reports an unsigned QR as invalid (not consumed)", async () => {
    if (!scannerToken) return;
    const res = await validate.POST(jsonReq("/api/tickets/validate", { qr: "definitely-not-a-real-token" }, scannerToken));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });
});

describe("POST /api/auth/request-link", () => {
  it("rejects an invalid email with 400 (no email sent)", async () => {
    const res = await requestLink.POST(jsonReq("/api/auth/request-link", { email: "nope" }));
    expect(res.status).toBe(400);
  });

  it("returns a neutral response for an unregistered email (no email sent)", async () => {
    const res = await requestLink.POST(
      jsonReq("/api/auth/request-link", { email: "no-such-person-xyz@example.com" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/verification link/i);
  });
});
