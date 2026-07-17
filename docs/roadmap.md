# Post-v1 Roadmap — IEMS

Enhancements beyond the first release, ordered roughly by value. Items marked *(deferred)* were identified in this review and consciously not done in the v1 pass.

## Phase 1 — Harden the privileged session (security)

> Revocation, upload validation, and CSRF origin checks were **completed in Round 2** (see [CHANGELOG](CHANGELOG.md)). What remains here is the token-storage half.

1. **Admin/scanner rotating-cookie sessions** *([SEC-2](security-assessment.md)/[TD-2](technical-debt-report.md))* — the per-request `active`-check now gives immediate revocation; the remaining step is moving the access token off localStorage into memory + a rotating httpOnly cookie (reusing `lib/session.ts`), so an XSS can't exfiltrate a bearer token. Then authenticate the SSE stream from that cookie instead of a query token ([SEC-7](security-assessment.md)).
2. **Nonce-based CSP** — remove `'unsafe-inline'`/`'unsafe-eval'` from `script-src` with per-request nonces, tightening the header added in Round 1.

## Phase 2 — Performance & responsiveness

4. **QR render caching** *([P-3](performance-report.md))* — persist/LRU the QR data URL; stop rendering it in list responses.
5. **Dashboard caching + `$facet`** *([P-4](performance-report.md))*.
6. **Concurrent, timeout-bounded image fetches** in the PDF path *([P-6](performance-report.md))*, extracted into a shared `fetchImageBuffer` helper *([TD-6](technical-debt-report.md))*.
7. **Extend the events cache pattern** to `upcoming`/`by-date`/`[id]` *([P-5](performance-report.md))*.
8. **Bundle audit** — dynamic-import `three`; confirm `recharts` is admin-only *([P-7](performance-report.md))*.

## Phase 3 — Scale out

9. **Redis-back the in-process primitives** *([TD-1](technical-debt-report.md))* — pub/sub bus, rate-limit counter, and shared cache. This is the gate that unlocks running more than one instance and is prerequisite for real load.

## Phase 4 — UX & product

10. **Checked-in plus-one shows "Attended"** instead of disappearing *([UX-3](ui-ux-report.md))*.
11. **Accessibility pass** — text labels beside every colour signal, WCAG AA contrast, screen-reader announcements for the scan flow *([A11y-1..3](ui-ux-report.md))*.
12. **Photo crop step** for consistent passes *([UX-5](ui-ux-report.md))*; **stack picker** for participants missing one *([UX-4](ui-ux-report.md))*.
13. **Public-pass hardening** — reconsider exposing a working QR at `/ticket/[code]` *([SEC-9](security-assessment.md))*.

## Phase 5 — Engineering foundations

14. **Edge-case tests** *([TD-9](technical-debt-report.md))*: plus-one persistence, archived-holder fallback, login rate limiting, refresh-token reuse.
15. **Playwright E2E** of the verify→pass and gate-scan journeys *([TD-10](technical-debt-report.md))*.
16. **Naming/status cleanup** — unify `stack`/`cohort` *([TD-3](technical-debt-report.md))*; decide cancel-vs-revoke semantics *([TD-4](technical-debt-report.md))*.
17. **MongoDB backups** and a documented restore drill.

## Longer-term product ideas (not yet scoped)

- Multi-event self-service registration (participants aren't pre-seeded).
- Per-admin accounts with an audit trail of privileged actions (revokes, resets, exports).
- Attendee-facing calendar / multi-ticket wallet.
- Offline-capable gate scanning (queue scans, reconcile on reconnect) — valuable where venue Wi-Fi is unreliable.
