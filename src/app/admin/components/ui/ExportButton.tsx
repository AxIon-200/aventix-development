"use client";

import { Download, Loader2 } from "lucide-react";

type ExportButtonProps = {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
};

export function ExportButton({ onClick, isLoading = false, label = "Export" }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-60"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label}
    </button>
  );
}
