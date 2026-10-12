import { Check, Circle } from "lucide-react";
import { getPasswordChecks, getStrengthLevel } from "@/app/admin/lib/passwordStrength";

const BAR_COLOR = ["", "bg-rose-400", "bg-amber-400", "bg-teal-300", "bg-teal-400"];
const LABEL_COLOR = ["", "text-rose-300", "text-amber-300", "text-teal-300", "text-teal-300"];

// Live meter + requirement checklist. Renders nothing until something is typed.
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = getStrengthLevel(password);
  const checks = getPasswordChecks(password);

  return (
    <div className="mt-2.5 space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={`h-1 flex-1 rounded-full ${segment <= score ? BAR_COLOR[score] : "bg-white/10"}`}
            />
          ))}
        </div>
        <span className={`w-12 text-right text-[11px] font-medium ${LABEL_COLOR[score]}`}>{label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li
            key={c.id}
            className={`flex items-center gap-1.5 text-[11px] ${c.passed ? "text-teal-300" : "text-slate-500"}`}
          >
            {c.passed ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
