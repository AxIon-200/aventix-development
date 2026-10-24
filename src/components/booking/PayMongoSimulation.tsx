"use client";

import { useEffect, useRef } from "react";
import type { SimulationOutcome, SimulationSession } from "@/lib/paymongo-simulation";

export default function PayMongoSimulation({ session, onComplete }: {
  session: SimulationSession;
  onComplete: (outcome: SimulationOutcome) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="paymongo-title" aria-describedby="paymongo-description"
      onCancel={(event) => { event.preventDefault(); onComplete("cancelled"); }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-[#111622] p-6 text-white shadow-2xl backdrop:bg-black/80">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-300">Demo checkout</p>
      <h2 id="paymongo-title" className="mt-2 text-xl font-bold">PayMongo simulation</h2>
      <p id="paymongo-description" className="mt-3 text-sm text-slate-300">
        Local simulation only. No money is charged, no payment details are collected, and no real ticket is issued.
      </p>
      <dl className="my-5 space-y-3 rounded-xl bg-black/20 p-4 text-sm">
        <div className="flex justify-between"><dt>Payment method</dt><dd>{session.method}</dd></div>
        <div className="flex justify-between"><dt>Total</dt><dd className="font-bold text-teal-300">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(session.amountCentavos / 100)}</dd></div>
      </dl>
      <p className="mb-4 text-xs text-slate-400">Choose an outcome to test this checkout. Failed and cancelled attempts can be retried.</p>
      <div className="space-y-3">
        <button type="button" onClick={() => onComplete("paid")} className="w-full rounded-xl bg-teal-400 p-3 text-sm font-bold text-slate-950">Simulate successful payment</button>
        <button type="button" onClick={() => onComplete("failed")} className="w-full rounded-xl border border-rose-400/40 p-3 text-sm text-rose-300">Simulate failed payment</button>
        <button type="button" onClick={() => onComplete("cancelled")} className="w-full rounded-xl border border-white/20 p-3 text-sm">Cancel checkout</button>
      </div>
    </dialog>
  );
}
