/**
 * Aventix User Roles & Permission Definitions
 * 
 * Defined roles across the platform:
 * - GUEST: Unauthenticated public visitors browsing events and platform information
 * - ATTENDEE: Authenticated regular users purchasing tickets and managing bookings
 * - ORGANIZER: Verified event creators managing events, ticket tiers, and attendance
 * - ADMINISTRATOR: Platform operators overseeing users, organizers, events, and system settings
 */

export type UserRole = "GUEST" | "ATTENDEE" | "ORGANIZER" | "ADMINISTRATOR";

export interface RoleNavigationItem {
  href: string;
  label: string;
  description?: string;
  iconName?: string;
  badge?: string;
}

export interface RoleRouteConfig {
  role: UserRole;
  basePath: string;
  dashboardPath: string;
  allowedPrefixes: string[];
  displayName: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleRouteConfig> = {
  GUEST: {
    role: "GUEST",
    basePath: "/",
    dashboardPath: "/",
    allowedPrefixes: ["/", "/events", "/about", "/contact", "/login", "/register", "/legal"],
    displayName: "Guest",
  },
  ATTENDEE: {
    role: "ATTENDEE",
    basePath: "/dashboard",
    dashboardPath: "/dashboard",
    allowedPrefixes: ["/dashboard", "/dashboard/tickets", "/dashboard/booking-history", "/dashboard/profile", "/bookings"],
    displayName: "Attendee / User",
  },
  ORGANIZER: {
    role: "ORGANIZER",
    basePath: "/organizer",
    dashboardPath: "/organizer/dashboard",
    allowedPrefixes: ["/organizer", "/organizer/dashboard", "/organizer/events", "/organizer/analytics", "/organizer/check-in", "/organizer/profile"],
    displayName: "Event Organizer",
  },
  ADMINISTRATOR: {
    role: "ADMINISTRATOR",
    basePath: "/admin",
    dashboardPath: "/admin/dashboard",
    allowedPrefixes: ["/admin", "/admin/dashboard", "/admin/users", "/admin/organizers", "/admin/events", "/admin/bookings", "/admin/payments", "/admin/activity-logs", "/admin/profile", "/admin/settings"],
    displayName: "Administrator",
  },
};
