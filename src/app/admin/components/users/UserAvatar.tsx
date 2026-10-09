import { getInitials } from "@/app/admin/lib/format";

type UserAvatarProps = {
  name: string;
  src?: string | null;
  size?: "sm" | "lg";
};

export function UserAvatar({ name, src, size = "sm" }: UserAvatarProps) {
  const dims = size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${dims} rounded-full object-cover`} />;
  }
  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-teal-500/15 font-semibold text-teal-300`}
    >
      {getInitials(name)}
    </div>
  );
}
