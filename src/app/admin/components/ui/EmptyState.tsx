type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 9h16.5M3.75 15h16.5M5.25 19.5h13.5A1.5 1.5 0 0020.25 18V6a1.5 1.5 0 00-1.5-1.5H5.25A1.5 1.5 0 003.75 6v12a1.5 1.5 0 001.5 1.5z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-slate-300">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-teal-400"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

