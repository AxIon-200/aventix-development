import { TransactionStatus } from "@/app/admin/types/payments";
import { BadgeTone, StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export const TRANSACTION_STATUS: Record<TransactionStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "danger" },
};

export const TRANSACTION_STATUS_OPTIONS = (
  Object.keys(TRANSACTION_STATUS) as TransactionStatus[]
).map((value) => ({ value, label: TRANSACTION_STATUS[value].label }));

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const { label, tone } = TRANSACTION_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}
