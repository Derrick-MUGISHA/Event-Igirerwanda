# IEMS
Full frontend + backend assessment of the IEMS event ticketing platform, with fixes applied where safe. Conducted 2026-07-17 on branch `improved/ui`.

## Start here

**[System Assessment Report](system-assessment-report.md)** executive summary, project health, production readiness, critical findings, and priorities.

## Documents

| Document | Contents |
| --- | --- |
| [System Assessment Report](system-assessment-report.md) | Overall health, readiness verdict, critical findings, major risks, priorities |
| [Security Assessment](security-assessment.md) | Each finding: description, severity, impact, root cause, remediation, status |
| [Performance Report](performance-report.md) | Bottlenecks, root causes, optimizations applied, expected impact |
| [UI/UX Improvement Report](ui-ux-report.md) | Screens reviewed, problems, recommendations, priority, user impact |
| [Technical Debt Report](technical-debt-report.md) | Code smells, duplication, outdated patterns, missing tests/docs |
| [Release-Readiness Checklist](release-readiness-checklist.md) | Go/no-go across security, stability, perf, a11y, docs, testing, deploy, config |
| [CHANGELOG](CHANGELOG.md) | Everything changed in this pass |
| [Roadmap](roadmap.md) | Post-v1 enhancements, phased |

## Verification at time of review

| Check | Result |
| --- | --- |
| `pnpm lint` | ✅ clean (1 pre-existing, unrelated TanStack Table warning) |
| `pnpm test` | ✅ 87/87 pass |
| `pnpm build` | ✅ succeeds |

## What was fixed (summary)

**Round 1 Gate-1 quick wins:**
- **Security:** login rate-limiting, security headers (CSP/HSTS/etc.), DOMPurify sanitizer, seed secret enforcement, notification PII TTL.
- **Performance:** ticket-list N+1 eliminated (batch builder), indexes on hot query paths.
- **Functional/UX:** plus-one data-loss bug fixed end-to-end, copy-link button reset.
- **Docs:** README rewritten to match reality; this assessment set added.

**Round 2 deferred findings:**
- **Security:** admin/scanner session revocation (per-request active-check + 12h TTL), upload content-sniffing (`sharp`), CSRF origin backstop on the refresh cookie.
- **Performance:** QR render LRU cache, dashboard payload cache, concurrent + timeout-bounded image fetches (shared `fetchImageBuffer`).
- **UX:** checked-in plus-one now shows "Attended" instead of vanishing.

See the [CHANGELOG](CHANGELOG.md) for file-level detail and the [System Assessment Report](system-assessment-report.md) for the readiness verdict.

## Still post-v1 (with rationale)

- **Admin token off `localStorage`** into a cookie session — its *revocation* half is now fixed; the storage/XSS-exfiltration half is mitigated by the sanitizer + CSP, so it's no longer a blocker. Top of the [roadmap](roadmap.md).
- **Multi-instance (Redis)** for the in-process bus/limiter/caches — single-instance is the documented v1 invariant.
- **Nonce CSP, event-cache extension, bundle audit, edge-case tests.** Nothing outstanding is exploitable-and-easy or data-losing.
