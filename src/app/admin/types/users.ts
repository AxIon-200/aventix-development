// Data contracts for User Management.
// PaginatedResult / ListParams now live in types/common.ts (shared by all lists).

export type UserStatus = "active" | "inactive" | "pending";
export type UserStatusFilter = UserStatus | "all";

// What an admin can switch a user to from the table / details modal.
export type UserDecision = Exclude<UserStatus, "pending">;

export type UserFilters = { status: UserStatusFilter };

export type ManagedUser = {
  id: string;
  userCode: string; // display id, e.g. "USR-1002"
  name: string;
  email: string;
  status: UserStatus;
  joinedAt: string; // ISO date string
  avatarUrl?: string | null;
};

// Returned by GET /admin/users/:id (shown in the details modal)
export type UserDetails = ManagedUser & {
  phone?: string | null;
  lastActiveAt?: string | null;
  totalBookings: number;
  ticketsPurchased: number;
};

export type UserStats = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  newThisMonth: number;
};
