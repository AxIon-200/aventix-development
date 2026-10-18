# Figma reference traceability — 72 requested nodes

These are 72 references, not 72 independent pages. They include page states, shared components, date labels and an empty container. All requested IDs were submitted for design-context retrieval. Sparse whole-page responses were correlated with direct screenshots and shared high-fidelity component/page counterparts. Initial metadata-limit responses were recovered through design-context retrieval; no page was invented from a missing frame name.

This is an implementation map, not a claim of pixel-identical output or completed live backend acceptance. Exact assets and real-browser verification remain blocked. See `ABRIGO-HANDOFF.md`.

| Figma node | Design/component | Implementation or owner | Status / deliberate difference |
| --- | --- | --- | --- |
| `705:14000` | Event details | `/events/[id]` | Reused and extended; live event DTO mapping still needed. |
| `705:14121` | Related events | `RelatedEvents` | Dynamic related cards, excluding current event; no duplicated fake inventory. |
| `705:24585` | About, not logged in | `/about` | Existing public content reused. |
| `705:24622` | Contact, not logged in | `/contact` | Existing public content; honest mailto behavior, not direct delivery. |
| `705:16349` | Tickets, not logged in | `/events/[id]/tickets` | Public locked fallback preserved. |
| `705:18693` | Application notice modal | `OrganizerPreview / Dialog` | Notice only; application success claim intentionally not implemented. |
| `705:13981` | Events listing | `/events / EventsBrowser` | Dynamic month groups, filtering and loading/error states. |
| `705:13478` | Attendee account hover | `AccountChoice` | Hover/focus state reused. |
| `705:15769` | Organizer step 2 | `/register/organizer` | Disabled visual preview; onboarding undecided. |
| `705:15673` | Organizer account hover | `AccountChoice` | Hover/focus state reused. |
| `705:15728` | Organizer step 1 | `/register/organizer` | Disabled visual preview; no privileged public registration. |
| `705:15692` | Attendee registration | `/register/attendee` | Separate first/last names per assigned requirements; adapter disconnected. |
| `705:13472` | Account choice | `/register` | Account choice; organizer policy notice. |
| `705:18706` | Temporary role overlay | `AuthModal` | Replaced role buttons with shared-login access; no self-assigned roles. |
| `705:13468` | Login | `/login` | Form behavior implemented; session integration and exact background missing. |
| `705:24443` | About alternate hero | `/about/experience` | Alternate hero; exact illustration assets missing. |
| `705:12863` | Landing | `/` | Existing landing reused; decorative imagery differs. |
| `705:15916` | ATTENDEE USER PROFILE PAGE | `Excluded from Abrigo implementation` | Attendee user profile and account settings — Sherwin. |
| `705:16174` | ATTENDEE TICKETS PAGE | `Excluded from Abrigo implementation` | My Tickets — Sherwin. |
| `705:15302` | Section 9 | `EventsBrowser / EventCard` | November section reused through dynamic month grouping. |
| `705:15100` | Section 12 | `EventsBrowser / EventCard` | March section reused; displayed dates come from data, not prototype labels. |
| `705:14898` | Section 13 | `EventsBrowser / EventCard` | May section reused; missing Bruno Mars asset/data not fabricated. |
| `705:14696` | Section 11 | `EventsBrowser / EventCard` | February section reused; missing Young K asset/data not fabricated. |
| `705:14494` | Section 10 | `EventsBrowser / EventCard` | December section reused; missing Le Sserafim asset/data not fabricated. |
| `705:13139` | Section 3 | `BrowseCategory` | Existing category section and working filter navigation reused. |
| `705:13507` | Container | `dateBadge / EventCard` | Tiny date primitive; real event date formatting, not an additional page. |
| `705:14147` | Container | `Navbar` | Public navigation links reused. |
| `705:15505` | Register Card — Choose Account Type | `AccountChoice` | Reusable account-choice panel; organizer controls remain preview-only. |
| `705:13505` | Container | `dateBadge / EventCard` | Date primitive; no separate page. |
| `705:13503` | 2025 | `dateBadge / EventCard` | Year label derives from event date; no hardcoded 2025 override. |
| `705:13385` | Section 1 | `Hero / HeroMockups` | Existing hero retained; exact collage asset still unavailable. |
| `705:13050` | Section 5 | `WhyChooseUs` | Existing section reused; claims are preview copy pending team approval. |
| `705:14288` | Section 8 | `EventsBrowser / EventCard` | October month section; real list items instead of four copies of one event. |
| `705:13509` | Container | `dateBadge / EventCard` | Date primitive; no separate page. |
| `705:13511` | Container | `dateBadge / EventCard` | Date primitive; no separate page. |
| `705:13182` | Section 2 | `TrendingEvents` | Existing four-card preview; not a fabricated seven-event inventory. |
| `705:14131` | Section 2 — Event Filters | `EventsBrowser / FilterSelect` | Shared filter bar with responsive wrapping. |
| `705:12949` | Section 7 | `OrganizerBanner` | CTA links to disabled onboarding preview. |
| `705:14127` | Section 1 — Events Hero | `/events` | Existing events hero reused. |
| `705:13497` | Background — Login AND Register Page | `AuthShell` | Structure retained; concert background asset is still missing. |
| `705:13093` | Section 4 | `HowItWorks` | Existing section reused. |
| `705:12875` | Footer | `Footer` | Existing footer reused; unsupplied destinations remain honest. |
| `705:13450` | Log in Form | `AuthForm` | Shared login form and validation. |
| `705:13504` | Container | `No standalone component` | Empty off-canvas 100×100 design container; no user-facing route added. |
| `705:12965` | Section 6 | `Testimonials` | Existing sample testimonial section retained; content approval remains. |
| `705:13430` | Nav | `Navbar` | Public header reused with safe account and search controls. |
| `705:24039` | Filter - All Locations | `FilterSelect` | Open/closed/selected location variants; actual source locations only. |
| `705:24034` | Dropdown Item | `FilterSelect` | Dropdown item hover/active styling and keyboard interaction. |
| `705:24026` | Field | `EventsBrowser / FilterSelect` | Composed filters; data drives options. |
| `705:24025` | Aventix-Search-Results | `EventSearchField` | Matching-results panel using a supplied public event index. |
| `705:23963` | Aventix-Search-Field | `EventSearchField` | Search/default/filled/clear states. |
| `705:24140` | Filter - All Dates | `FilterSelect / matchesDate` | Date choices and keyboard dropdown. |
| `705:23893` | Group 3 | `AccountMenu` | Shared account dropdown; display identity and destinations from real session adapter. |
| `705:16331` | ATTENDEE DROPDOWN | `Navbar / AccountMenu` | Signed-in header variant; no hardcoded Sherwin account. |
| `705:19955` | BOOKING CONFIRMATION | `/bookings/[bookingId]/confirmation` | Record-backed status and ticket links; success only for authoritative eligible confirmed/paid data. |
| `705:16035` | ATTENDEE BOOKING HISTORY PAGE | `Excluded from Abrigo implementation` | Attendee booking-history/digital-ticket area — Sherwin. |
| `705:15806` | ATTENDEE DASHBOARD PAGE | `Excluded from Abrigo implementation` | Attendee dashboard — Sherwin. |
| `705:16301` | Setting Option | `Excluded from Abrigo implementation` | Attendee sidebar/navigation area — Sherwin; only shared header/logout integration is supplied. |
| `705:24342` | Filter - All Genres | `FilterSelect` | Genre choices from event data. |
| `705:23956` | Aventix Search bar | `EventSearchField` | Compact search field. |
| `705:24008` | Aventix-Search-Result-Item | `EventSearchField` | Result item and keyboard/pointer active state. |
| `705:24241` | Filter - All Categories | `FilterSelect` | Category options from actual event data. |
| `705:24532` | Aventix Contact Us Page | `/contact + AccountMenu` | Same public content with session-aware header; no duplicate route. |
| `705:12785` | Selected Ticket and Booking Summary | `/bookings/[bookingId]/summary` | Server-created booking, exact allocated seats, trusted totals; no invented fee or marketing consent. |
| `705:18617` | Footer | `Footer` | Shared footer reused. |
| `705:12628` | ATTENDEE LOGGED IN - Aventix Event TICKET SELECTION | `/events/[id]/tickets / TicketSelection` | Signed-in controls require shared verified session and current ticket-options adapter. |
| `705:23101` | TICKET PAYMENT | `/bookings/[bookingId]/payment` | Supported-method instructions and optional trusted provider QR/link; static GCash QR is not reused as a live payment. |
| `705:24493` | Aventix About Us Page | `/about + AccountMenu` | Same public content with session-aware header. |
| `705:23134` | SEAT  PROJECT | `/events/[id]/seats` | Dynamic numbered-seat selection; no hardcoded seat inventory. |
| `705:17078` | ATTENDEE LOGGED IN - Aventix Events Page | `/events + AccountMenu` | Reuses event browsing and authenticated header; no second listing app. |
| `705:18385` | ATTENDEE LOGGED IN - Aventix Event Details | `/events/[id] + AccountMenu` | Reuses public details with authenticated header. |
| `705:16517` | ATTENDEE LOGGED IN | `/ + AccountMenu` | Reuses existing landing with authenticated header. |

## Fidelity limits

- Existing supplied raster images are preserved; missing Figma backgrounds, collage, icons and seat-plan/album artwork are not replaced with unrelated stock imagery.
- Availability, event dates, prices and counts come from supplied data. Prototype duplicates or inconsistent month labels are not treated as authoritative inventory.
- Organizer/admin role-selection and unverified application/payment success are intentionally absent.
- Provider payment screens remain provider-owned. A static prototype QR is not an actual payable code.
- No attendee dashboard, profile, My Tickets, digital-ticket details or booking-history implementation was added. Ticket links require Sherwin/backend integration.
- Marketing consent belonging to a different organization in the prototype is not inserted into Aventix payment submission.
- Responsive CSS is implemented, but browser screenshots, exact asset geometry, overflow and assistive-technology review still need verification.
