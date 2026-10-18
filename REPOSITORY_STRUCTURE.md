# Aventix Repository Structure & Role-Based Architecture Guide

This document defines the organized structure of the Aventix repository, designed around four primary user roles, clean separation of concerns, and team development ownership.

---

## 1. System User Roles

The platform is partitioned into four distinct user domains:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          AVENTIX PLATFORM                              │
├───────────────┬────────────────────┬───────────────────┬───────────────┤
│    GUEST      │   ATTENDEE/USER    │     ORGANIZER     │ ADMINISTRATOR │
│ (Public View) │ (Ticket Purchaser) │  (Event Creator)  │ (Back Office) │
└───────────────┴────────────────────┴───────────────────┴───────────────┘
```

| Role | Target Persona | Primary Responsibilities | Route Base | Assignee |
| :--- | :--- | :--- | :--- | :--- |
| **Guest** | Unauthenticated visitors | Browse events, filter categories, view lineup, public landing page, authentication | `/`, `/events` | Abrigo & Mary |
| **Attendee/User** | Authenticated event-goers | View purchased tickets, QR entrance passes, past booking receipts, profile & rewards | `/dashboard` | Sherwin |
| **Organizer** | Event organizers & producers | Create events, configure ticket tiers, gate QR check-in scanner, sales analytics, payouts | `/organizer` | Mary |
| **Administrator** | Platform operators | Platform metrics, user moderation, organizer approvals, event oversight, audit logs | `/admin` | Shai |

---

## 2. Directory Layout

```
aventix-development/
├── backend/                             # Express & Prisma Backend
│   ├── prisma/
│   │   ├── migrations/                  # Database migration history
│   │   └── schema.prisma                # Supabase PostgreSQL schema with UserRole enum
│   └── src/
│       ├── config/                      # Environment and app config
│       ├── controllers/                 # Controllers partitioned by domain
│       │   ├── guest.controller.ts      # Public events & category controllers
│       │   ├── attendee.controller.ts   # Attendee dashboard & ticket queries
│       │   ├── organizer.controller.ts  # Organizer events, tiers & scanner
│       │   ├── admin.controller.ts      # Administrative analytics & moderation
│       │   └── health.controller.ts     # Health-check endpoints
│       ├── middlewares/
│       │   └── role.middleware.ts       # Role-based access control (RBAC) guard
│       ├── routes/                      # Route modules matching the 4 roles
│       │   ├── guest.routes.ts          # /api/guest/*
│       │   ├── attendee.routes.ts       # /api/attendee/* (Auth + Role Guard)
│       │   ├── organizer.routes.ts      # /api/organizer/* (Auth + Role Guard)
│       │   ├── admin.routes.ts          # /api/admin/* (Auth + Role Guard)
│       │   └── index.ts                 # Central router mounting all domains
│       └── server.ts                    # Backend entrypoint
│
├── public/                              # Static public assets (images, logos, icons)
│   └── images/
│
├── src/                                 # Next.js App Router Frontend
│   ├── app/                             # Routing tree organized by role
│   │   ├── page.tsx                     # [GUEST] Public landing page
│   │   ├── layout.tsx                   # Global root HTML shell & metadata
│   │   │
│   │   ├── dashboard/                   # [ATTENDEE] Customer portal
│   │   │   ├── layout.tsx               # Attendee layout (Sidebar + Content shell)
│   │   │   ├── page.tsx                 # Attendee dashboard overview
│   │   │   ├── tickets/page.tsx         # My tickets & digital QR passes
│   │   │   ├── booking-history/page.tsx # Transaction history & receipts
│   │   │   └── profile/page.tsx         # Attendee profile & rewards
│   │   │
│   │   ├── organizer/                   # [ORGANIZER] Event management portal
│   │   │   ├── layout.tsx               # Organizer layout (OrganizerSidebar + Topbar)
│   │   │   ├── page.tsx                 # Redirects to /organizer/dashboard
│   │   │   ├── dashboard/page.tsx       # Live ticket sales & revenue metrics
│   │   │   ├── events/page.tsx          # Manage active & draft events
│   │   │   ├── events/new/page.tsx      # Create event wizard
│   │   │   ├── check-in/page.tsx        # Gate QR code ticket scanner
│   │   │   ├── analytics/page.tsx       # Tier sales & revenue breakdown
│   │   │   └── profile/page.tsx         # Organizer brand & payout settings
│   │   │
│   │   └── admin/                       # [ADMINISTRATOR] Platform management
│   │       ├── layout.tsx               # Admin layout (AdminSidebar + AdminTopbar)
│   │       ├── page.tsx                 # Redirects to /admin/dashboard
│   │       ├── components/              # Admin UI widgets, dialogs & tables
│   │       ├── hooks/                   # Admin query & filter hooks
│   │       ├── lib/                     # Admin formatting & mock utilities
│   │       ├── services/                # Admin API service clients
│   │       ├── types/                   # Admin data contracts
│   │       └── (pages)/                 # Route group for admin pages
│   │           ├── dashboard/page.tsx   # Platform control center
│   │           ├── users/page.tsx       # User management
│   │           ├── organizers/page.tsx  # Organizer verification
│   │           ├── events/page.tsx      # Event oversight
│   │           ├── bookings/page.tsx    # Booking inspection
│   │           ├── payments/page.tsx    # Financial transactions
│   │           ├── activity-logs/       # Platform audit trails
│   │           ├── profile/page.tsx     # Admin personal settings
│   │           └── settings/page.tsx    # Platform settings
│   │
│   ├── components/                      # Role-organized components
│   │   ├── shared/                      # Shared brand & UI components
│   │   │   └── index.ts                 # Navbar, Footer, AventixLogo, common modals
│   │   ├── guest/                       # Guest & public landing components
│   │   │   └── index.ts                 # Hero, TrendingEvents, Categories, HowItWorks
│   │   ├── attendee/                    # Attendee dashboard components
│   │   │   └── index.ts                 # DashboardSidebar, Topbar, StatCard, UpcomingEvents
│   │   ├── organizer/                   # Organizer portal components
│   │   │   ├── OrganizerSidebar.tsx
│   │   │   ├── OrganizerTopbar.tsx
│   │   │   ├── OrganizerStatCard.tsx
│   │   │   └── index.ts
│   │   └── dashboard/                   # Preserved for backward compatibility
│   │
│   ├── lib/                             # Data layer & API clients
│   │   ├── dashboard.ts                 # Attendee data fetching & mock fallbacks
│   │   └── organizer.ts                 # Organizer data fetching & mock fallbacks
│   │
│   └── types/                           # Strongly typed data models
│       ├── roles.ts                     # UserRole enum & route mapping
│       ├── guest.ts                     # Public events & filters
│       ├── attendee.ts                  # Attendee tickets, stats & history
│       ├── organizer.ts                 # Organizer metrics, events & payouts
│       └── index.ts                     # Central type re-exports
```

---

## 3. Role-Based Access Control (RBAC) & Routing Matrix

| Route | Role Permitted | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `/` | `GUEST`, Any | No | Public landing page, trending events showcase |
| `/events` | `GUEST`, Any | No | Event search, filters, category exploration |
| `/login`, `/register` | `GUEST` | No | Shared authentication dialogs / pages |
| `/dashboard` | `ATTENDEE`, `ADMIN` | Yes | Attendee dashboard overview |
| `/dashboard/tickets` | `ATTENDEE`, `ADMIN` | Yes | Attendee digital tickets & QR codes |
| `/dashboard/booking-history`| `ATTENDEE`, `ADMIN` | Yes | Booking receipts & payment records |
| `/dashboard/profile` | `ATTENDEE`, `ADMIN` | Yes | Personal account preferences & loyalty points |
| `/organizer/dashboard` | `ORGANIZER`, `ADMIN` | Yes | Organizer revenue & sales overview |
| `/organizer/events` | `ORGANIZER`, `ADMIN` | Yes | Organizer event management |
| `/organizer/events/new` | `ORGANIZER`, `ADMIN` | Yes | Event creation flow |
| `/organizer/check-in` | `ORGANIZER`, `ADMIN` | Yes | Gate QR scanner for admission |
| `/organizer/analytics` | `ORGANIZER`, `ADMIN` | Yes | Ticket tier breakdown & sales reports |
| `/organizer/profile` | `ORGANIZER`, `ADMIN` | Yes | Organizer company bio & bank payout info |
| `/admin/dashboard` | `ADMINISTRATOR` | Yes | Platform control center & gross metrics |
| `/admin/users` | `ADMINISTRATOR` | Yes | Manage attendee & organizer accounts |
| `/admin/organizers` | `ADMINISTRATOR` | Yes | Approve organizer applications |
| `/admin/events` | `ADMINISTRATOR` | Yes | Platform event approval & content moderation |
| `/admin/bookings` | `ADMINISTRATOR` | Yes | System booking records & dispute handling |
| `/admin/payments` | `ADMINISTRATOR` | Yes | Payouts, transaction status & financial ledger |
| `/admin/activity-logs` | `ADMINISTRATOR` | Yes | Audit logging of all critical platform changes |
| `/admin/settings` | `ADMINISTRATOR` | Yes | Global settings, maintenance modes & rules |

---

## 4. API Convention by Role

The backend exposes clean, role-segmented routes under `/api`:

```http
# Guest / Public
GET  /api/guest/events
GET  /api/guest/categories

