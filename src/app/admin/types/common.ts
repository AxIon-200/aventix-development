// Shared by EVERY list page (users, organizers, events, bookings, ...).
// Backend rule: every list endpoint accepts these params and returns this shape.

export type PaginatedResult<T> = {
  data: T[];
  total: number; // count of ALL rows matching the filters, not just this page
  page: number;
  pageSize: number;
};

export type ListParams<F extends Record<string, string> = Record<string, string>> = {
  page: number;
  pageSize: number;
  search: string;
  filters: F; // e.g. { status: "approved" }
};
