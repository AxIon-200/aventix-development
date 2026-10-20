"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import EventSearchField from "./events/EventSearchField";
import type { EventDetails } from "@/types/event";
import AccountMenu from "./auth/AccountMenu";
import { useAccountSession } from "./auth/useAccountSession";
import { publicAuthClient } from "@/lib/auth/client";
import AventixLogo from "./AventixLogo";
import AccountGate from "./auth/AccountGate";
import SignOutButton from "./auth/SignOutButton";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  /** Landing page opens its auth modal; other pages fall back to /login and /register. */
  onOpenAuth?: (mode: "login" | "register") => void;
  onSearch?: (query: string) => void;
  searchEvents?: EventDetails[];
}

interface NavLinkItem {
  label: string;
  href: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const pillButton =
  "inline-flex items-center justify-center rounded-full bg-[#66fcf1] px-5 py-2 text-sm font-semibold text-[#0b0c10] shadow-glow transition hover:bg-[#8afff6] hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66fcf1]";

export default function Navbar({ onOpenAuth, onSearch, searchEvents }: NavbarProps) {
  const { session, clearSession, loading, unavailable, error, retry } = useAccountSession();
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  const isLinkActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const authControl = (
    mode: "login" | "register",
    label: string,
    className: string,
    onClick?: () => void
  ) =>
    onOpenAuth ? (
      <button
        type="button"
        className={className}
        onClick={() => {
          onClick?.();
          onOpenAuth(mode);
        }}
      >
        {label}
      </button>
    ) : (
      <Link href={`/${mode}`} className={className} onClick={onClick}>
        {label}
      </Link>
    );

  return (
    <header
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMobileMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
      className="sticky top-0 z-50 w-full border-b border-[#1f2833] bg-[#0b0c10]/95 backdrop-blur-md transition-colors duration-200"
    >
      <div className="mx-auto flex h-16 xl:h-[72px] max-w-[1360px] items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link href="/" aria-label="Aventix home" className="flex shrink-0 items-center">
          <AventixLogo size="md" className="max-h-8 max-w-[112px] sm:max-w-[136px] object-contain" />
        </Link>

        {/* Page Navigation Links */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 text-sm font-medium xl:flex"
        >
          {NAV_LINKS.map((l) => {
            const active = isLinkActive(l.href);

            return (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group relative py-2 transition-colors duration-200 focus-visible:text-[#66fcf1] focus-visible:outline-none ${
                  active ? "text-[#66fcf1] font-semibold" : "text-[#c5c6c7] hover:text-white"
                }`}
              >
                <span>{l.label}</span>
                {/* Active indicator dot and underline */}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#66fcf1] shadow-[0_0_10px_#66fcf1] transition-all duration-300 ${
                    active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0 group-hover:opacity-40 group-hover:scale-x-75"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Role Selector, Search, Auth */}
        <div className="hidden items-center gap-3 xl:flex">
          {/* Demo Role Switcher */}

          {/* Search field */}
          <EventSearchField
            events={searchEvents}
            onSearch={onSearch}
            onNavigate={() => setMobileMenuOpen(false)}
          />

          {/* Auth Controls */}
          {loading ? <span role="status">Checking account…</span> : unavailable ? <div className="max-w-64 text-xs">
            <AccountGate code={error ?? "UNAVAILABLE"} />
            {error === "LOGOUT_UNCERTAIN" ? <SignOutButton>Retry sign-out</SignOutButton> : <button type="button" onClick={retry}>Retry account check</button>}
          </div> : session ? (
            <AccountMenu session={session} client={publicAuthClient} onLoggedOut={clearSession} />
          ) : (
            <div className="flex items-center gap-2">
              {authControl("login", "Log in", pillButton)}
              {authControl("register", "Register", pillButton)}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 xl:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg bg-[#1f2833] p-2 text-[#c5c6c7] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#66fcf1]"
            ref={menuButton}
            aria-label="Toggle menu"
            aria-controls="mobile-navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="max-h-[calc(100svh-64px)] overflow-y-auto space-y-4 border-t border-[#1f2833] bg-[#0b0c10] px-4 pb-6 pt-4 xl:hidden animate-in slide-in-from-top-2 duration-200"
        >
          <EventSearchField
            events={searchEvents}
            onSearch={onSearch}
            onNavigate={() => setMobileMenuOpen(false)}
            compact
          />
          <div className="flex flex-col text-sm font-medium space-y-1">
            {NAV_LINKS.map((l) => {
              const active = isLinkActive(l.href);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 transition-colors ${
                    active
                      ? "bg-teal-500/15 text-[#66fcf1] font-semibold border-l-2 border-[#66fcf1]"
                      : "text-[#c5c6c7] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{l.label}</span>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#66fcf1] shadow-[0_0_6px_#66fcf1]" />
                  )}
                </Link>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2 border-t border-white/10">
            {loading ? <span role="status">Checking account…</span> : unavailable ? <div>
              <AccountGate code={error ?? "UNAVAILABLE"} />
              {error === "LOGOUT_UNCERTAIN" ? <SignOutButton>Retry sign-out</SignOutButton> : <button type="button" onClick={retry}>Retry account check</button>}
            </div> : session ? (
              <AccountMenu session={session} client={publicAuthClient} onLoggedOut={clearSession} />
            ) : (
              <>
                {authControl("login", "Log in", `${pillButton} flex-1`, () =>
                  setMobileMenuOpen(false)
                )}
                {authControl("register", "Register", `${pillButton} flex-1`, () =>
                  setMobileMenuOpen(false)
                )}
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
