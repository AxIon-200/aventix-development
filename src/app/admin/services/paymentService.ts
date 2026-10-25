import type { Payment, PaymentDetails, PaymentFilters, PaymentStats } from "@/app/admin/types/payments";
import type { ListParams, PaginatedResult } from "@/app/admin/types/common";

const BASE = "/api/v1/admin/payments";
type Query = Pick<ListParams<PaymentFilters>, "search" | "filters">;
async function responseFor(path: string) {
  let response: Response;
  try { response = await fetch(BASE + path, { credentials: "include", cache: "no-store" }); }
  catch { throw new Error("Could not connect to payment management."); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "The payment request failed.");
  }
  return response;
}
function queryFor({ search, filters }: Query) {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (filters.status !== "all") query.set("status", filters.status);
  return query;
}
export async function getPayments(params: ListParams<PaymentFilters>): Promise<PaginatedResult<Payment>> {
  const query = queryFor(params);
  query.set("page", String(params.page)); query.set("pageSize", String(params.pageSize));
  return (await responseFor("?" + query)).json();
}
export async function getPaymentStats(query: Query): Promise<PaymentStats> {
  return (await responseFor("/stats?" + queryFor(query))).json();
}
export async function getPaymentById(id: string): Promise<PaymentDetails> {
  return (await responseFor("/" + encodeURIComponent(id))).json();
}
export async function exportPayments(query: Query): Promise<Blob> {
  return (await responseFor("/export?" + queryFor(query))).blob();
}
