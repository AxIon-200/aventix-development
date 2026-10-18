import { Eye } from "lucide-react";
import { Payment } from "@/app/admin/types/payments";
import { Column } from "@/app/admin/components/data-table/types";
import { TransactionStatusBadge } from "@/app/admin/components/payments/paymentStatus";
import { formatDateTime } from "@/app/admin/lib/dateTime";
import { formatPeso } from "@/app/admin/lib/currency";

type Handlers = {
  onView: (payment: Payment) => void;
};

export function getPaymentColumns({ onView }: Handlers): Column<Payment>[] {
  return [
    {
      header: "Payment ID",
      render: (p) => <span className="font-medium text-white">{p.paymentCode}</span>,
    },
    { header: "User", render: (p) => p.userName },
    { header: "Payment Method", render: (p) => p.methodLabel },
    {
      header: "Amount",
      align: "center",
      render: (p) => <span className="font-medium text-white">{formatPeso(p.amount)}</span>,
    },
    { header: "Status", render: (p) => <TransactionStatusBadge status={p.status} /> },
    {
      header: "Date",
      className: "whitespace-nowrap text-slate-400",
      render: (p) => formatDateTime(p.createdAt),
    },
    {
      header: "Actions",
      align: "center",
      render: (p) => (
        <button
          onClick={() => onView(p)}
          aria-label={`View payment ${p.paymentCode}`}
          title="View details"
          className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];
}
