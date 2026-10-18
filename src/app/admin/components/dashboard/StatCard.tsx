import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";
import { StatChange } from "@/app/admin/types/admin";

type StatCardProps = {
  label: string;
  value: string | number;
  change: StatChange;
  icon: LucideIcon;
};

export function StatCard({ label, value, change, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-teal-400">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <div className="mt-1 flex items-center gap-1 text-xs">
        {change.direction === "up" && (
          <ArrowUp className="h-3 w-3 text-teal-400" />
        )}
        {change.direction === "down" && (
          <ArrowDown className="h-3 w-3 text-red-400" />
        )}
        <span
          className={
            change.direction === "up"
              ? "text-teal-400"
              : change.direction === "down"
              ? "text-red-400"
              : "text-slate-400"
          }
        >
          {change.value}
        </span>
        <span className="text-slate-500">{change.label}</span>
      </div>
    </div>
  );
}
