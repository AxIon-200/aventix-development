import { InputHTMLAttributes } from "react";

// Dark-theme text input. Pass the props from <FormField>'s render function
// ({...a11y}) and it turns red automatically when aria-invalid is true.
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-teal-400/60 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-rose-400/60 ${className}`}
    />
  );
}
