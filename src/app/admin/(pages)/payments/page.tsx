"use client";

import { useMemo, useState } from "react";
import { Payment, PaymentFilters } from "@/app/admin/types/payments";
import {
  exportPayments,
  getPayments,
  getPaymentStats,
} from "@/app/admin/services/paymentService";
import { useListQuery } from "@/app/admin/hooks/useListQuery";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { downloadBlob } from "@/app/admin/lib/download";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ExportButton } from "@/app/admin/components/ui/ExportButton";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataList } from "@/app/admin/components/data-table/DataList";
import { FilterConfig } from "@/app/admin/components/data-table/types";
import { PaymentStatsCards } from "@/app/admin/components/payments/PaymentStatsCards";
import { getPaymentColumns } from "@/app/admin/components/payments/paymentColumns";
import { TRANSACTION_STATUS_OPTIONS } from "@/app/admin/components/payments/paymentStatus";
import { PaymentDetailsModal } from "@/app/admin/components/payments/PaymentDetailsModal";

const PAGE_SIZE = 10;

const FILTERS: FilterConfig[] = [
  {
    key: "status",
    label: "Filter by payment status",
    allLabel: "All payment status",
    options: TRANSACTION_STATUS_OPTIONS,
  },
];

export default function PaymentsPage() {
  const toast = useToast();

  const list = useListQuery<Payment, PaymentFilters>({
    fetcher: getPayments,
    initialFilters: { status: "all" },
    pageSize: PAGE_SIZE,
  });

  // The cards follow the current search + filters (see PaymentStatsCards).
  const stats = useFetch(
    () => getPaymentStats({ search: list.search, filters: list.filters }),
    [list.search, list.filters.status]
  );

  const [viewId, setViewId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const columns = useMemo(() => getPaymentColumns({ onView: (p) => setViewId(p.id) }), []);

  async function handleExport() {
    if (list.total === 0) {
      toast.info("There are no payments to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportPayments({ search: list.search, filters: list.filters });
      downloadBlob(blob, `payments-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Payments exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export payments.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance Administration"
        title="Payment Management"
        description="Review recorded payment transactions and inspect payment details."
        action={<ExportButton onClick={handleExport} isLoading={isExporting} />}
      />

      <PaymentStatsCards
        stats={stats.data}
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
      />

      <DataList
        list={list}
        columns={columns}
        getRowId={(p) => p.id}
        noun="transactions"
        searchPlaceholder="Search transactions…"
        filters={FILTERS}
        emptyTitle="No payments yet"
        emptyDescription="Payment transactions will appear here once attendees start paying for tickets."
        minTableWidth={900}
      />

      <PaymentDetailsModal paymentId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
