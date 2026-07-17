# Release-Readiness Checklist IEMS v1.0

Go/no-go across the eight readiness dimensions. `✅` done · `⏳` recommended before/around launch · `⬜` post-v1. A v1.0 launch is **conditionally go** once the "Gate-1" rows are accepted or closed.

## Security

| Item | Status | Ref |
| --- | --- | --- |
| Brute-force protection on all password logins | ✅ | [SEC-1](security-assessment.md) |
| HTML sanitized with a vetted library (no stored XSS) | ✅ | [SEC-3](security-assessment.md) |
| Security headers (CSP, HSTS, nosniff, frame-deny) | ✅ | [SEC-5](security-assessment.md) |
| Secrets required & validated at seed; no shared admin/scanner password | ✅ | [SEC-6](security-assessment.md) |
| Notification PII retention bounded | ✅ | [SEC-8](security-assessment.md) |
| Admin/scanner session revocation (per-request active-check + 12h TTL) | ✅ | [SEC-2](security-assessment.md) |
| Admin token off localStorage (cookie session) | ⬜ post-v1 | [SEC-2](security-assessment.md) |
| Upload content (magic-byte) validation | ✅ | [SEC-4](security-assessment.md) |
| CSRF origin check on cookie route | ✅ | [SEC-10](security-assessment.md) |
| SSE off query-token | ⬜ post-v1 (with cookie session) | [SEC-7](security-assessment.md) |
| `.env`/`.env.local` git-ignored; no secrets in repo | ✅ | verified |

## Stability

| Item | Status |
| --- | --- |
| `pnpm test` green | ✅ 87/87 |
| `pnpm build` succeeds | ✅ |
| Consistent error handling (Zod + `ok`/`fail`, no stack traces leaked) | ✅ |
| Atomic invariants hold (capacity reserve, gate claim, token redeem) | ✅ verified |
| Duplicate-key paths return 409, not 500 | ✅ |
| Tests added for the plus-one fix + archived-holder fallback | ⏳ Gate-1 |

## Performance

| Item | Status | Ref |
| --- | --- | --- |
| Ticket-list N+1 removed | ✅ | [P-1](performance-report.md) |
| Indexes on hot query paths | ✅ | [P-2](performance-report.md) |
| QR render caching | ✅ | [P-3](performance-report.md) |
| Dashboard payload caching | ✅ | [P-4](performance-report.md) |
| Concurrent image fetch in PDF download | ✅ | [P-6](performance-report.md) |
| Landing bundle audited (three/recharts split) | ⬜ | [P-7](performance-report.md) |

## Accessibility

| Item | Status | Ref |
| --- | --- | --- |
| Text label beside every colour-coded status | ⏳ | [A11y-1](ui-ux-report.md) |
| Loading states announced (`role=status`) | ✅ (dashboard); ⏳ verify admin | [A11y-2](ui-ux-report.md) |
| Form fields labelled; scan flow announced | ⏳ | [A11y-3](ui-ux-report.md) |
| Contrast meets WCAG AA | ⏳ verify | [A11y-1](ui-ux-report.md) |

## Documentation

| Item | Status |
| --- | --- |
| README matches actual system | ✅ |
| `.env.example` accurate & safe | ✅ |
| Assessment docs (this folder) | ✅ |
| Deployment single-instance invariant documented | ✅ (README) |
| API reference (OpenAPI, admin-gated) | ✅ exists |

## Testing

| Item | Status |
| --- | --- |
| API/service test suite | ✅ 87 tests |
| Edge-case coverage (plus-one, holder fallback, rate limit, token reuse) | ⏳ Gate-1 |
| E2E/browser smoke of the two critical journeys | ⬜ post-v1 |

## Deployment readiness

| Item | Status |
| --- | --- |
| Single instance enforced in infra | ⏳ **Gate-1** (config/infra) |
| MongoDB with the new indexes built (deploy triggers index creation) | ⏳ verify on first boot |
| Cloudinary + Gmail credentials set & health-checked (`pnpm health`) | ⏳ pre-launch |
| `NEXT_PUBLIC_APP_URL` set to the real domain (email links) | ⏳ pre-launch |
| HTTPS terminated (camera + secure cookies require it) | ⏳ pre-launch |
| Reverse proxy passes SSE through (no buffering; heartbeat handles ngrok) | ✅ code handles; ⏳ verify prod proxy |

## Production configuration

| Item | Status |
| --- | --- |
| `NODE_ENV=production` (enables `secure` cookies) | ⏳ verify |
| `JWT_SECRET` ≥32 random chars, unique to prod | ⏳ pre-launch |
| Admin & scanner passwords strong and distinct | ⏳ pre-launch (seed now enforces) |
| Backups configured for MongoDB | ⬜ recommend |

## Gate-1 (accept or close before tagging v1.0)

1. ~~Session revocation~~ — ✅ **done** (per-request active-check + 12h admin TTL). The localStorage→cookie migration remains post-v1 but is no longer a blocker.
2. **Single-instance enforcement** in the deployment target. ([TD-1](technical-debt-report.md))
3. **Regression tests** for the plus-one fix, the archived-holder path, and the new revocation/upload-validation paths. ([TD-9](technical-debt-report.md))
4. **Pre-launch config**: strong distinct secrets, real `NEXT_PUBLIC_APP_URL`, HTTPS, health check green.

With the security fixes applied, only #2 (deployment invariant) and #4 (pre-launch config) are hard gates; #3 is strongly recommended. **v1.0 is go for a controlled single-instance launch** once those are in place.
