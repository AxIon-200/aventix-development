"use client";

import { useEffect, useState } from "react";
import { PaymentDetails } from "@/app/admin/types/payments";
import { getPaymentById } from "@/app/admin/services/paymentService";
import { formatDateTime } from "@/app/admin/lib/dateTime";
import { formatPeso } from "@/app/admin/lib/currency";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { TransactionStatusBadge } from "@/app/admin/components/payments/paymentStatus";

type Props = {
  paymentId: string | null; // null = closed
  onClose: () => void;
};

// Read-only: payment state is changed from the Booking page.
export function PaymentDetailsModal({ paymentId, onClose }: Props) {
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    setPayment(null);
    setError(null);
    setIsLoading(true);
    getPaymentById(paymentId)
      .then((p) => !cancelled && setPayment(p))
      .catch((e) => !cancelled && setError(e?.message ?? "Something went wrong"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [paymentId, tick]);

  const facts: [string, string][] = payment
    ? [
        ["User", payment.userName],
        ["Email", payment.userEmail],
        ["Payment method", payment.methodLabel],
        ["Reference", payment.reference],
        ["Booking", payment.bookingCode],
        ["Event", payment.eventTitle],
      ]
    : [];

  return (
    <Modal
      isOpen={paymentId !== null}
      onClose={onClose}
      title="Payment details"
      size="lg"
      footer={
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5"
        >
          Close
        </button>
      }
    >
      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          <div className="space-y-2">
            <div className="h-5 w-1/3 animate-pulse rounded bg-white/5" />
            <div className="h-5 w-1/4 animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-lg bg-white/5" />
        </div>
      )}

      {!isLoading && error && (
        <ErrorState compact title="Couldn't load payment" message={error} onRetry={() => setTick((t) => t + 1)} />
      )}

      {!isLoading && payment && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-white">{payment.paymentCode}</p>
              <p className="mb-1.5 text-xs text-slate-500">{formatDateTime(payment.createdAt)}</p>
              <TransactionStatusBadge status={payment.status} />
            </div>
            <p className="text-2xl font-semibold text-white">{formatPeso(payment.amount)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">History</h3>
            {payment.timeline.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-sm text-slate-500">
                No history recorded for this payment.
              </p>
            ) : (
              <ol className="divide-y divide-white/5 rounded-lg border border-white/10">
                {payment.timeline.map((entry) => (
                  <li key={`${entry.label}-${entry.at}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-sm text-slate-200">{entry.label}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(entry.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
