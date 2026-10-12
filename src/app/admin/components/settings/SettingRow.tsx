import { ReactNode } from "react";

type Aria = { labelledBy: string; describedBy: string };

type SettingRowProps = {
  id: string; // unique per row; used to wire label/description to the control
  label: string;
  description: string;
  badge?: string; // small pill next to the label, e.g. "All users"
  control: (aria: Aria) => ReactNode;
};

export function SettingRow({ id, label, description, badge, control }: SettingRowProps) {
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p id={labelId} className="text-sm font-medium text-white">
            {label}
          </p>
          {badge && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              {badge}
            </span>
          )}
        </div>
        <p id={descId} className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>
      <div className="shrink-0">{control({ labelledBy: labelId, describedBy: descId })}</div>
    </div>
  );
}
