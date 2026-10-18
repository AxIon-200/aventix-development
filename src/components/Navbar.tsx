"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AventixLogo from "./AventixLogo";
import { Search, Menu, X } from "lucide-react";

interface NavbarProps {
  /** Landing page opens its auth modal; other pages fall back to /login and /register. */
  onOpenAuth?: (mode: "login" | "register") => void;
  onSearch?: (query: string) => void;
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const pillButton =
  "inline-flex items-center justify-center rounded-full bg-[#66fcf1] px-5 py-2 text-sm font-semibold text-[#0b0c10] shadow-glow transition hover:bg-[#8afff6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66fcf1]";

export default function Navbar({ onOpenAuth, onSearch }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchVal);
    else router.push(searchVal.trim() ? `/events?q=${encodeURIComponent(searchVal.trim())}` : "/events");
  };

  const authControl = (mode: "login" | "register", label: string, className: string, onClick?: () => void) =>
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
    <header className="sticky top-0 z-50 w-full border-b border-[#1f2833] bg-[#0b0c10]">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-16">
        <Link href="/" aria-label="Aventix home" className="flex shrink-0 items-center">
          <AventixLogo size="md" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-9 text-sm font-medium md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`transition-colors hover:text-[#66fcf1] focus-visible:text-[#66fcf1] focus-visible:outline-none ${
                isActive(l.href) ? "text-[#66fcf1]" : "text-[#c5c6c7]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          <form onSubmit={handleSearchSubmit} role="search" className="relative flex h-[38px] w-48 items-center lg:w-56">
            <Search aria-hidden className="pointer-events-none absolute left-4 h-3.5 w-3.5 text-[#c5c6c7]" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search events..."
              aria-label="Search events"
              className="h-full w-full rounded-full border border-[#2c3644] bg-[#1f2833] pl-10 pr-4 text-sm text-white placeholder:text-[#c5c6c7]/80 focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1]"
            />
          </form>
          {authControl("login", "Log in", pillButton)}
          {authControl("register", "Register", pillButton)}
        </div>

        <div className="flex items-center sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg bg-[#1f2833] p-2 text-[#c5c6c7] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#66fcf1]"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="space-y-4 border-t border-[#1f2833] bg-[#0b0c10] px-4 pb-6 pt-4 sm:hidden">
          <form onSubmit={handleSearchSubmit} role="search" className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-[#c5c6c7]" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search events..."
              aria-label="Search events"
              className="w-full rounded-full border border-[#2c3644] bg-[#1f2833] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#c5c6c7]/80"
            />
          </form>
          <div className="flex flex-col text-sm font-medium">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-md px-3 py-2 hover:text-white ${isActive(l.href) ? "text-[#66fcf1]" : "text-[#c5c6c7]"}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            {authControl("login", "Log in", `${pillButton} flex-1`, () => setMobileMenuOpen(false))}
            {authControl("register", "Register", `${pillButton} flex-1`, () => setMobileMenuOpen(false))}
          </div>
        </div>
      )}
    </header>
  );
}
