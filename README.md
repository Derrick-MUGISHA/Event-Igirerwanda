# IEMS — Igire Rwanda Event Management System

Event registration, ticketing, and QR check-in platform for Igire Rwanda Organization, built with Next.js (App Router), MongoDB/Mongoose, Nodemailer (Gmail), and Cloudinary.

## How it works

- **Participants** are pre-registered (name, email, phone, cohort). They enter their email at `/verify`, receive a magic link, verify, upload a photo, and get a QR-code ticket by email and on their dashboard.
- **Plus-ones** — each participant can bring exactly one. The participant either fills their details or shares an invite link (`/plus-one/<token>`); the plus-one then follows the same verify → photo → ticket flow.
- **Guests** are added directly by an admin and get a ticket immediately.
- **Admins** — the super admin manages events (capacity, venue rules, mini-admin limit), mini admins, and partner organizations at `/admin`. Mini admins manage attendees, add guests, and scan tickets.
- **Partner organizations** sign in with an access key at `/scan` and verify tickets at the entrance. Every ticket admits once; scans are atomic and logged.

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` — e.g. `mongodb://localhost:27017/iems`
   - `JWT_SECRET` — `openssl rand -hex 32`
   - `GMAIL_USER` / `GMAIL_APP_PASSWORD` — a Gmail address and [app password](https://myaccount.google.com/apppasswords)
   - `CLOUDINARY_*` — from your Cloudinary dashboard
   - `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — bootstrap credentials
2. Start MongoDB (e.g. `podman run -d --name iems-mongo -p 27017:27017 docker.io/library/mongo:7`)
3. Install and seed:

```bash
pnpm install
pnpm seed     # creates the super admin, the first event, and the pre-registered participants
pnpm dev
```

## Key paths

| Path | Purpose |
| --- | --- |
| `src/models/` | Mongoose schemas: Admin, Event, Attendee, VerificationToken, Ticket, Organization, ScanLog |
| `src/app/api/` | Route handlers (auth, me, plus-one, scan, admin, org) |
| `src/lib/` | db connection, JWT auth, mailer, Cloudinary, QR, ticket issuance |
| `scripts/seed.ts` | Idempotent seed (participants live here) |
| `/verify`, `/dashboard`, `/ticket/[code]` | Participant flow |
| `/admin`, `/admin/*` | Admin panel |
| `/scan` | Partner-organization check-in |
