import { describe, it, expect, afterAll } from "vitest";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { pingCloudinary } from "@/lib/cloudinary";
import { verifyMailer } from "@/lib/mailer";

/* Live connectivity checks for every external service the app talks to.
   These mirror `pnpm health` but as assertions, so a broken/misconfigured
   integration fails the test run. They hit the real Atlas cluster, real
   Cloudinary account, and real Gmail SMTP — no data is written. */

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
});

describe("external integrations", () => {
  it("MongoDB (Atlas) connects and responds to ping", async () => {
    const conn = await dbConnect();
    const res = await conn.connection.db!.admin().ping();
    expect(res.ok).toBe(1);
  });

  it("Cloudinary account is reachable", async () => {
    const res = await pingCloudinary();
    expect(res.status).toBe("ok");
  });

  it("Gmail SMTP verifies credentials", async () => {
    await expect(verifyMailer()).resolves.toBe(true);
  });
});
