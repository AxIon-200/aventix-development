import type { DashboardStat } from "@/lib/dashboard";

export default function StatCard({ label, value, badge, footnote }: DashboardStat) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#2c3644] bg-[#0b0c10] p-5">
      <p className="text-[13px] font-medium text-[#c5c6c7]">{label}</p>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="whitespace-nowrap font-[family-name:var(--font-outfit)] text-[28px] font-bold text-white">
          {value}
        </p>
        <span className="whitespace-nowrap rounded-md bg-[#10b981]/[0.12] px-2 py-1 text-xs font-semibold text-[#10b981]">
          {badge}
        </span>
      </div>
      <hr className="w-full border-[#2c3644]" />
      <p className="text-[11px] text-[#c5c6c7]">{footnote}</p>
    </div>
  );
}
