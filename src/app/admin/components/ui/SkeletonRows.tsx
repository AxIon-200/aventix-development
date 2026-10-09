export function SkeletonRows({
  rows = 4,
  columns = 3,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-white/5">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-3.5 w-full animate-pulse rounded bg-white/5" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
