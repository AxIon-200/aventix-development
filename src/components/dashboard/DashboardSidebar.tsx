"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { DashboardIcon, HistoryIcon, TicketIcon, UserIcon } from "./icons";

interface NavItem {
  href: string;
  title: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Confirm these route names with the team so #11 to #14 use the same ones.
const items: NavItem[] = [
  { href: "/dashboard", title: "Dashboard", description: "Overview of your account and activities", Icon: DashboardIcon },
  { href: "/dashboard/tickets", title: "My Tickets", description: "Your upcoming events and tickets", Icon: TicketIcon },
  { href: "/dashboard/booking-history", title: "Booking History", description: "View your past ticket bookings", Icon: HistoryIcon },
  { href: "/dashboard/profile", title: "User Profile", description: "Manage your personal account details", Icon: UserIcon },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 lg:w-[275px]">
      <nav
        aria-label="Attendee dashboard"
        className="flex flex-col overflow-hidden rounded-lg bg-[#2c3644] shadow-[0_4px_2px_#2c3644]"
      >
        {items.map(({ href, title, description, Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[87px] items-start gap-3 px-5 py-6 ${
                active ? "border-2 border-[#66fcf1] bg-[#132b2b]" : "hover:bg-white/5"
              }`}
            >
              <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${active ? "text-[#66fcf1]" : "text-white"}`} />
              <span className="flex flex-col gap-1">
                <span className={`text-sm font-medium leading-[1.3] ${active ? "text-[#66fcf1]" : "text-white"}`}>
                  {title}
                </span>
                <span className={`text-xs leading-[1.4] ${active ? "text-[#66fcf1]" : "text-white"}`}>
                  {description}
                </span>
              </span>
              {active && <span className="absolute right-5 top-6 h-[39px] w-1 rounded-full bg-[#66fcf1]" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