# Attendee
GET  /api/attendee/dashboard
GET  /api/attendee/tickets
GET  /api/attendee/bookings

# Organizer
GET  /api/organizer/dashboard
GET  /api/organizer/events
POST /api/organizer/check-in

# Administrator
GET  /api/admin/dashboard/overview
GET  /api/admin/users
GET  /api/admin/organizers
GET  /api/admin/bookings
```

Protected endpoints validate sessions using `requireRole(...)` middleware:
```ts
// Example: backend/src/routes/organizer.routes.ts
router.use(requireRole("ORGANIZER", "ADMINISTRATOR"));
```

---

## 5. Guidelines for Team Members

1. **Abrigo (Guest & Public / Auth)**:
   - Place public components in `src/components/guest/` or `src/components/shared/`.
   - Place public pages in `src/app/` or `src/app/(public)/`.
   - Place public types in `src/types/guest.ts`.

2. **Sherwin (Attendee / User)**:
   - Place attendee-specific components in `src/components/attendee/` (or `src/components/dashboard/`).
   - Place attendee pages under `src/app/dashboard/` (`tickets/`, `booking-history/`, `profile/`).
   - Place attendee types in `src/types/attendee.ts`.

3. **Mary (Organizer Pages)**:
   - Place organizer components in `src/components/organizer/`.
   - Place organizer pages under `src/app/organizer/` (`dashboard/`, `events/`, `check-in/`, `analytics/`, `profile/`).
   - Place organizer types in `src/types/organizer.ts` and data layer in `src/lib/organizer.ts`.

4. **Shai (Administrator Pages)**:
   - Maintain the administrator modules under `src/app/admin/`.
   - Route group `(pages)` maps directly to `/admin/*` URLs (e.g. `/admin/dashboard`).

5. **Moyamoy (Backend & Database)**:
   - Controllers are modularized in `backend/src/controllers/` by role: `guest`, `attendee`, `organizer`, `admin`.
   - Routes are mapped in `backend/src/routes/` and guarded with `requireRole(...)`.
