"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import EventSearchField from "./events/EventSearchField";
import type { EventDetails } from "@/types/event";
import AccountMenu from "./auth/AccountMenu";
import { useAccountSession } from "./auth/useAccountSession";
import { publicAuthClient } from "@/lib/auth/client";
import AventixLogo from "./AventixLogo";
import RoleDropdownSwitcher from "./shared/RoleDropdownSwitcher";
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
  sectionId?: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "Home", href: "/", sectionId: "hero-section" },
  { label: "Events", href: "/events", sectionId: "trending-events" },
  { label: "About", href: "/about", sectionId: "how-it-works" },
  { label: "Contact", href: "/contact", sectionId: "organizer-cta" },
];

const pillButton =
  "inline-flex items-center justify-center rounded-full bg-[#66fcf1] px-5 py-2 text-sm font-semibold text-[#0b0c10] shadow-glow transition hover:bg-[#8afff6] hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66fcf1]";

export default function Navbar({ onOpenAuth, onSearch, searchEvents }: NavbarProps) {
  const { session, clearSession } = useAccountSession();
  const pathname = usePathname() || "";
  const [activeSectionHref, setActiveSectionHref] = useState<string>("/");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Active section detection when user is on the landing page ("/")
  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const sectionElements = [
      { id: "hero-section", linkHref: "/" },
      { id: "trending-events", linkHref: "/events" },
      { id: "browse-categories", linkHref: "/events" },
      { id: "how-it-works", linkHref: "/about" },
      { id: "why-choose-us", linkHref: "/about" },
      { id: "testimonials", linkHref: "/about" },
      { id: "organizer-cta", linkHref: "/contact" },
      { id: "footer", linkHref: "/contact" },
    ];

    let ticking = false;

    function handleScroll() {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const navbarHeight = 85;
        const scrollY = window.scrollY;

        if (scrollY < 180) {
          setActiveSectionHref("/");
          ticking = false;
          return;
        }

        // Check if near bottom of page
        if (
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 100
        ) {
          setActiveSectionHref("/contact");
          ticking = false;
          return;
        }

        // Check sections from bottom up to find the currently active view
        for (let i = sectionElements.length - 1; i >= 0; i--) {
          const { id, linkHref } = sectionElements[i];
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            // Trigger when top of section passes above 45% of viewport height
            if (rect.top <= window.innerHeight * 0.45 && rect.bottom >= navbarHeight) {
              setActiveSectionHref(linkHref);
              break;
            }
          }
        }

        ticking = false;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // Determine if a nav link is active
  const isLinkActive = useCallback(
    (href: string) => {
      if (pathname === "/") {
        return activeSectionHref === href;
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname, activeSectionHref]
  );

  // Smooth scroll handler for landing page section links
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    sectionId?: string
  ) => {
    if (pathname === "/" && sectionId) {
      const el = document.getElementById(sectionId);
      if (el) {
        e.preventDefault();
        const navbarHeight = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = Math.max(
          0,
          elementPosition - (sectionId === "hero-section" ? 0 : navbarHeight)
        );

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
        setActiveSectionHref(href);
        setMobileMenuOpen(false);
      }
    }
  };

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
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-16">
        {/* Logo */}
        <Link href="/" aria-label="Aventix home" className="flex shrink-0 items-center">
          <AventixLogo size="md" />
        </Link>

        {/* Dynamic Section Navigation Links */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-9 text-sm font-medium xl:flex"
        >
          {NAV_LINKS.map((l) => {
            const active = isLinkActive(l.href);

            return (
              <Link
                key={l.label}
                href={l.href}
                onClick={(e) => handleNavClick(e, l.href, l.sectionId)}
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
          <RoleDropdownSwitcher />

          {/* Search field */}
          <EventSearchField
            events={searchEvents}
            onSearch={onSearch}
            onNavigate={() => setMobileMenuOpen(false)}
          />

          {/* Auth Controls */}
          {session ? (
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
          <RoleDropdownSwitcher compact />
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
          className="space-y-4 border-t border-[#1f2833] bg-[#0b0c10] px-4 pb-6 pt-4 xl:hidden animate-in slide-in-from-top-2 duration-200"
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
                  onClick={(e) => handleNavClick(e, l.href, l.sectionId)}
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
            {session ? (
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
