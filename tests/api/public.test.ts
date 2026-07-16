import { describe, it, expect, afterAll } from "vitest";
import mongoose from "mongoose";
import * as events from "@/app/api/events/route";
import * as upcoming from "@/app/api/events/upcoming/route";
import * as byDate from "@/app/api/events/by-date/route";
import * as authMe from "@/app/api/auth/me/route";
import * as docs from "@/app/api/docs/route";

/* Functional tests for the public / unauthenticated API surface, run against
   the real Atlas data. Read-only: they assert shape and status codes and the
   auth gates on protected endpoints. No writes. */

const req = (path: string) => new Request(`http://localhost${path}`);

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
});

describe("GET /api/events", () => {
  it("returns a published events feed", async () => {
    const res = await events.GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events ?? body)).toBe(true);
  });
});

describe("GET /api/events/upcoming", () => {
  it("returns upcoming events sorted soonest-first", async () => {
    const res = await upcoming.GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
    const times = body.events.map((e: { startTime?: string }) => e.startTime).filter(Boolean);
    const sorted = [...times].sort();
    expect(times).toEqual(sorted);
  });
});

describe("GET /api/events/by-date", () => {
  it("rejects a missing/invalid date with 400", async () => {
    const res = await byDate.GET(req("/api/events/by-date"));
    expect(res.status).toBe(400);
  });

  it("accepts a valid YYYY-MM-DD date", async () => {
    const res = await byDate.GET(req("/api/events/by-date?date=2026-07-18"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.date).toBe("2026-07-18");
    expect(Array.isArray(body.events)).toBe(true);
  });
});

describe("auth gates reject anonymous requests", () => {
  it("GET /api/auth/me → 401 without a token", async () => {
    const res = await authMe.GET(req("/api/auth/me"));
    expect(res.status).toBe(401);
  });

  it("GET /api/docs → 401 without admin", async () => {
    const res = await docs.GET(req("/api/docs"));
    expect(res.status).toBe(401);
  });
});
