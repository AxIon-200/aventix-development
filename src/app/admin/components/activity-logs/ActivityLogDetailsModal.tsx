"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ActivityLogDetails } from "@/app/admin/types/activity-logs";
import { getActivityLogById } from "@/app/admin/services/activityLogService";
import { formatDateTime } from "@/app/admin/lib/dateTime";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import {
  ACTOR_ROLE_LABEL,
  LOG_CATEGORY_LABEL,
  LogResultBadge,
} from "@/app/admin/components/activity-logs/activityLogStatus";

type Props = {
  logId: string | null; // null = closed
  onClose: () => void;
};

// Read-only: log entries can't be edited or deleted from the admin UI.
export function ActivityLogDetailsModal({ logId, onClose }: Props) {
  const [log, setLog] = useState<ActivityLogDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!logId) return;
    let cancelled = false;
    setLog(null);
    setError(null);
    setIsLoading(true);
    getActivityLogById(logId)
      .then((l) => !cancelled && setLog(l))
      .catch((e) => !cancelled && setError(e?.message ?? "Something went wrong"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [logId, tick]);

  const facts: [string, string][] = log
    ? [
        ["Actor", log.actorName],
        ["Role", ACTOR_ROLE_LABEL[log.actorRole]],
        ["Email", log.actorEmail || "—"],
        ["Target", log.targetLabel],
        ["IP address", log.ipAddress || "—"],
        ["Device", log.userAgent || "—"],
      ]
    : [];

  return (
    <Modal
      isOpen={logId !== null}
      onClose={onClose}
      title="Log details"
      size="lg"
      footer={
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5"
        >
          Close
        </button>
      }
    >
      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          <div className="space-y-2">
            <div className="h-5 w-1/2 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="h-20 animate-pulse rounded-lg bg-white/5" />
        </div>
      )}

      {!isLoading && error && (
        <ErrorState compact title="Couldn't load log entry" message={error} onRetry={() => setTick((t) => t + 1)} />
      )}

      {!isLoading && log && (
        <div className="space-y-5">
          <div>
            <p className="text-base font-semibold text-white">{log.action}</p>
            <p className="mb-2 text-xs text-slate-500">
              {log.logCode} · {formatDateTime(log.occurredAt)} · {LOG_CATEGORY_LABEL[log.category]}
            </p>
            <LogResultBadge result={log.result} />
            <p className="mt-3 text-sm text-slate-400">{log.description}</p>
          </div>

          {log.result === "failed" && log.errorMessage && (
            <div className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wider text-rose-300/80">Error</p>
              <p className="mt-0.5 text-sm text-slate-300">{log.errorMessage}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Changes</h3>
            {log.changes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-sm text-slate-500">
                No field changes were recorded for this action.
              </p>
            ) : (
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {log.changes.map((c) => (
                  <li key={c.field} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-sm text-slate-200">{c.field}</span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">{c.from}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                      <span className="font-medium text-white">{c.to}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
