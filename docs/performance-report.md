# Performance Report IEMS

Focus: request latency, DB round-trips, hot-path CPU, and bundle weight. Each item lists the bottleneck, root cause, what was applied, and expected impact.

## Applied in this pass

### P-1 Ticket-list N+1 eliminated · ✅ APPLIED

**Bottleneck:** `GET /api/admin/tickets` and `GET /api/me/tickets` ran `tickets.map(buildTicketView)`; each `buildTicketView` issued `Event.findById` **plus** a holder `findById` (`lib/tickets.ts:326`). For a 500-row admin list that is **~1,000 DB round-trips per request**.
**Root cause:** Per-item view builder used inside a list map.
**Applied:** New `buildTicketViews(tickets[])` batch builder collects all event ids + holder ids and resolves them in **three `$in` queries total**, assembling views from in-memory maps (the pattern the CSV export already used). Wired into both list routes.
**Expected impact:** 500-row list drops from ~1,000 queries to **4**. On a remote Mongo this turns a multi-second list into tens of milliseconds and stops holding a connection open for the duration.
**Files:** `src/lib/tickets.ts`, `src/app/api/admin/tickets/route.ts`, `src/app/api/me/tickets/route.ts`.

### P-2 Indexes on hot query paths · ✅ APPLIED

**Bottleneck:** `Ticket.find({event})`/`{status}` (admin list), `Ticket.find({holderType, event})` (archived-holder lookups), and the dashboard's `ScanLog` aggregation filtering `{result, createdAt}` all ran without a covering index → collection scans as data grows.
**Applied:** `Ticket.index({event:1,status:1})`, `Ticket.index({holderType:1,event:1})`, `ScanLog.index({result:1,createdAt:1})`.
**Expected impact:** Dashboard and ticket-list queries stay index-backed at scale; the dashboard (2 aggregations + ~8 counts) is the biggest beneficiary.
**Files:** `src/models/Ticket.ts`, `src/models/ScanLog.ts`.

## Applied in Round 2

### P-3 QR render cache · ✅ APPLIED

`ticketQrDataUrl`/`ticketQrPngBuffer` ran `QRCode.toBuffer` + a `sharp` composite + base64 on **every** request (dashboard, public pass, email/PDF). The QR is a pure function of `(code, name, type, eventName)` and only changes on reset.
**Applied:** A bounded 500-entry in-process LRU (`lib/qr.ts`) memoizes the rendered PNG by those inputs; repeat renders are a map hit. Lists still don't embed QR at all.
**Expected impact:** Removes the heaviest synchronous CPU cost from the hot read paths; the second and later views of any pass skip QR encoding + `sharp` entirely.

### P-4 Dashboard payload cache · ✅ APPLIED

`admin/dashboard/route.ts` issued ~11 DB ops per load.
**Applied:** 15s in-process cache of the whole payload; live check-ins still stream over SSE so the summary numbers staying a few seconds stale is invisible.
**Expected impact:** Repeat dashboard loads within the window skip all DB work; the aggregation-heavy admin landing page becomes near-instant under normal polling.
*(The `$facet` consolidation of the count queries remains an optional further win.)*

### P-6 Concurrent, timeout-bounded image fetches · ✅ APPLIED

The PDF download route fetched the profile photo then the poster **serially**, each an unbounded remote call.
**Applied:** Extracted `fetchImageBuffer(url, timeout)` (`lib/imageFetch.ts`; handles `data:` URLs, 5s timeout, never throws) and used it to fetch both images **in parallel** in the download route and the email/PDF builder. Also removes the duplicated fetch-to-Buffer logic ([TD-6](technical-debt-report.md)).
**Expected impact:** PDF download latency drops from (photo + poster + render) to (max(photo, poster) + render), and a slow Cloudinary response can no longer hang the request past 5s.

## Remaining recommendations (scoped, not yet applied)

### P-5 Extend the events-cache pattern · Medium

`api/events/route.ts` already has an exemplary 60s in-process cache busted by content-change SSE + SWR headers. `api/events/upcoming`, `by-date`, and `[id]` hit Mongo per request — apply the same pattern.
**Note:** All in-process caches are per-instance → single-instance assumption (see [technical-debt-report.md](technical-debt-report.md) TD-1).

### P-6 Serial image fetches in PDF download · Medium

`tickets/[id]/download/route.ts:29-52` awaits the profile photo then the poster sequentially before building the PDF (the emailed path already backgrounds this).
**Recommendation:** `Promise.all` the two fetches with a short timeout so a slow Cloudinary response degrades to "no image" rather than hanging the request.

### P-7 Landing bundle weight · Low

`three`, `gsap`, `motion`, `recharts` are all in `dependencies`. Confirm `three` (HeroCanvas) is `next/dynamic` with `ssr:false` and that `recharts` is code-split into the admin bundle only, so public visitors don't download a WebGL engine + charting lib.

## Frontend performance notes

- **Rendering:** React 19 + React Compiler is enabled (`next.config.ts reactCompiler:true`) — automatic memoization is a real win; the one lint warning is TanStack Table opting out, which is expected and safe.
- **State:** Redux for auth + TanStack Query for server state with persistence — appropriate; query caching already avoids most refetches.
- **Images:** Several `img` tags (with eslint-disable) for blob previews are fine; Cloudinary URLs on `IdCard`/avatars would benefit from `next/image` (sizing + lazy-load). Low priority.

## Priority order for the next perf pass

P-1, P-2 (Round 1) and P-3, P-4, P-6 (Round 2) are done. Remaining:

1. **P-5** (extend event caching to `upcoming`/`by-date`/`[id]`).
2. **P-4 follow-up** — `$facet` consolidation of the dashboard count queries.
3. **P-7** (bundle audit — dynamic-import `three`, confirm `recharts` is admin-only).
