"use client";

import { useSyncExternalStore, useState, useEffect } from "react";
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
  X,
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
  onNavigate,
}: {
  title: string;
  links: typeof mainLinks;
  activeHref: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {collapsed ? (
        <div className="mx-3 h-px bg-white/10 hidden lg:block" aria-hidden="true" />
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
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={`flex items-center rounded-lg py-2.5 lg:py-2 text-sm transition-colors ${
                collapsed ? "lg:justify-center lg:px-0 gap-3 px-3" : "gap-3 px-3"
              } ${
                active
                  ? "bg-teal-500 text-slate-950 font-semibold"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={`whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync mobile drawer state across custom events & route changes
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener("aventix-toggle-sidebar", handleToggle);
    window.addEventListener("aventix-close-sidebar", handleClose);

    return () => {
      window.removeEventListener("aventix-toggle-sidebar", handleToggle);
      window.removeEventListener("aventix-close-sidebar", handleClose);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar: Drawer on mobile/tablet, docked sticky bar on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden border-r border-white/10 bg-[#0B0F19] py-5 transition-all duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-screen ${
          mobileOpen
            ? "translate-x-0 shadow-2xl w-72 px-4"
            : "-translate-x-full lg:translate-x-0"
        } ${
          collapsed ? "lg:w-[72px] lg:px-2" : "lg:w-60 lg:px-3"
        }`}
      >
        <div className="space-y-6">
          <div
            className={`flex items-center justify-between ${
              collapsed ? "lg:flex-col lg:items-center lg:gap-3 px-2" : "px-2"
            }`}
          >
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileOpen(false)}
              aria-label="Aventix admin dashboard"
              className="flex items-center"
            >
              {collapsed ? (
                <>
                  <Image
                    src="/images/aventix-icon.png"
                    alt="Aventix"
                    width={34}
                    height={24}
                    priority
                    className="h-6 w-auto hidden lg:block"
                  />
                  <Image
                    src="/images/aventix-logo.png"
                    alt="Aventix"
                    width={104}
                    height={24}
                    priority
                    className="h-6 w-auto lg:hidden"
                  />
                </>
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

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar menu"
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <NavSection
            title="Main"
            links={mainLinks}
            activeHref={activeHref}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
          <NavSection
            title="Management"
            links={managementLinks}
            activeHref={activeHref}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
          <NavSection
            title="Settings"
            links={settingsLinks}
            activeHref={activeHref}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>

        <button
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Sign Out" : undefined}
          aria-label="Sign Out"
          className={`flex items-center rounded-lg py-2.5 lg:py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 ${
            collapsed ? "lg:justify-center lg:px-0 gap-3 px-3" : "gap-3 px-3"
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={`whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>Sign Out</span>
        </button>
      </aside>
    </>
  );
}