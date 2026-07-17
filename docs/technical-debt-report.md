# Technical Debt Report — IEMS

Code smells, duplication, outdated patterns, and missing coverage. Each notes severity and a recommended action. This complements the [security](security-assessment.md) and [performance](performance-report.md) reports (which cover their own debt).

## Architecture debt

### TD-1 — In-process coupling blocks horizontal scale · High
The live scan/notification bus (`lib/scanBus.ts:28`, an `EventEmitter` on `globalThis`), the auth rate limiter (`proxy.ts:10`), and the public-events cache (`api/events/route.ts:14`) are all per-process. On more than one instance: live updates drop, rate limits become per-pod, and caches diverge.
**Action:** For v1, enforce single-instance (documented in README). Post-v1, move the bus to Redis pub/sub, the limiter to a Redis counter, and the cache to Redis/shared. This is the single biggest scalability constraint.

### TD-2 — Privileged auth uses a different, weaker session model than participants · High
Participants have rotating refresh cookies with server-side revocation; admins/scanners have long-lived bearer JWTs in localStorage with none (`lib/authStorage.ts`). Two session models, and the more privileged one is the weaker. See [SEC-2](security-assessment.md).
**Action:** Converge admins onto the existing `lib/session.ts` rotating-cookie mechanism. Reuses code already written.

## Data-model debt

### TD-3 — Naming drift: `stack` vs `cohort` · Low
One concept, three names: model field `stack`, API/dashboard `cohort` (`me/route.ts:31`), pass label "stack" (`lib/tickets.ts:66`).
**Action:** Standardize on `stack` end-to-end.

### TD-4 — `cancel` and `revoke` collapse to one status · Low
`cancelTicket` sets `status:"REVOKED"` for both the participant-cancel and admin-revoke routes (`lib/tickets.ts:367`); there is no `CANCELLED`. You can't later report self-cancellations vs admin revocations.
**Action:** Either document this as intentional, or add a distinct status if the distinction matters for reporting.

### TD-5 — Polymorphic holder + archived snapshot is subtle · Medium (maintainability)
A ticket's holder can be a live `Participant`/`Guest` **or** a deleted holder represented by an embedded `holder` snapshot (`Ticket.ts:11-20`), resolved differently in at least four places (`ticketIdentity`, `buildTicketView`, the new `buildTicketViews`, the scan/ticket pages). It works and is well-commented, but the branching is easy to get subtly wrong.
**Action:** Keep the single source of truth in `lib/tickets.ts` and route all reads through it (the new batch builder follows this). Add a focused test for the archived-holder fallback path.

## Code-quality debt

### TD-6 — Duplicated image-fetch-to-Buffer logic · Low
The "fetch a URL (or decode a data: URL) into a Buffer, tolerate failure" block is copy-pasted in `lib/tickets.ts:241-264` and `tickets/[id]/download/route.ts:29-52`.
**Action:** Extract a `fetchImageBuffer(url)` helper; pair with the P-6 concurrency fix.

### TD-7 — Repeated Mongo 11000 duplicate-key handling · Low
The `err.code === 11000 → 409` pattern recurs across create routes (attendees, events, scanners, guests, plus-one).
**Action:** A small `isDuplicateKeyError(err)` helper (or a shared route wrapper) would DRY this and standardize the messages.

### TD-8 — Large components · Low
`sidebar.tsx` (702), `data-table.tsx` (698), `Scanner.tsx` (576), `MonthCalendar.tsx` (551), `dashboard/page.tsx` (554). Mostly inherent (shadcn primitives, the gate UI). `dashboard/page.tsx` mixes three cards + forms in one file and could be split into `CompleteCard`/`PlusOneCard`/`EventCard` modules for readability.
**Action:** Optional; split `dashboard/page.tsx` if it keeps growing.

## Testing debt

### TD-9 — Good API coverage; thin on edge cases · Medium
87 tests across `tests/api` (public, authenticated, smoke) and `tests/integration/services`. Strong baseline. Gaps worth filling:
- The plus-one contract fix (persisting gender/relationship) — add a test so it can't regress.
- The archived-holder fallback in ticket views (TD-5).
- Rate-limiter behaviour on the new login paths.
- The refresh-token reuse-detection revocation path.
**Action:** Add targeted tests for the above; they're the paths most likely to break silently.

### TD-10 — No end-to-end / browser test · Low
All tests are API/service level. The gate scanner (camera + SSE + atomic claim) and the participant verify→photo→pass flow are only manually verifiable.
**Action:** Consider a Playwright smoke of the two critical journeys post-v1.

## Documentation debt

### TD-11 — README was stale · ✅ FIXED
It described removed features (mini admins, partner orgs, access keys, `Attendee`/`Organization` models). Rewritten to match reality this pass.

### TD-12 — No API reference surfaced outside admin · Low
An OpenAPI spec exists (`lib/openapi.ts`, served admin-only at `/api/docs`). Fine, but there's no developer-facing route inventory in the repo besides code.
**Action:** The README key-paths table + this docs folder partly cover it; a generated route list would help onboarding.

## Debt summary

| # | Item | Severity | Status |
| --- | --- | --- | --- |
| TD-1 | In-process coupling (scale) | High | Documented; deferred |
| TD-2 | Weak privileged session model | High | Deferred (roadmap) |
| TD-5 | Polymorphic holder complexity | Medium | Contained; add test |
| TD-9 | Edge-case test gaps | Medium | Recommended |
| TD-3/4/6/7/8 | Naming, status, dup logic, size | Low | Backlog |
| TD-11 | Stale README | — | ✅ Fixed |
