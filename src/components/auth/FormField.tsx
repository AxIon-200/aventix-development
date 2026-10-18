"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export const fieldClass = "h-11 w-full min-w-0 rounded-[10px] border border-[#2c3644] bg-[#1f2833] px-4 text-base sm:text-sm text-white placeholder:text-[#8f969e] focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1] aria-[invalid=true]:border-red-400 disabled:opacity-60";
export const submitClass = "inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#66fcf1] px-6 py-2.5 text-sm font-semibold text-[#0b0c10] transition hover:bg-[#8afff6] disabled:cursor-not-allowed disabled:opacity-50";

export default function FormField({ label, error, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; error?: string; hint?: string }) {
  const [visible, setVisible] = useState(false);
  const password = props.type === "password";
  const id = props.id ?? props.name;
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-[#c5c6c7]">{label}</label>
    <div className="relative">
      <input {...props} id={id} type={password && visible ? "text" : props.type} aria-invalid={!!error} aria-describedby={[error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined} className={`${fieldClass} ${password ? "pr-12" : ""}`} />
      {password && <button type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-1 top-1 flex h-9 w-10 items-center justify-center rounded-lg text-[#aeb6c2] hover:text-[#66fcf1]">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
    </div>
    {hint && <p id={`${id}-hint`} className="mt-2 text-xs text-[#9fa3a8]">{hint}</p>}
    {error && <p id={`${id}-error`} className="mt-2 text-xs text-red-300">{error}</p>}
  </div>;
}
