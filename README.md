# IEMS — Igire Rwanda Event Management System

Event registration, ticketing, and QR check-in platform for Igire Rwanda Organization, built with Next.js 16 (App Router, React 19), MongoDB/Mongoose, Nodemailer (Gmail), and Cloudinary.

## How it works

- **Participants** are pre-registered (name, email, phone, stack/cohort). They enter their email at `/verify`, receive a magic link (30-min, single-use), verify, add a photo, and get a QR-code ticket by email and on their `/dashboard`. Sessions use a short-lived access token plus a rotating httpOnly refresh cookie.
- **Plus-ones** — each participant may bring exactly one. The participant either fills the plus-one's details on the dashboard, or shares an invite link (`/plus-one/<token>`, 72h) for the guest to complete themselves. The plus-one gets their own pass after verifying and adding a photo.
- **Guests** are added directly by an admin (VIP, speaker, sponsor, media, partner, general) and get a ticket immediately.
- **Admins** sign in with email + password at `/admin`. There is a single admin role (`ADMIN`). Admins manage events, attendees, guests, tickets, scanner accounts, and view the live dashboard and notifications.
- **Gate scanners** are dedicated accounts that sign in with email + password and check tickets in at `/scan`. Every ticket admits once; the check-in is an atomic claim and every scan is logged. Admins can also scan.

## Roles at a glance

| Role | Auth | Where | Token |
| --- | --- | --- | --- |
| Participant / plus-one | Passwordless magic link | `/verify` → `/dashboard` | 15-min access token in memory + rotating refresh cookie |
| Admin | Email + password | `/admin` | JWT (bearer) in localStorage |
| Scanner | Email + password | `/scan` | JWT (bearer) in localStorage |

## Setup

1. Copy `.env.example` to `.env.local` and fill in **every** required value (the seed refuses to run with unset or `change-me` secrets):
   - `MONGODB_URI` — e.g. `mongodb://localhost:27017/iems`
   - `JWT_SECRET` — `openssl rand -hex 32` (≥32 chars, required)
   - `GMAIL_USER` / `GMAIL_APP_PASSWORD` — a Gmail address and [app password](https://myaccount.google.com/apppasswords)
   - `CLOUDINARY_*` — from your Cloudinary dashboard
   - `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — admin bootstrap credentials (≥8 chars)
   - `SCANNER_EMAIL` / `SCANNER_PASSWORD` — gate account (≥8 chars; **must differ** from the admin password)
2. Start MongoDB, e.g. `podman run -d --name iems-mongo -p 27017:27017 docker.io/library/mongo:7`
3. Install and seed:

```bash
pnpm install
pnpm seed     # super admin, gate scanner, the seeded event, and pre-registered participants
pnpm dev
```

Scripts: `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm lint` · `pnpm test` · `pnpm seed` · `pnpm health`.

## Deployment note (important)

IEMS is currently a **single-instance** application. The live scan feed, admin notifications, the auth rate limiter, and the public-events cache all live in-process (`globalThis`). Running more than one instance behind a load balancer will drop live updates and weaken rate limiting. See `docs/` for the path to horizontal scale (Redis-backed pub/sub + shared cache/limiter).

## Key paths

| Path | Purpose |
| --- | --- |
| `src/models/` | Mongoose schemas: `Admin`, `Event`, `Participant`, `Guest`, `Ticket`, `Scanner`, `ScanLog`, `Notification`, `VerificationToken`, `RefreshToken`, `Counter`, `HealthSample` |
| `src/app/api/` | Route handlers (`auth`, `me`, `plus-one`, `scan`, `scanner`, `tickets`, `events`, `admin/*`) |
| `src/lib/` | db connection, JWT auth, session/refresh tokens, mailer, Cloudinary, QR, ticket issuance, SSE bus |
| `src/proxy.ts` | Edge rate limiter for auth/login endpoints |
| `scripts/seed.ts` | Idempotent seed (participants parsed from cohort CSVs) |
| `/verify`, `/dashboard`, `/ticket/[code]` | Participant flow |
| `/admin`, `/admin/*` | Admin panel |
| `/scan` | Gate check-in |

## Review & release docs

A full production-readiness assessment lives in [`docs/`](docs/README.md): system assessment, security, performance, UI/UX, technical debt, the release-readiness checklist, the changelog, and the post-v1 roadmap.
