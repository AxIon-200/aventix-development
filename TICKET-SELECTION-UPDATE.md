# Ticket-selection correction

This update follows the requested guest and signed-in Figma states. It extends `aventix-abrigo-integrated-project.zip`; no backend or dependency changes are included.

## Changed frontend files

| Path | Change |
| --- | --- |
| `src/app/events/[id]/tickets/page.tsx` | Modified: guest ticket table has Location, Section, Price, Quantity, Action columns; compact alternating rows and disabled controls; shared two-column responsive layout and exact two-decimal prices. |
| `src/components/booking/TicketSelection.tsx` | Modified: signed-in table, ready-to-book badge, service-supplied section choices, quantity input and per-row Select button. Existing validation, selection draft, limits and next-step flow retained. |
| `src/components/booking/TicketSelection.module.css` | Added: page-scoped desktop/tablet/mobile styles. No global CSS changes. |
| `src/components/booking/SeatSelection.tsx` | Modified: section anchors allow ticket-row section shortcuts without bypassing required exact numbered-seat selection. |
| `src/components/event/BookingLoginNotice.tsx` | Modified: login banner matches the reference more closely; event return URL retained. |

The signed-in Select action validates the complete draft and opens numbered-seat selection. A section choice scrolls to that supplied section; it does not reserve seats or restrict inventory. All selected categories still require the exact requested numbered seats. No section names, roles or inventory are fabricated. When the service supplies no section inventory, the control directs users to choose on the seat map. A service failure never creates a successful booking.

## Figma references

- `705:16349`: guest ticket selection, locked controls and login calls to action.
- `705:12628`: signed-in ticket rows and account-ready state.
- `705:18617`: footer; the existing shared footer is retained.
- `705:14000` and `705:18385`: guest/signed-in event details; existing shared detail content and session-aware header retained.
- `705:14121`: related-event cards; existing component retained with actual different events rather than fabricated repeated inventory.

All six contexts and screenshots were inspected. This is not an exact pixel-match sign-off: the seat-plan asset download still returned HTML instead of an image. The UI honestly shows an unavailable seat-plan state until an approved image is supplied. Existing event data can have different names/category counts/prices from the Figma samples; sample categories were not represented as real inventory. Public event-detail ticket categories remain data-driven, rather than inventing the prototype's Mastercard eligibility offer.

SM Tickets was opened as requested but returned a waiting-room/high-traffic page. Its current booking flow could not be verified; no unverified SM Tickets policy or copied asset was added.

## Verification and limits

- Production build and TypeScript passed.
- Lint passed; 17 existing regression tests passed.
- 13 booking DOM checks passed, including the new section/Select shortcut, unchanged quantity draft behavior, seat conflicts, explicit cancellation and authoritative payment status. Test adapters only; no real session, reservation or payment was created.
- Production HTTP route checks passed after the update.
- Actual browser visual/mobile/native-control verification remains pending. Responsive CSS and DOM checks are not proof of pixel fidelity.
- Backend, configuration, dependency files and original images are unchanged from the preceding integrated package.

The default shared auth/booking adapters remain disconnected because the supplied backend is scaffolding. You can see the guest page now. The signed-in page will appear when the real shared session authorizes booking and the ticket-options service responds; this change does not provide a fake login.

Use `review/ticket-selection.patch` to review/apply only this follow-up against the preceding integrated ZIP. The full updated ZIP is for a fresh extraction. If you have made local edits since that package, review the five frontend paths before replacing them. No push, commit, merge or PR was performed.
