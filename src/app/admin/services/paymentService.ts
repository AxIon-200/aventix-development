import {
  Payment,
  PaymentDetails,
  PaymentFilters,
  PaymentStats,
} from "@/app/admin/types/payments";
import { ListParams, PaginatedResult } from "@/app/admin/types/common";
import { DEMO, MOCK_EVENT_TITLES, mockPayments } from "@/app/admin/lib/mock/mockPayments";
import { API_BASE, delay, toQueryString } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist. Nothing in the hooks,
// components, or page needs to change.
const USE_MOCK = true;

type Query = Pick<ListParams<PaymentFilters>, "search" | "filters">;

// GET /admin/payments?page=1&pageSize=10&search=mia&status=paid
export async function getPayments(
  params: ListParams<PaymentFilters>
): Promise<PaginatedResult<Payment>> {
  const { page, pageSize, search, filters } = params;

  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load payments");
    const rows = filterMock(search, filters);
    const start = (page - 1) * pageSize;
    return { data: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  }

  const res = await fetch(`${API_BASE}/admin/payments?${toQuery({ search, filters }, { page, pageSize })}`);
  if (!res.ok) throw new Error("Failed to load payments");
  return res.json();
}

// GET /admin/payments/stats?search=&status=
// Computed for the CURRENT search + filters (the design labels these
// cards "Current records").
export async function getPaymentStats(query: Query): Promise<PaymentStats> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load payment statistics");
    const rows = filterMock(query.search, query.filters);
    return {
      total: rows.length,
      paid: rows.filter((p) => p.status === "paid").length,
      pending: rows.filter((p) => p.status === "pending").length,
      recordedValue: rows.reduce((sum, p) => sum + p.amount, 0), // refunded included
    };
  }

  const res = await fetch(`${API_BASE}/admin/payments/stats?${toQuery(query)}`);
  if (!res.ok) throw new Error("Failed to load payment statistics");
  return res.json();
}

// GET /admin/payments/:id
export async function getPaymentById(id: string): Promise<PaymentDetails> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load payment details");
    const p = mockPayments.find((x) => x.id === id);
    if (!p) throw new Error("Payment not found");
    const n = Number(p.paymentCode.replace(/\D/g, "")) || 0;
    const MIN = 60_000;
    const DAY = 86_400_000;
    const created = new Date(p.createdAt).getTime();
    const timeline = [{ label: "Payment initiated", at: new Date(created).toISOString() }];
    if (p.status === "paid" || p.status === "refunded") {
      timeline.push({ label: "Payment captured", at: new Date(created + 2 * MIN).toISOString() });
    }
    if (p.status === "refunded") {
      timeline.push({ label: "Payment refunded", at: new Date(created + 2 * DAY).toISOString() });
    }
    return {
      ...p,
      userEmail: `${p.userName.toLowerCase().replace(/\s+/g, ".")}@email.com`,
      bookingCode: `BKG-${9031 + (n - 70331)}`,
      eventTitle: MOCK_EVENT_TITLES[(n - 70331) % MOCK_EVENT_TITLES.length],
      reference: `${p.methodLabel.split(" ")[0].toUpperCase()}-${n}-${String(n * 7919).slice(-6)}`,
      timeline,
    };
  }

  const res = await fetch(`${API_BASE}/admin/payments/${id}`);
  if (!res.ok) throw new Error("Failed to load payment details");
  return res.json();
}

// GET /admin/payments/export?search=&status=   -> CSV file (Blob)
// Exports ALL rows matching the current filters, not just the visible page.
export async function exportPayments(query: Query): Promise<Blob> {
  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to export payments");
    const rows = filterMock(query.search, query.filters);
    const header = ["Payment ID", "User", "Payment Method", "Amount", "Status", "Date"];
    const lines = rows.map((p) =>
      [p.paymentCode, p.userName, p.methodLabel, String(p.amount), p.status, p.createdAt]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    return new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  }

  const res = await fetch(`${API_BASE}/admin/payments/export?${toQuery(query)}`);
  if (!res.ok) throw new Error("Failed to export payments");
  return res.blob();
}

// ───────────── helpers ─────────────
function toQuery(query: Query, extra: Record<string, number> = {}) {
  return toQueryString({
    ...extra,
    search: query.search,
    status: query.filters.status === "all" ? undefined : query.filters.status,
  });
}

function filterMock(search: string, filters: PaymentFilters) {
  const q = search.trim().toLowerCase();
  return mockPayments
    .filter((p) => (filters.status === "all" ? true : p.status === filters.status))
    .filter((p) =>
      q ? [p.paymentCode, p.userName, p.methodLabel].some((v) => v.toLowerCase().includes(q)) : true
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}
