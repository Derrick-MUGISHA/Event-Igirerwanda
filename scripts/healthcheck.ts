/* Connectivity health-check for the external services the app depends on.
   Reports, for each integration, whether it is configured and reachable.
   Run: pnpm health  (exits non-zero if any required check fails)

   This answers "is each API connected?" without touching app data:
     - MongoDB  — connects and runs an admin ping
     - Cloudinary — resolves the account via api.ping (no upload)
     - Gmail SMTP — verifies the connection + credentials (no email sent) */
import mongoose from "mongoose";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* fall back to already-exported env vars */
}

import { pingCloudinary } from "../src/lib/cloudinary";
import { verifyMailer } from "../src/lib/mailer";

type Check = {
  name: string;
  /** env vars that must be present for this integration to work */
  requires: string[];
  run: () => Promise<string>;
};

const checks: Check[] = [
  {
    name: "MongoDB",
    requires: ["MONGODB_URI"],
    run: async () => {
      const conn = await mongoose.connect(process.env.MONGODB_URI!, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      });
      const admin = conn.connection.db!.admin();
      await admin.ping();
      const host = conn.connection.host;
      await mongoose.disconnect();
      return `ping ok (${host})`;
    },
  },
  {
    name: "Cloudinary",
    requires: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    run: async () => {
      const res = await pingCloudinary();
      return `status: ${res.status}`;
    },
  },
  {
    name: "Gmail SMTP",
    requires: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
    run: async () => {
      await verifyMailer();
      return `verified as ${process.env.GMAIL_USER}`;
    },
  },
];

function missingEnv(keys: string[]): string[] {
  return keys.filter((k) => !process.env[k]);
}

async function main() {
  console.log("Integration health-check\n");
  let failed = 0;

  for (const check of checks) {
    const missing = missingEnv(check.requires);
    if (missing.length) {
      console.log(`  ✗ ${check.name.padEnd(12)} not configured — missing ${missing.join(", ")}`);
      failed++;
      continue;
    }
    const started = Date.now();
    try {
      const detail = await check.run();
      console.log(`  ✓ ${check.name.padEnd(12)} ${detail} (${Date.now() - started}ms)`);
    } catch (err) {
      console.log(`  ✗ ${check.name.padEnd(12)} ${(err as Error).message} (${Date.now() - started}ms)`);
      failed++;
    }
  }

  console.log(`\n${checks.length - failed}/${checks.length} integrations healthy`);
  await mongoose.disconnect().catch(() => {});
  process.exit(failed ? 1 : 0);
}

main();
