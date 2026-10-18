"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Store,
  CalendarDays,
  Ticket,
  CreditCard,
  Activity,
  UserCircle,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";


const STORAGE_KEY = "aventix_admin_sidebar_collapsed";
const SIDEBAR_CHANGE_EVENT = "aventix-admin-sidebar-change";

// Read the saved sidebar preference in the browser.
function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Keep the server render and initial hydration consistent.
function getServerSidebarSnapshot(): boolean {
  return false;
}

// Listen for sidebar preference changes.
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

const mainLinks = [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }];

const managementLinks = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/organizers", label: "Organizers", icon: Store },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/bookings", label: "Bookings", icon: Ticket },
  { href: "/admin/payments", label: "Payment", icon: CreditCard },
  { href: "/admin/activity-logs", label: "Activity Logs", icon: Activity },
];

const settingsLinks = [
  { href: "/admin/profile", label: "User Profile", icon: UserCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const allNavLinks = [...mainLinks, ...managementLinks, ...settingsLinks];

function getActiveNavHref(pathname: string, links: typeof allNavLinks): string | null {
  if (pathname === "/admin") return "/admin/dashboard";

  const matching = links.filter((item) => {
    if (pathname === item.href) return true;
    return pathname.startsWith(`${item.href}/`);
  });

  if (matching.length === 0) return null;

  // Most specific matching path takes precedence
  matching.sort((a, b) => b.href.length - a.href.length);
  return matching[0].href;
}

function NavSection({
  title,
  links,
  activeHref,
  collapsed,
}: {
  title: string;
  links: typeof mainLinks;
  activeHref: string | null;
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
          const active = href === activeHref;
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

export function AdminSidebar() {
  const pathname = usePathname() || "";
  const activeHref = getActiveNavHref(pathname, allNavLinks);

  const collapsed = useSyncExternalStore(
    subscribeToSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot
  );

  function toggle() {
    const next = !collapsed;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        next ? "1" : "0"
      );
    } catch {
      // Ignore storage errors.
    }

    window.dispatchEvent(
      new Event(SIDEBAR_CHANGE_EVENT)
    );
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
            href="/admin/dashboard"
            aria-label="Aventix admin dashboard"
            className="flex items-center"
          >
            {collapsed ? (
              // Icon-only mark: the full wordmark would not fit in 72px.
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

        <NavSection title="Main" links={mainLinks} activeHref={activeHref} collapsed={collapsed} />
        <NavSection title="Management" links={managementLinks} activeHref={activeHref} collapsed={collapsed} />
        <NavSection title="Settings" links={settingsLinks} activeHref={activeHref} collapsed={collapsed} />
      </div>

      <button
        title={collapsed ? "Sign Out" : undefined}
        aria-label="Sign Out"
        className={`flex items-center rounded-lg py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 ${
          collapsed ? "justify-center px-0" : "gap-3 px-3"
        }`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="whitespace-nowrap">Sign Out</span>}
      </button>
    </aside>
  );
}