// Data contracts for User Management. Build the backend to return exactly
// these shapes and nothing on the frontend needs to change.

export type UserStatus = "active" | "inactive" | "pending";

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

export type UserStatusFilter = UserStatus | "all";

export type UserListParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: UserStatusFilter;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number; // total rows matching the filters (not just this page)
  page: number;
  pageSize: number;
};

export type UserStats = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  newThisMonth: number;
};
