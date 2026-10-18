"use client";

import { usePathname } from "next/navigation";
import { UserRole, ROLE_CONFIGS } from "@/types/roles";

export interface UseRoleReturn {
  currentRole: UserRole;
  isGuest: boolean;
  isAttendee: boolean;
  isOrganizer: boolean;
  isAdmin: boolean;
  dashboardPath: string;
  allowedPrefixes: string[];
  displayName: string;
}

/**
 * Hook to inspect the active role context and permissions based on route hierarchy.
 */
export function useRole(): UseRoleReturn {
  const pathname = usePathname() || "";

  let currentRole: UserRole = "GUEST";

  if (pathname.startsWith("/admin")) {
    currentRole = "ADMINISTRATOR";
  } else if (pathname.startsWith("/organizer")) {
    currentRole = "ORGANIZER";
  } else if (pathname.startsWith("/dashboard") || pathname.startsWith("/bookings")) {
    currentRole = "ATTENDEE";
  } else {
    currentRole = "GUEST";
  }

  const config = ROLE_CONFIGS[currentRole];

  return {
    currentRole,
    isGuest: currentRole === "GUEST",
    isAttendee: currentRole === "ATTENDEE",
    isOrganizer: currentRole === "ORGANIZER",
    isAdmin: currentRole === "ADMINISTRATOR",
    dashboardPath: config.dashboardPath,
    allowedPrefixes: config.allowedPrefixes,
    displayName: config.displayName,
  };
}
