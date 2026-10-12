import {
  ManagedUser,
  UserDecision,
  UserDetails,
  UserFilters,
  UserStats,
} from "@/app/admin/types/users";
import { ListParams, PaginatedResult } from "@/app/admin/types/common";
import { DEMO, mockUsers } from "@/app/admin/lib/mock/mockUsers";
import { API_BASE, delay, toQueryString } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist.
const USE_MOCK = true;

// GET /admin/users?page=1&pageSize=10&search=noah&status=active
export async function getUsers(
  params: ListParams<UserFilters>
): Promise<PaginatedResult<ManagedUser>> {
  const { page, pageSize, search, filters } = params;

  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load users");
    const rows = filterMock(search, filters.status);
    const start = (page - 1) * pageSize;
    return { data: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  }

  const qs = toQueryString({
    page,
    pageSize,
    search,
    status: filters.status === "all" ? undefined : filters.status,
  });
  const res = await fetch(`${API_BASE}/admin/users?${qs}`);
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

// GET /admin/users/stats
export async function getUserStats(): Promise<UserStats> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load user statistics");
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      total: mockUsers.length,
      active: mockUsers.filter((u) => u.status === "active").length,
      inactive: mockUsers.filter((u) => u.status === "inactive").length,
      pending: mockUsers.filter((u) => u.status === "pending").length,
      newThisMonth: mockUsers.filter((u) => new Date(u.joinedAt).getTime() >= monthAgo).length,
    };
  }

  const res = await fetch(`${API_BASE}/admin/users/stats`);
  if (!res.ok) throw new Error("Failed to load user statistics");
  return res.json();
}

// GET /admin/users/:id
export async function getUserById(id: string): Promise<UserDetails> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load user details");
    const user = mockUsers.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    const n = Number(user.userCode.replace(/\D/g, "")) || 0;
    return {
      ...user,
      phone: `+63 917 ${String(100 + (n % 900)).padStart(3, "0")} ${String(1000 + ((n * 7) % 9000))}`,
      lastActiveAt: new Date(Date.now() - (n % 9) * 86_400_000).toISOString(),
      totalBookings: n % 12,
      ticketsPurchased: (n % 12) * 2,
    };
  }

  const res = await fetch(`${API_BASE}/admin/users/${id}`);
  if (!res.ok) throw new Error("Failed to load user details");
  return res.json();
}

// PATCH /admin/users/:id/status   body: { status: "active" | "inactive" }
export async function updateUserStatus(id: string, status: UserDecision): Promise<ManagedUser> {
  if (USE_MOCK) {
    await delay(500);
    failIfDemo("Failed to update user status");
    const user = mockUsers.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    user.status = status;
    return { ...user };
  }

  const res = await fetch(`${API_BASE}/admin/users/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update user status");
  return res.json();
}

// GET /admin/users/export?search=&status=   -> CSV file (Blob)
export async function exportUsers(
  params: Pick<ListParams<UserFilters>, "search" | "filters">
): Promise<Blob> {
  const { search, filters } = params;

  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to export users");
    const rows = filterMock(search, filters.status);
    const header = ["User ID", "Name", "Email", "Status", "Date Joined"];
    const lines = rows.map((u) =>
      [u.userCode, u.name, u.email, u.status, u.joinedAt.slice(0, 10)]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    return new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  }

  const qs = toQueryString({
    search,
    status: filters.status === "all" ? undefined : filters.status,
  });
  const res = await fetch(`${API_BASE}/admin/users/export?${qs}`);
  if (!res.ok) throw new Error("Failed to export users");
  return res.blob();
}

// ───────────── mock-only helpers ─────────────
function filterMock(search: string, status: UserFilters["status"]) {
  const q = search.trim().toLowerCase();
  return mockUsers
    .filter((u) => (status === "all" ? true : u.status === status))
    .filter((u) =>
      q ? [u.name, u.email, u.userCode].some((v) => v.toLowerCase().includes(q)) : true
    )
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}

function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}
