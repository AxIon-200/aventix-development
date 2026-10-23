import type { AccountRole } from "./client";

export const workspaceNavigation: Record<AccountRole, { label: string; href: string }[]> = {
  ATTENDEE: [
    { label: "Attendee workspace", href: "/dashboard" },
    { label: "My Tickets", href: "/dashboard/tickets" },
    { label: "Booking History", href: "/dashboard/booking-history" },
    { label: "Profile", href: "/dashboard/profile" },
  ],
  ORGANIZER: [
    { label: "Organizer workspace", href: "/organizer/dashboard" },
    { label: "Events", href: "/organizer/events" },
    { label: "Create event", href: "/organizer/events/new" },
    { label: "Analytics", href: "/organizer/analytics" },
    { label: "Check-in", href: "/organizer/check-in" },
    { label: "Profile", href: "/organizer/profile" },
  ],
  ADMINISTRATOR: [
    { label: "Administrator workspace", href: "/admin/dashboard" },
    { label: "Users", href: "/admin/users" },
    { label: "Organizers", href: "/admin/organizers" },
    { label: "Events", href: "/admin/events" },
    { label: "Bookings", href: "/admin/bookings" },
    { label: "Payments", href: "/admin/payments" },
    { label: "Activity logs", href: "/admin/activity-logs" },
    { label: "Profile", href: "/admin/profile" },
    { label: "Settings", href: "/admin/settings" },
  ],
};
