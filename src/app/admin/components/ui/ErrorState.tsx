"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-center ${
        compact ? "py-6" : "py-14"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-slate-200">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
