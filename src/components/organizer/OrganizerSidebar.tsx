"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  QrCode,
  TrendingUp,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    href: "/organizer/dashboard",
    title: "Overview",
    description: "Key metrics and live activity",
    icon: LayoutDashboard,
  },
  {
    href: "/organizer/events",
    title: "My Events",
    description: "Manage existing event listings",
    icon: CalendarDays,
  },
  {
    href: "/organizer/events/new",
    title: "Create Event",
    description: "Launch a new ticketed event",
    icon: CalendarPlus,
  },
  {
    href: "/organizer/check-in",
    title: "Ticket Scanner",
    description: "Scan attendee QR codes at the gate",
    icon: QrCode,
  },
  {
    href: "/organizer/analytics",
    title: "Sales & Analytics",
    description: "Revenue trends and buyer stats",
    icon: TrendingUp,
  },
  {
    href: "/organizer/profile",
    title: "Organizer Profile",
    description: "Public brand & payout bank details",
    icon: UserCheck,
  },
];

export default function OrganizerSidebar() {
  const pathname = usePathname() || "";

  return (
    <aside className="w-full shrink-0 lg:w-[280px]">
      <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111622] p-3 shadow-xl">
        <div className="mb-3 px-3 py-2 border-b border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
            Organizer Portal
          </p>
          <p className="text-xs text-slate-400">Manage events & ticket sales</p>
        </div>

        <nav aria-label="Organizer navigation" className="space-y-1">
          {navItems.map(({ href, title, description, icon: Icon }) => {
            const active =
              href === "/organizer/dashboard"
                ? pathname === "/organizer/dashboard" || pathname === "/organizer"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  active
                    ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  className={`mt-0.5 h-5 w-5 shrink-0 transition-colors ${
                    active ? "text-teal-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-snug">{title}</span>
                  <span className="text-[11px] text-slate-400 line-clamp-1">
                    {description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
