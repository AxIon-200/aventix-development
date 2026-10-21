"use client";

import { useAccountSession } from "@/components/auth/useAccountSession";
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
 * Current account UI only. Page and API access still require live authorization.
 */
export function useRole(): UseRoleReturn {
  const { session } = useAccountSession();
  const currentRole: UserRole = session?.role ?? "GUEST";

  const config = ROLE_CONFIGS[currentRole];

  return {
    currentRole,
    isGuest: currentRole === "GUEST",
    isAttendee: currentRole === "ATTENDEE",
    isOrganizer: currentRole === "ORGANIZER",
    isAdmin: currentRole === "ADMINISTRATOR",
    dashboardPath: config.dashboardPath,
    allowedPrefixes: config.allowedPrefixes,
    displayName: session?.displayName ?? config.displayName,
  };
}
