# Security Assessment — IEMS

Every finding below carries: description, severity, impact, root cause, remediation, and implementation status. Evidence is cited as `file:line`. Severities: Critical / High / Medium / Low.

## Strengths (verified, keep them)

- Magic-link tokens are SHA-256 hashed and **atomically** redeemed (`auth/verify/route.ts:20`).
- Refresh tokens rotate with reuse detection (`lib/session.ts:37-52`).
- QR payloads are a dedicated JWT `kind` — an access token can't be replayed as a ticket (`lib/auth.ts:71-84`).
- Gate check-in is an atomic conditional update — no double-admit (`api/scan/route.ts:163`).
- Enumeration-safe magic-link request (`auth/request-link/route.ts:52`).
- Zod validation on request bodies; regex user input escaped before `RegExp` (`admin/attendees/route.ts:43`).
- Correct IDOR ownership checks on ticket routes via `participantOwnsTicket` (`tickets/[id]/route.ts:20`, `cancel/route.ts:21`, `download/route.ts:22`).

---

## SEC-1 — No brute-force protection on password logins · High · ✅ FIXED

**Description:** `POST /api/admin/login` and `POST /api/scanner/login` had no rate limit; the edge limiter covered only the three participant magic-link endpoints.
**Impact:** Unlimited password guesses against the highest-value accounts (full attendee PII, CSV export, ticket revocation).
**Root cause:** Login paths were omitted from `LIMITS` and `config.matcher` in `src/proxy.ts`.
**Remediation:** Added both paths at 5 attempts / 15 min / IP.
**Status:** Fixed — `src/proxy.ts`. Note: the limiter is in-process (per-instance); it is only fully effective single-instance (see [SEC-8](#sec-8) / [TD-1](technical-debt-report.md)).

## SEC-2 — Admin/scanner sessions can't be revoked; token in localStorage · High · ✅ FIXED (revocation) / ⏳ PARTIAL (storage)

**Description:** Admin tokens were 7-day JWTs, scanner tokens 1-day, both in `localStorage` (`lib/authStorage.ts:29-58`). No server-side session record.
**Impact:** (1) Deactivating/deleting an admin or scanner did **not** end their live session. (2) Any XSS exfiltrates a long-lived admin token.
**Root cause:** Stateless bearer-token design for the privileged roles.
**Remediation applied:**
- `requireAdmin`/`requireScanner`/`requireScannerAccount` now re-load the account and verify `active` on **every** request (`lib/auth.ts`) — deactivation/deletion revokes on the next call. The role is also re-read fresh from the DB.
- Admin token TTL cut 7d → 12h (`admin/login/route.ts`).
**Status:** Revocation **fixed**. The remaining part — moving the access token out of `localStorage` into a memory + rotating-cookie model (which also mitigates the XSS-exfiltration half and enables SEC-7) — stays post-v1. The XSS vector itself is now blunted by the DOMPurify fix (SEC-3) + CSP (SEC-5). See [roadmap](roadmap.md).

## SEC-3 — Bypassable HTML sanitizer (stored XSS) · High · ✅ FIXED

**Description:** `RichText.tsx` sanitized admin-authored HTML with regex, then rendered via `dangerouslySetInnerHTML`. Regex sanitizers are defeatable (e.g. unquoted `onerror=`, malformed tags). The content renders on the **public** event page and participant dashboard.
**Impact:** Stored XSS executing in every visitor's browser; chained with SEC-2, admin-token theft.
**Root cause:** Hand-rolled sanitization.
**Remediation:** Replaced with DOMPurify using a strict tag/attribute allow-list and a URL-protocol allow-list.
**Status:** Fixed — `src/components/RichText.tsx`, dep `isomorphic-dompurify`. Defense-in-depth CSP also added (SEC-5).

## SEC-4 — Uploads trust client-declared MIME type · Medium · ✅ FIXED

**Description:** `admin/uploads` and `me/photo` gated on `file.type` (attacker-controlled) and size only; no content sniffing.
**Impact:** Limited — Cloudinary is set `resource_type:"image"` and re-encodes — but arbitrary bytes were forwarded and the returned URL is later read by the PDF/`sharp` pipeline.
**Root cause:** No server-side content validation.
**Remediation applied:** `uploadImage` now content-sniffs with `sharp(buffer).metadata()` and rejects anything that isn't a real image in an allowed format (`InvalidImageError` → 400), before it reaches Cloudinary. Centralized so every upload path is covered.
**Status:** Fixed — `src/lib/cloudinary.ts`, `admin/uploads/route.ts`, `me/photo/route.ts`.

## SEC-5 — Missing security headers · Medium · ✅ FIXED

**Description:** No CSP or hardening headers were set.
**Impact:** No framing/clickjacking protection; no defense-in-depth against injected scripts or MIME sniffing.
**Remediation:** Added CSP (moderate: `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`, confined img/connect/font sources), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and HSTS via `next.config.ts` `headers()`.
**Status:** Fixed. The CSP keeps `'unsafe-inline'/'unsafe-eval'` on `script-src` (required by Next's App Router + the Three.js hero); tightening with per-request nonces is a roadmap item.

## SEC-6 — Seed accepts placeholder secrets; scanner inherits admin password · High · ✅ FIXED

**Description:** `.env.example` shipped `JWT_SECRET=change-me` / `SUPER_ADMIN_PASSWORD=change-me`; the seed derived the scanner password from the admin password when `SCANNER_PASSWORD` was unset (`scripts/seed.ts:232`).
**Impact:** A deploy could silently boot with a guessable JWT signing key (forgeable tokens) and give the shared gate device the administrator's password.
**Root cause:** Convenient fallbacks.
**Remediation:** `requireSecret()` now rejects unset/`change-me`/too-short values for `JWT_SECRET` (≥32), `SUPER_ADMIN_PASSWORD` (≥8), and `SCANNER_PASSWORD` (≥8); the scanner password is now independent. `.env.example` blanks required secrets and documents the constraint.
**Status:** Fixed — `scripts/seed.ts`, `.env.example`.

## SEC-7 — SSE access token travels in the URL query string · Medium · ⏳ DEFERRED

**Description:** `admin/scans/stream/route.ts:9` reads the token from `?token=` (EventSource can't set headers).
**Impact:** Token leakage via proxy logs / history / `Referer`; the token is the long-lived admin JWT (SEC-2).
**Remediation:** Once SEC-2 moves admins to a cookie session, authenticate the stream from the httpOnly cookie. Interim: shortening the admin TTL (SEC-2) limits the exposure.
**Status:** Deferred — bundled with SEC-2.

## SEC-8 — Notification PII retained indefinitely · Low · ✅ FIXED

**Description:** Scan alerts persist attendee names/events (`api/scan/route.ts:124`) with no expiry.
**Remediation:** Added a 90-day TTL index on `Notification.createdAt`.
**Status:** Fixed — `src/models/Notification.ts`.

## SEC-9 — Public ticket page exposes a working QR credential · Low · ⚠️ ACCEPTED

**Description:** `/ticket/[code]` (`ticket/[code]/page.tsx:12`) renders name, photo, and a scannable QR for anyone with the URL — by design (shareable pass), but the QR is a live gate credential.
**Remediation (optional):** Watermark, or require the short ticket number as a second factor for the public view.
**Status:** Accepted as a product decision; documented so it's a conscious one.

## SEC-10 — CSRF defense-in-depth on cookie routes · Low · ✅ FIXED

**Description:** `auth/refresh` authenticated purely from the cookie; `sameSite:"lax"` was the only guard.
**Remediation applied:** Added `sameOriginOk(req)` (`lib/csrf.ts`) — rejects a present, mismatched `Origin` while allowing same-origin, the configured app URL, and requests with no Origin. Wired into `POST /api/auth/refresh`.
**Status:** Fixed — `src/lib/csrf.ts`, `src/app/api/auth/refresh/route.ts`.

## Coverage summary

| Area | Result |
| --- | --- |
| Authentication / authorization | Strong; per-role guards correct |
| Role-based access control | Single admin role by design; correctly enforced |
| Session management | Participant: strong (rotating cookie). Admin/scanner: **revocation fixed** (SEC-2); localStorage storage still post-v1 |
| Input validation | Strong (Zod everywhere) |
| NoSQL injection | Not exploitable — parameterized Mongoose, escaped regex |
| XSS | **Fixed** (SEC-3) + CSP |
| CSRF | SameSite + **Origin check** (SEC-10) |
| IDOR | Correctly prevented |
| Sensitive data exposure | Minor: SSE query token (SEC-7, bundled with SEC-2 storage) |
| File upload validation | **Content-sniffed** (SEC-4) + type/size |
| Rate limiting | **Fixed** for logins (SEC-1); single-instance caveat |
| Secrets management | **Fixed** (SEC-6); `.env` git-ignored |
| Security headers | **Fixed** (SEC-5) |
| Error message leakage | Clean — generic messages, no stack traces to client |
