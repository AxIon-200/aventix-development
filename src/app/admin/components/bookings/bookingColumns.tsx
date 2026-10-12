import { CreditCard, Eye } from "lucide-react";
import { AdminBooking } from "@/app/admin/types/bookings";
import { Column } from "@/app/admin/components/data-table/types";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/app/admin/components/bookings/bookingStatus";
import { getPaymentTransitions } from "@/app/admin/lib/bookingRules";
import { formatDate } from "@/app/admin/lib/format";
import { formatPeso } from "@/app/admin/lib/currency";

type Handlers = {
  onView: (booking: AdminBooking) => void;
  onManagePayment: (booking: AdminBooking) => void;
};

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400";

export function getBookingColumns({ onView, onManagePayment }: Handlers): Column<AdminBooking>[] {
  return [
    {
      header: "Booking ID",
      render: (b) => (
        <div>
          <p className="font-medium text-white">{b.bookingCode}</p>
          <p className="text-[11px] text-slate-500">{formatDate(b.createdAt)}</p>
        </div>
      ),
    },
    { header: "Event", className: "max-w-[200px] truncate", render: (b) => b.eventTitle },
    {
      header: "Customer",
      render: (b) => (
        <div className="min-w-0 max-w-[200px]">
          <p className="truncate text-slate-200">{b.customerName}</p>
          <p className="truncate text-[11px] text-slate-500">{b.customerEmail}</p>
        </div>
      ),
    },
    { header: "Tickets", align: "center", render: (b) => b.tickets },
    {
      header: "Amount",
      align: "center",
      render: (b) => <span className="font-medium text-white">{formatPeso(b.amount)}</span>,
    },
    { header: "Status", render: (b) => <BookingStatusBadge status={b.status} /> },
    { header: "Payment", render: (b) => <PaymentStatusBadge status={b.paymentStatus} /> },
    {
      header: "Actions",
      align: "center",
      render: (b) => {
        const canManagePayment = getPaymentTransitions(b).length > 0;
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onView(b)}
              aria-label={`View booking ${b.bookingCode}`}
              title="View details"
              className={iconBtn}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onManagePayment(b)}
              disabled={!canManagePayment}
              aria-label={`Manage payment for ${b.bookingCode}`}
              title={canManagePayment ? "Manage payment" : "No payment actions available"}
              className={iconBtn}
            >
              <CreditCard className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];
}
