"use client";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string; // id of the element that names this switch
  describedBy?: string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, labelledBy, describedBy, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-teal-400/60 bg-teal-400" : "border-white/10 bg-white/10"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-1 top-1 h-4 w-4 rounded-full transition-transform motion-reduce:transition-none ${
          checked ? "translate-x-5 bg-[#0B0F19]" : "translate-x-0 bg-slate-500"
        }`}
      />
    </button>
  );
}
