"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  return <dialog ref={ref} onCancel={onClose} onClose={onClose} aria-labelledby="public-dialog-title" className="m-auto w-[calc(100%-2rem)] max-w-[440px] rounded-3xl border border-[#2c3644] bg-[#1f2833] p-8 text-center text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm">
    <button type="button" onClick={onClose} aria-label="Close dialog" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[#c5c6c7] hover:bg-white/10"><X size={18} /></button>
    <h2 id="public-dialog-title" className="mt-4 text-2xl font-semibold">{title}</h2>{children}
  </dialog>;
}
