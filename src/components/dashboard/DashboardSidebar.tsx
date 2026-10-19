"use client";
import SignOutButton from "@/components/auth/SignOutButton";

import { useSyncExternalStore, useState, useEffect } from "react";
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
  X,
  TicketPlus,
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
  { href: "/dashboard/buy-tickets", label: "Buy Tickets", icon: TicketPlus },
  { href: "/dashboard/tickets", label: "My Tickets", icon: Ticket },
  { href: "/dashboard/booking-history", label: "Booking History", icon: History },
];

const accountLinks: NavItem[] = [
  { href: "/dashboard/profile", label: "User Profile", icon: UserCircle },
  { href: "/events", label: "Browse Events", icon: Compass },
];

const allNavLinks = [...mainLinks, ...ticketLinks, ...accountLinks];

function getActiveNavHref(pathname: string, links: NavItem[]): string | null {
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
  links: NavItem[];
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

export default function DashboardSidebar() {
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
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore
    }
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
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
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              aria-label="Aventix attendee dashboard"
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
            title="Tickets & Orders"
            links={ticketLinks}
            activeHref={activeHref}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
          <NavSection
            title="Account"
            links={accountLinks}
            activeHref={activeHref}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>

        <SignOutButton
          title={collapsed ? "Sign Out" : undefined}
          className={`flex items-center rounded-lg py-2.5 lg:py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 ${
            collapsed ? "lg:justify-center lg:px-0 gap-3 px-3" : "gap-3 px-3"
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={`whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>Sign Out</span>
        </SignOutButton>
      </aside>
    </>
  );
}
