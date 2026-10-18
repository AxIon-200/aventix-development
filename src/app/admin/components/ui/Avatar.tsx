import { getInitials } from "@/app/admin/lib/format";

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-lg",
};

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
};

export function Avatar({ name, src, size = "sm" }: AvatarProps) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${SIZES[size]} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full border border-teal-400/30 bg-teal-500/10 font-semibold text-teal-300`}
    >
      {getInitials(name)}
    </div>
  );
}
