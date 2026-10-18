import React from "react";
import { LucideIcon } from "lucide-react";

interface OrganizerStatCardProps {
  label: string;
  value: string;
  change?: string;
  footnote?: string;
  icon?: LucideIcon;
}

export default function OrganizerStatCard({
  label,
  value,
  change,
  footnote,
  icon: Icon,
}: OrganizerStatCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {Icon && (
          <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {(change || footnote) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {change && (
              <span className="font-semibold text-teal-400">{change}</span>
            )}
            {footnote && <span className="text-slate-400">{footnote}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
