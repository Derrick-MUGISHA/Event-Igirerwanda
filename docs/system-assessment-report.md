# System Assessment Report — IEMS

**Date:** 2026-07-17 · **Branch:** `improved/ui` · **Scope:** full frontend + backend review (all 53 API routes, 12 models, auth/session/ticket/QR libraries, and every page/component), with fixes applied where safe.

## Executive summary

IEMS is a well-engineered event ticketing and gate-check-in platform. The backend shows genuine security and concurrency care — hashed single-use magic-link tokens, rotating refresh tokens with reuse detection, signed and type-segregated QR payloads, atomic capacity reservation, and atomic gate claims. Input validation (Zod) and authorization (per-route role guards with correct IDOR ownership checks) are applied consistently.

The gaps that existed were concentrated in a few areas: **brute-force exposure on the two password logins**, **an XSS-weak HTML sanitizer**, **one high-visibility data-loss bug in the plus-one flow**, **N+1 query patterns on list endpoints**, and **documentation that described a previous version of the product**. The highest-value, lowest-risk of these have been fixed in this pass (see [CHANGELOG](CHANGELOG.md)); the remainder are scoped in the [release-readiness checklist](release-readiness-checklist.md) and [roadmap](roadmap.md).

## Overall project health

| Dimension | Rating | Notes |
| --- | --- | --- |
| Security | **Strong** (was Fair) | Strong primitives; login rate-limiting, headers, real sanitizer, session revocation, upload content-validation, and CSRF backstop all in place. Only the admin token-storage migration is post-v1. |
| Stability | **Good** | 87 passing tests, clean build; error handling is consistent (`ok`/`fail` helpers, Zod guards, 11000 dup handling). |
| Performance | **Good** (was Fair) | N+1 on lists removed; indexes added. QR/dashboard caching still available as wins. |
| Architecture | **Good** | Clear separation (models / lib / routes / components); reusable helpers; sensible folder structure. |
| UX / UI | **Good** | Strong loading/skeleton states, branded, thoughtful gate UX. A few polish items remain. |
| Documentation | **Good** (was Poor) | README now accurate; full assessment docs added. |
| Scalability | **Constrained by design** | Single-instance only until the in-process bus/limiter/cache move to Redis. |

## Readiness for production

**Ready** for a controlled, single-instance v1 launch once the deployment invariant (single instance) and pre-launch config (strong secrets, HTTPS, real app URL, health check) are in place — see the [release-readiness checklist](release-readiness-checklist.md). Both review rounds are complete: the exploitable, data-losing, and revocation defects are fixed. The one item consciously left for post-v1 is moving the admin access token off `localStorage` into a cookie session — the *revocation* half of that finding is now fixed (per-request active-check), and the XSS-exfiltration half is mitigated by the sanitizer + CSP, so it is no longer a launch blocker. See [security-assessment.md](security-assessment.md) SEC-2.

## Critical findings (and status)

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | No rate limit on admin/scanner login (brute-force) | High | ✅ Fixed |
| 2 | Bypassable regex HTML sanitizer → stored XSS on public pages | High | ✅ Fixed (DOMPurify) |
| 3 | Plus-one form silently discards name/gender/relationship | High (data loss) | ✅ Fixed |
| 4 | Admin/scanner session revocation | High | ✅ Fixed (active-check + 12h TTL); localStorage→cookie post-v1 |
| 5 | N+1 queries on ticket/attendee lists | High (perf) | ✅ Fixed (batch builder) |
| 6 | Seed accepts placeholder secrets; scanner inherits admin password | High | ✅ Fixed |
| 7 | README describes removed features | Medium (credibility) | ✅ Fixed |
| 8 | Missing indexes on hot queries | Medium (perf) | ✅ Fixed |
| 9 | Uploads trust client MIME; no CSRF backup; QR/dashboard uncached | Medium | ✅ Fixed (Round 2) |

## Major risks

1. **Single-instance coupling.** Live features, rate limiting, and the in-process caches (events, dashboard, QR) assume one process. Deploying replicas silently breaks them. Must be an explicit operational invariant for v1. — [performance-report.md](performance-report.md) P-5, [technical-debt-report.md](technical-debt-report.md) TD-1.
2. **Admin token storage (residual).** Revocation is now immediate (active-check) and the TTL is 12h, but the admin access token still lives in `localStorage`. Mitigated by the sanitizer + CSP; the cookie migration is the top post-v1 security item. — [security-assessment.md](security-assessment.md) SEC-2.
3. **Third-party dependency at the gate.** QR rendering and image handling depend on Cloudinary/`sharp` on hot paths; slow/failed fetches now degrade gracefully (5s-timeout `fetchImageBuffer`, cached QR). — [performance-report.md](performance-report.md) P-3/P-6.

## Recommended priorities

1. **Accept or close the session-revocation gap** (shorten admin TTL now; cookie-session migration post-v1).
2. **Lock the deployment to a single instance** and document it (done in README; enforce in infra).
3. **Ship the applied fixes** and run the [release-readiness checklist](release-readiness-checklist.md).
4. **Schedule the performance caching wins** (QR + dashboard) for the first patch release.

## Deliverables in this folder

| Document | Purpose |
| --- | --- |
| [security-assessment.md](security-assessment.md) | Every security finding: description, severity, impact, root cause, remediation, status |
| [performance-report.md](performance-report.md) | Bottlenecks, root causes, optimizations applied, expected impact |
| [ui-ux-report.md](ui-ux-report.md) | Screens reviewed, problems, recommendations, priority, user impact |
| [technical-debt-report.md](technical-debt-report.md) | Code smells, duplication, outdated patterns, missing tests/docs |
| [release-readiness-checklist.md](release-readiness-checklist.md) | Go/no-go checklist across security, stability, perf, a11y, docs, testing, deploy |
| [CHANGELOG.md](CHANGELOG.md) | Everything changed in this pass |
| [roadmap.md](roadmap.md) | Post-v1 enhancements |
