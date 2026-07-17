# Changelog Release-Readiness Pass (2026-07-17)

All changes below were applied on branch `improved/ui` as part of the production-readiness review. Baseline before and after every round: `pnpm lint` clean (1 pre-existing unrelated warning), `pnpm test` 87/87 passing, `tsc --noEmit` clean, `pnpm build` succeeds.

The work landed in two rounds: **Round 1** — the Gate-1 quick wins; **Round 2** — the deferred findings. Both are reflected below.

---

# Round 2 deferred findings

## Security

- **Session revocation for admins & scanners.** `requireAdmin`/`requireScanner`/`requireScannerAccount` now re-load the account and verify it still exists and is `active` on every request, so deactivating or deleting an admin/scanner ends their session on the next call instead of waiting out the token. Admin token TTL cut from 7d to 12h. — `src/lib/auth.ts`, `src/app/api/admin/login/route.ts` ([SEC-2](security-assessment.md))
- **Upload content validation.** `uploadImage` now content-sniffs bytes with `sharp().metadata()` and rejects anything that isn't a real image in an allowed format (throws `InvalidImageError` → 400), before it reaches Cloudinary. Covers both `admin/uploads` and `me/photo`. — `src/lib/cloudinary.ts` + both routes ([SEC-4](security-assessment.md))
- **CSRF origin backstop.** `POST /api/auth/refresh` now rejects a present, mismatched `Origin` (allows same-origin / configured app URL / missing Origin) as defense-in-depth behind SameSite=Lax. — `src/lib/csrf.ts`, `src/app/api/auth/refresh/route.ts` ([SEC-10](security-assessment.md))

## Performance

- **QR render cache.** QR PNGs/data-URLs are now memoized in a bounded (500-entry) in-process LRU keyed by code + identity, instead of re-running QR encode + `sharp` composite on every dashboard/pass/email request. — `src/lib/qr.ts` ([P-3](performance-report.md))
- **Dashboard payload cache.** The admin dashboard (2 aggregations + ~8 counts) is cached in-process for 15s; live check-ins still stream over SSE. — `src/app/api/admin/dashboard/route.ts` ([P-4](performance-report.md))
- **Concurrent, timeout-bounded image fetches.** Extracted a shared `fetchImageBuffer(url, timeout)` helper (handles `data:` URLs, 5s timeout, never throws) and used it to fetch the profile photo + event poster **in parallel** in both the PDF download route and the email/PDF builder. — `src/lib/imageFetch.ts`, `src/app/api/tickets/[id]/download/route.ts`, `src/lib/tickets.ts` ([P-6](performance-report.md), [TD-6](technical-debt-report.md))

## UX

- **Checked-in plus-one now shows "Attended"** instead of vanishing from the participant's dashboard: `/api/me` falls back to the archived ticket-holder snapshot (via `participant.plusOne`) when the live Guest record has been deleted at the gate. — `src/app/api/me/route.ts` ([UX-3](ui-ux-report.md))

---

# Round 1 Gate-1 quick wins

## Security

- **Rate-limited the password logins.** `POST /api/admin/login` and `POST /api/scanner/login` are now covered by the edge limiter at 5 attempts / 15 min / IP. Previously unlimited. — `src/proxy.ts`
- **Added baseline security headers** on every response: Content-Security-Policy (moderate, framing/base-uri/object/form locked down), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera=self, mic/geo off), and HSTS. — `next.config.ts`
- **Replaced the bypassable regex HTML sanitizer with DOMPurify** (strict tag/attribute allow-list, protocol allow-list). This closes the stored-XSS vector in admin-authored event content that renders on public pages. — `src/components/RichText.tsx`, new dep `isomorphic-dompurify`
- **Hardened the seed script.** It now refuses to run when `JWT_SECRET` (≥32 chars), `SUPER_ADMIN_PASSWORD` (≥8), or `SCANNER_PASSWORD` (≥8) are unset or still `change-me`, and the **scanner no longer inherits the admin password**. `.env.example` updated to blank required secrets and document the constraint. — `scripts/seed.ts`, `.env.example`
- **Added a 90-day TTL on notifications** so gate-side attendee PII (names in scan alerts) doesn't accumulate indefinitely. — `src/models/Notification.ts`

## Performance

- **Eliminated the ticket-list N+1.** Added `buildTicketViews()`, a batch builder that resolves all events + holders in three `$in` queries instead of ~2 per ticket. Wired into `GET /api/admin/tickets` and `GET /api/me/tickets` — a 500-row admin list drops from ~1,000 queries to 4. — `src/lib/tickets.ts`, `src/app/api/admin/tickets/route.ts`, `src/app/api/me/tickets/route.ts`
- **Added indexes on hot query paths:** `Ticket(event, status)`, `Ticket(holderType, event)`, and `ScanLog(result, createdAt)` (the dashboard's aggregation filter). — `src/models/Ticket.ts`, `src/models/ScanLog.ts`

## Functional / UX

- **Fixed the plus-one data-loss bug.** The dashboard's "fill their details" form collected `fullName`, `gender`, and `relationship`, but the API read only `email` and the `Guest` schema had nowhere to store the rest — every plus-one was saved as "Guest of X" with no gender/relationship. Now:
  - `Guest` model gains `gender` and `relationship` fields (with a new `RELATIONSHIPS` enum). — `src/models/Guest.ts`
  - `POST /api/me/plus-one` accepts `name`/`fullName`, `gender`, `relationship` and persists them. — `src/app/api/me/plus-one/route.ts`
  - `GET /api/me` returns the real stored gender/relationship instead of hard-coded `null`/`"OTHER"`. — `src/app/api/me/route.ts`
- **Fixed the "Copy link" button** staying stuck on "Copied!" forever; it now reverts after 2s. — `src/app/dashboard/page.tsx`

## Documentation

- **Rewrote `README.md`** to match the actual system (single admin role, email+password scanner accounts, real model list) — it previously described removed features (mini admins, partner organizations, access-key login, `Attendee`/`Organization` models).
- **Added `docs/`**: system assessment, security assessment, performance report, UI/UX report, technical-debt report, release-readiness checklist, this changelog, and the roadmap.

## Dependencies

- Added `isomorphic-dompurify@^3.18` (server+client HTML sanitization).

## Still deferred after Round 2 (see roadmap)

- **Full admin cookie-session migration.** Round 2 added per-request revocation (the `active`-check) and cut the admin TTL, which captures most of the value. Moving the admin access token out of localStorage into a memory + rotating-httpOnly-cookie model (and re-authing the SSE stream from that cookie instead of a query token, [SEC-7](security-assessment.md)) remains a post-v1 item.
- **Redis-backing the in-process primitives** (SSE bus, rate limiter, events/dashboard/QR caches) — needed only to run more than one instance. Single-instance is the documented v1 invariant.
- **Nonce-based CSP** to drop `'unsafe-inline'`/`'unsafe-eval'` from `script-src`.
- **Extending the events-cache pattern** to `upcoming`/`by-date`/`[id]` ([P-5](performance-report.md)); **bundle audit** ([P-7](performance-report.md)).
- **Edge-case tests** for the new paths ([TD-9](technical-debt-report.md)).
