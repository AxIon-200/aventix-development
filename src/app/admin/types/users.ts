// Data contracts for User Management.
// PaginatedResult / ListParams now live in types/common.ts (shared by all lists).

export type UserStatus = "active" | "disabled";
export type UserStatusFilter = UserStatus | "all";

// What an admin can switch a user to from the table / details modal.
export type UserDecision = UserStatus;

export type UserFilters = { status: UserStatusFilter };

export type ManagedUser = {
  id: string;
  userCode: string; // display ID: USR- followed by the account UUID
  name: string;
  email: string;
  emailVerified: boolean;
  status: UserStatus;
  joinedAt: string; // ISO date string
  avatarUrl?: string | null;
};

// Returned by GET /admin/users/:id (shown in the details modal)
export type UserDetails = ManagedUser & {
  phone?: string | null;
  totalBookings: number;
  ticketsPurchased: number;
};

export type UserStats = {
  total: number;
  active: number;
  newLast30Days: number;
  withBookings: number;
};
