"use client";

import { useMemo, useState } from "react";
import { AdminBooking, BookingFilters, PaymentDecision } from "@/app/admin/types/bookings";
import {
  exportBookings,
  getBookingEventOptions,
  getBookings,
  getBookingStats,
  updatePaymentStatus,
} from "@/app/admin/services/bookingService";
import { useListQuery } from "@/app/admin/hooks/useListQuery";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { downloadBlob } from "@/app/admin/lib/download";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ExportButton } from "@/app/admin/components/ui/ExportButton";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataList } from "@/app/admin/components/data-table/DataList";
import { FilterConfig } from "@/app/admin/components/data-table/types";
import { BookingStatsCards } from "@/app/admin/components/bookings/BookingStatsCards";
import { getBookingColumns } from "@/app/admin/components/bookings/bookingColumns";
import { BOOKING_STATUS_OPTIONS } from "@/app/admin/components/bookings/bookingStatus";
import { BookingDetailsModal } from "@/app/admin/components/bookings/BookingDetailsModal";
import {
  BookingPaymentDialog,
  PaymentTarget,
} from "@/app/admin/components/bookings/BookingPaymentDialog";

const PAGE_SIZE = 10;

export default function BookingsPage() {
  const toast = useToast();

  const list = useListQuery<AdminBooking, BookingFilters>({
    fetcher: getBookings,
    initialFilters: { status: "all", event: "all" },
    pageSize: PAGE_SIZE,
  });

  // The cards follow the current search + filters (see BookingStatsCards).
  const stats = useFetch(
    () => getBookingStats({ search: list.search, filters: list.filters }),
    [list.search, list.filters.status, list.filters.event]
  );

  // The "All event" dropdown is filled from the backend.
  const eventOptions = useFetch(getBookingEventOptions, []);
  const filters = useMemo<FilterConfig[]>(
    () => [
      { key: "status", label: "Filter by booking status", allLabel: "All booking status", options: BOOKING_STATUS_OPTIONS },
      { key: "event", label: "Filter by event", allLabel: "All event", options: eventOptions.data ?? [] },
    ],
    [eventOptions.data]
  );

  const [viewId, setViewId] = useState<string | null>(null);
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  function openPayment(b: AdminBooking) {
    setTarget({
      booking: {
        id: b.id,
        bookingCode: b.bookingCode,
        customerName: b.customerName,
        amount: b.amount,
        status: b.status,
        paymentStatus: b.paymentStatus,
      },
    });
  }

  const columns = useMemo(
    () =>
      getBookingColumns({
        onView: (b) => setViewId(b.id),
        onManagePayment: (b) =>
          setTarget({
            booking: {
              id: b.id,
              bookingCode: b.bookingCode,
              customerName: b.customerName,
              amount: b.amount,
              status: b.status,
              paymentStatus: b.paymentStatus,
            },
          }),
      }),
    []
  );

  // Details modal -> payment dialog (close the modal first so they don't stack)
  function requestPayment(b: AdminBooking) {
    setViewId(null);
    openPayment(b);
  }

  async function confirmPayment(paymentStatus: PaymentDecision, note?: string) {
    if (!target) return;
    setIsUpdating(true);
    try {
      await updatePaymentStatus(target.booking.id, paymentStatus, note);
      toast.success(
        paymentStatus === "paid"
          ? `${target.booking.bookingCode} was marked as paid.`
          : `${target.booking.bookingCode} was refunded and cancelled.`
      );
      setTarget(null);
      list.refetch();
      stats.refetch();
    } catch (err) {
      // Keep the dialog open so the admin can retry.
      toast.error(err instanceof Error ? err.message : "Failed to update payment.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleExport() {
    if (list.total === 0) {
      toast.info("There are no bookings to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportBookings({ search: list.search, filters: list.filters });
      downloadBlob(blob, `bookings-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Bookings exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export bookings.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Booking Operations"
        title="Booking Management"
        description="Monitor platform bookings, status, attendee records, and payment state."
        action={<ExportButton onClick={handleExport} isLoading={isExporting} />}
      />

      <BookingStatsCards
        stats={stats.data}
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
      />

      <DataList
        list={list}
        columns={columns}
        getRowId={(b) => b.id}
        noun="bookings"
        searchPlaceholder="Search bookings…"
        filters={filters}
        emptyTitle="No bookings yet"
        emptyDescription="Bookings will appear here as soon as attendees purchase tickets."
        minTableWidth={980}
      />

      <BookingDetailsModal
        bookingId={viewId}
        onClose={() => setViewId(null)}
        onManagePayment={requestPayment}
      />

      <BookingPaymentDialog
        target={target}
        isLoading={isUpdating}
        onConfirm={confirmPayment}
        onCancel={() => !isUpdating && setTarget(null)}
      />
    </div>
  );
}
