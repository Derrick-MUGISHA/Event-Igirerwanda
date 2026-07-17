# UI/UX Improvement Report — IEMS

Screens reviewed, problems found, recommendations, priority, and expected user impact. "Fixed" items were applied this pass.

## Screens / components reviewed

Landing (`/`, Hero + HeroCanvas + MonthCalendar + CategoryMarquee), event detail (`/events/[id]`), participant verify (`/verify`, `/verify/[token]`), participant dashboard (`/dashboard`), public pass (`/ticket/[code]`), plus-one (`/plus-one/[token]`), gate scanner (`/scan` + `Scanner` component), and the admin panel (dashboard, attendees, guests, tickets, events, scanners, notifications, status).

## Fixed this pass

### UX-1 — Plus-one form silently discarded most input · High (data loss) · ✅ FIXED
The "fill their details" form collected full name, gender, and relationship, but the API stored only a placeholder name. Users saw their plus-one saved as **"Guest of \<name\>"** with no gender/relationship. Root cause was a UI↔API↔schema contract mismatch. Fixed end-to-end (Guest schema fields, API persistence, `/api/me` now returns real values). **User impact:** the plus-one's real name now appears on their pass and in the participant's dashboard.

### UX-2 — "Copy link" button stuck on "Copied!" · Low · ✅ FIXED
The invite "Copy link" button never reverted, so a second copy gave no feedback. Now reverts after 2s. **User impact:** clear feedback on repeat copies.

## Recommendations (not yet applied)

### UX-3 — Checked-in plus-one vanishes from the dashboard · Medium · ✅ FIXED
When a plus-one is admitted at the gate, their `Guest` record is deleted (`api/scan/route.ts:59`), so the inviting participant's dashboard showed **no plus-one** instead of "attended." **Fixed:** `/api/me` now falls back to the archived ticket-holder snapshot (via `participant.plusOne`) and returns an `"ATTENDED"` status when the live Guest is gone. **User impact:** the plus-one stays visible as "Attended" instead of disappearing.

### UX-4 — Dead `stack` input path · Low
`PATCH /api/me` accepts `stack`, but the completion UI never sends it and offers no picker (`dashboard/page.tsx:238`). Admin-created participants can be missing a stack with no way to set it, yet stack drives the pass badge. Either surface a picker when missing, or drop `stack` from the participant-editable body. **User impact:** correct badge for edge-case participants.

### UX-5 — Photo upload has no aspect guidance · Low
The pass expects a face crop; a wide photo letterboxes on the ID card (`dashboard/page.tsx:305`). Add a square crop/preview step. **User impact:** consistent, professional passes.

### UX-6 — Verify auto-redirect has no "stay" affordance · Low
`/verify` counts down 10s and redirects home after sending the link (`verify/page.tsx:19`). Some users are still reading. Add a "stay on this page" control. **User impact:** less surprise.

### UX-7 — Confirm 404 / error boundary styling · Low
Verify `app/not-found.tsx` and an `error.tsx` exist and match the brand; a raw Next error page inside the portal is jarring. **User impact:** polished failure states.

## Accessibility

- **A11y-1 (Medium):** Status is often colour-coded (green/terracotta/tan) on the `IdCard`, `StatusBadge`, and scan flash. The Scanner does this well — every colour also carries a text label (`FLASH_META.label`). Audit `StatusBadge` and the ID card to ensure the same: a text label beside every colour signal, and check contrast ratios against WCAG AA.
- **A11y-2 (Low):** Loading states use `role="status"` + `sr-only` text on the dashboard skeleton (good). Confirm admin list pages do the same rather than flashing blank.
- **A11y-3 (Low):** Ensure all form fields have associated `<label>`s (the portal `Field`/`Select` helpers appear to; spot-check admin forms) and that the camera-permission and scan-result flows are announced to screen readers.

## Responsive design

- The dashboard grid (`md:grid-cols-2`) and portal shell adapt well. Spot-check the admin data tables (`data-table.tsx`, 698 lines) and the 702-line `sidebar.tsx` on narrow viewports — wide tables are the usual mobile pain point. Confirm horizontal scroll or column collapse rather than overflow.
- The gate `Scanner` is the most mobile-critical screen (staff on phones); its camera + flash + feed layout should be verified at common phone widths.

## Consistency & design language

- Strong, consistent brand system: cream/orange/green palette, `label`/`display` type utilities, `Panel`/`Note`/`Button` portal primitives, motion-based reveals. Keep new UI on these primitives.
- Two button systems coexist: portal `components/portal/ui.tsx Button` and shadcn `components/ui/button.tsx`. That's intentional (portal vs admin scopes) but document the boundary so contributors pick the right one.

## Priority summary

| # | Item | Priority | Status |
| --- | --- | --- | --- |
| UX-1 | Plus-one data loss | High | ✅ Fixed |
| UX-2 | Copy button reset | Low | ✅ Fixed |
| UX-3 | Checked-in plus-one disappears | Medium | ✅ Fixed |
| A11y-1 | Colour-only status signals | Medium | Recommended |
| UX-4 | Dead stack input | Low | Recommended |
| UX-5 | Photo aspect/crop | Low | Recommended |
| UX-6 | Verify redirect affordance | Low | Recommended |
| UX-7 | 404 / error boundary polish | Low | Recommended |
