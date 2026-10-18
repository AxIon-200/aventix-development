"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminBooking, PaymentDecision } from "@/app/admin/types/bookings";
import { Modal } from "@/app/admin/components/ui/Modal";
import { getPaymentTransitions } from "@/app/admin/lib/bookingRules";
import { formatPeso } from "@/app/admin/lib/currency";
import {
  PaymentStatusBadge,
} from "@/app/admin/components/bookings/bookingStatus";

export type PaymentTarget = {
  booking: Pick<
    AdminBooking,
    "id" | "bookingCode" | "customerName" | "amount" | "status" | "paymentStatus"
  >;
};

type Props = {
  target: PaymentTarget | null; // null = closed
  isLoading: boolean;
  onConfirm: (paymentStatus: PaymentDecision, note?: string) => void;
  onCancel: () => void;
};

const MAX_NOTE = 500;

const ACTIONS: Record<
  PaymentDecision,
  { label: string; confirm: string; danger: boolean; describe: (amount: number) => string }
> = {
  paid: {
    label: "Mark as paid",
    confirm: "Mark as paid",
    danger: false,
    describe: (amount) =>
      `Record ${formatPeso(amount)} as received. A pending booking becomes confirmed.`,
  },
  refunded: {
    label: "Refund payment",
    confirm: "Refund",
    danger: true,
    describe: (amount) =>
      `Record a ${formatPeso(amount)} refund. The booking will be cancelled and its tickets released.`,
  },
};

export function BookingPaymentDialog({ target, isLoading, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<PaymentDecision | null>(null);
  const [note, setNote] = useState("");

  const booking = target?.booking;
  const options = booking ? getPaymentTransitions(booking) : [];

  // When there is only one possible action, preselect it (no extra click).
  useEffect(() => {
    setSelected(options.length === 1 ? options[0] : null);
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const action = selected ? ACTIONS[selected] : null;

  return (
    <Modal
      isOpen={target !== null}
      onClose={onCancel}
      title="Manage payment"
      description={booking ? `${booking.bookingCode} · ${booking.customerName}` : undefined}
      size="md"
      closeDisabled={isLoading}
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Keep as is
          </button>
          <button
            onClick={() => selected && onConfirm(selected, note.trim() || undefined)}
            disabled={!selected || isLoading}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50 ${
              action?.danger
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-teal-500 text-slate-950 hover:bg-teal-400"
            }`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {action ? action.confirm : "Choose an option"}
          </button>
        </>
      }
    >
      {booking && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            Payment is currently <PaymentStatusBadge status={booking.paymentStatus} />
          </div>

          <div role="radiogroup" aria-label="Payment action" className="space-y-2">
            {options.map((value) => {
              const isSelected = selected === value;
              return (
                <button
                  key={value}
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isLoading}
                  onClick={() => setSelected(value)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                    isSelected ? "border-teal-400/60 bg-teal-500/5" : "border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? "border-teal-400" : "border-slate-600"
                    }`}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-teal-400" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-200">{ACTIONS[value].label}</span>
                    <span className="block text-xs text-slate-500">{ACTIONS[value].describe(booking.amount)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {selected && (
            <div>
              <label htmlFor="payment-note" className="text-xs font-medium text-slate-400">
                Note <span className="text-slate-600">(optional)</span>
              </label>
              <textarea
                id="payment-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
                disabled={isLoading}
                rows={3}
                placeholder="Kept on the booking's record, e.g. the transaction reference"
                className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-teal-400/60 disabled:opacity-60"
              />
              <p className="mt-1 text-right text-[11px] text-slate-600">
                {note.length}/{MAX_NOTE}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
