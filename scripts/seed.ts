/* Seeds the super admin, the (private) graduation event, and the real
   participants parsed from the cohort attendance CSV exports.
   Run: pnpm seed  (idempotent — safe to re-run)

   CSV locations default to ~/Downloads and can be overridden:
     FRONTEND_CSV=/path/to/frontend.csv BACKEND_CSV=/path/to/backend.csv pnpm seed */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* fall back to already-exported env vars */
}

import { Admin, Attendee, Event } from "../src/models";

const FRONTEND_CSV =
  process.env.FRONTEND_CSV ??
  join(homedir(), "Downloads", "Cohort #16 DSE 4 Frontend Class Master Database - Attendance.csv");
const BACKEND_CSV =
  process.env.BACKEND_CSV ??
  join(homedir(), "Downloads", "Cohort #16 DSE 4 Backend Class Master Database - Attendance.csv");

/* the developer's test accounts — both deliver to the same inbox */
const TEST_ROWS: Record<"FRONTEND" | "BACKEND", SeedRow> = {
  FRONTEND: { name: "Derrick Mugisha (Test)", email: "derrickmugisha169@gmail.com", phone: "780000001" },
  BACKEND: { name: "Derrick Mugisha (Backend Test)", email: "derrickmugisha169+backend@gmail.com", phone: "780000002" },
};

type SeedRow = { name: string; email: string; phone: string };

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.]+$/;
const PHONE_RE = /^\+?\d{9,12}$/;

/* minimal CSV line splitter that respects double-quoted fields */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/* the sheets are messy (swapped headers, stray rows, pasted terminal
   output) — a row only counts when it carries a valid email address */
function parseParticipants(path: string): SeedRow[] {
  const rows: SeedRow[] = [];
  const seen = new Set<string>();
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const cells = splitCsvLine(line)
      .slice(0, 6)
      .map((c) => c.trim());
    const email = cells.find((c) => EMAIL_RE.test(c))?.toLowerCase();
    if (!email || seen.has(email)) continue;
    const phone = cells.find((c) => PHONE_RE.test(c.replace(/\s/g, ""))) ?? "";
    const name = cells[2] ?? "";
    if (!name) continue;
    seen.add(email);
    rows.push({ name: tidyName(name), email, phone: phone.replace(/\s/g, "") });
  }
  return rows;
}

/* "elyse ISHIMWE " -> "Elyse Ishimwe" */
function tidyName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").replace(/^250/, "");
  return digits ? `+250${digits}` : "";
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);

  /* super admin from env */
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL ?? "admin@igirerwanda.org").toLowerCase();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("SUPER_ADMIN_PASSWORD is not set");
  const superAdmin = await Admin.findOneAndUpdate(
    { email: adminEmail },
    {
      $setOnInsert: {
        name: process.env.SUPER_ADMIN_NAME ?? "Super Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "SUPER_ADMIN",
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  console.log(`super admin: ${superAdmin.email}`);

  /* the graduation — participants only, so it stays off the public calendar */
  const event = await Event.findOneAndUpdate(
    { slug: "shecancode-graduation" },
    {
      $setOnInsert: {
        name: "SheCanCODE Graduation",
        slug: "shecancode-graduation",
        date: new Date("2026-08-09T17:00:00"),
        endDate: new Date("2026-08-09T20:00:00"),
        venue: "Kigali",
        category: "SheCanCODE",
        price: "Invitation only",
        description:
          "Cohort #16 graduation ceremony — project showcases, certificates, and stories from the cohort.",
        isPublic: false,
        rules: ["Bring a valid ID", "Doors open one hour before start"],
        maxParticipants: 200,
        maxMiniAdmins: 10,
        status: "OPEN",
        createdBy: superAdmin._id,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  console.log(`event: ${event.name} (${event.slug}, ${event.isPublic ? "public" : "private"})`);

  /* a public event with demanding entry rules — good for exercising the
     whole flow: calendar → terms popup → verify → pass → plus-one */
  const womenTech = await Event.findOneAndUpdate(
    { slug: "women-in-tech-night" },
    {
      $setOnInsert: {
        name: "Women in Tech Night",
        slug: "women-in-tech-night",
        date: new Date("2026-07-18T18:00:00"),
        endDate: new Date("2026-07-18T21:00:00"),
        venue: "Main Hall, Kigali",
        category: "SheCanCODE",
        price: "Free entry",
        description:
          "An evening of lightning talks, live demos, and mentoring circles with women building Rwanda's tech scene.",
        isPublic: true,
        rules: [
          "Bring a valid government ID — names are checked letter by letter at the gate",
          "Dress code: wear at least one item that is orange, white, or green",
          "Doors open at 5:15 PM and seal shut at 6:00 PM sharp — no late entry, no exceptions",
          "Phones on silent, but charged: everyone demos one app they love at their table",
          "Bring one tech question nobody at your table can answer",
          "Your pass is personal — the QR code is scanned once and matched to your photo",
          "Every guest must name one woman in tech who inspires them before entering",
        ],
        maxParticipants: 150,
        maxMiniAdmins: 5,
        status: "OPEN",
        createdBy: superAdmin._id,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  console.log(`event: ${womenTech.name} (${womenTech.slug}, ${womenTech.isPublic ? "public" : "private"})`);

  /* test accounts join the public event too, so the full journey can be
     tested end to end from the public calendar */
  for (const row of Object.values(TEST_ROWS)) {
    await Attendee.updateOne(
      { event: womenTech._id, email: row.email },
      {
        $setOnInsert: {
          event: womenTech._id,
          type: "PARTICIPANT",
          fullName: row.name,
          email: row.email,
          phone: normalizePhone(row.phone),
          cohort: null,
          status: "PENDING",
        },
      },
      { upsert: true }
    );
  }

  let created = 0;
  for (const [cohort, csvPath] of [
    ["FRONTEND", FRONTEND_CSV],
    ["BACKEND", BACKEND_CSV],
  ] as const) {
    const rows = [TEST_ROWS[cohort], ...parseParticipants(csvPath)];
    console.log(`${cohort}: ${rows.length - 1} participants parsed from CSV (+1 test account)`);
    for (const { name, email, phone } of rows) {
      const res = await Attendee.updateOne(
        { event: event._id, email },
        {
          $setOnInsert: {
            event: event._id,
            type: "PARTICIPANT",
            fullName: name,
            email,
            phone: normalizePhone(phone),
            cohort,
            status: "PENDING",
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) created++;
    }
  }

  const counts = await Attendee.aggregate([
    { $match: { event: event._id, type: "PARTICIPANT" } },
    { $group: { _id: "$cohort", n: { $sum: 1 } } },
  ]);
  console.log(`participants created this run: ${created}`);
  for (const c of counts) console.log(`  ${c._id}: ${c.n}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
