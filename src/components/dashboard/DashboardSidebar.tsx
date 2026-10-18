"use client";
import SignOutButton from "@/components/auth/SignOutButton";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  History,
  UserCircle,
  Compass,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";

const STORAGE_KEY = "aventix_attendee_sidebar_collapsed";
const SIDEBAR_CHANGE_EVENT = "aventix-attendee-sidebar-change";

function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSidebarSnapshot(): boolean {
  return false;
}

function subscribeToSidebar(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const mainLinks: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const ticketLinks: NavItem[] = [
  { href: "/dashboard/tickets", label: "My Tickets", icon: Ticket },
  { href: "/dashboard/booking-history", label: "Booking History", icon: History },
];

const accountLinks: NavItem[] = [
  { href: "/dashboard/profile", label: "User Profile", icon: UserCircle },
  { href: "/events", label: "Browse Events", icon: Compass },
];

function NavSection({
  title,
  links,
  pathname,
  collapsed,
}: {
  title: string;
  links: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div>
      {collapsed ? (
        <div className="mx-3 h-px bg-white/10" aria-hidden="true" />
      ) : (
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
      )}
      <nav className="mt-2 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={`flex items-center rounded-lg py-2 text-sm transition-colors ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              } ${
                active
                  ? "bg-teal-500 text-slate-950 font-medium"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname() || "";

  const collapsed = useSyncExternalStore(
    subscribeToSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot
  );

  function toggle() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore
    }
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col justify-between overflow-y-auto overflow-x-hidden border-r border-white/10 bg-[#0B0F19] py-5 transition-[width] duration-200 ${
        collapsed ? "w-[72px] px-2" : "w-60 px-3"
      }`}
    >
      <div className="space-y-6">
        <div
          className={`flex ${
            collapsed ? "flex-col items-center gap-3" : "items-center justify-between px-2"
          }`}
        >
          <Link
            href="/dashboard"
            aria-label="Aventix attendee dashboard"
            className="flex items-center"
          >
            {collapsed ? (
              <Image
                src="/images/aventix-icon.png"
                alt="Aventix"
                width={34}
                height={24}
                priority
                className="h-6 w-auto"
              />
            ) : (
              <Image
                src="/images/aventix-logo.png"
                alt="Aventix"
                width={104}
                height={24}
                priority
                className="h-6 w-auto"
              />
            )}
          </Link>
          <button
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <NavSection title="Main" links={mainLinks} pathname={pathname} collapsed={collapsed} />
        <NavSection title="Tickets & Orders" links={ticketLinks} pathname={pathname} collapsed={collapsed} />
        <NavSection title="Account" links={accountLinks} pathname={pathname} collapsed={collapsed} />
      </div>

      <SignOutButton
        title={collapsed ? "Sign Out" : undefined}
        className={`flex items-center rounded-lg py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 ${
          collapsed ? "justify-center px-0" : "gap-3 px-3"
        }`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="whitespace-nowrap">Sign Out</span>}
      </SignOutButton>
    </aside>
  );
}
