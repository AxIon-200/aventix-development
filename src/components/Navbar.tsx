"use client";

import React, { useState } from "react";
import AventixLogo from "./AventixLogo";
import { Search, Menu, X } from "lucide-react";

interface NavbarProps {
  onOpenAuth?: (mode: "login" | "register") => void;
  onSearch?: (query: string) => void;
}

export default function Navbar({ onOpenAuth, onSearch }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchVal);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0b0f15]/85 backdrop-blur-md border-b border-[#182332]/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center group transition-transform hover:scale-[1.02]">
            <AventixLogo size="md" />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <a
              href="#"
              className="text-white hover:text-[#00e5be] transition-colors relative py-1"
            >
              Home
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#00e5be] rounded-full" />
            </a>
            <a
              href="#trending-events"
              className="text-slate-300 hover:text-[#00e5be] transition-colors py-1"
            >
              Events
            </a>
            <a
              href="#how-it-works"
              className="text-slate-300 hover:text-[#00e5be] transition-colors py-1"
            >
              About
            </a>
            <a
              href="#footer"
              className="text-slate-300 hover:text-[#00e5be] transition-colors py-1"
            >
              Contact
            </a>
          </nav>
        </div>

        {/* Right side: Search bar & Auth Buttons */}
        <div className="hidden sm:flex items-center gap-3 md:gap-4">
          {/* Search pill */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center w-48 lg:w-64"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search events..."
              className="w-full bg-[#182333]/90 text-sm text-slate-100 placeholder-slate-400 pl-9 pr-3.5 py-2 rounded-full border border-[#27384e]/70 focus:outline-none focus:border-[#00e5be] focus:ring-1 focus:ring-[#00e5be] transition-all"
            />
          </form>

          {/* Log in Button */}
          <button
            onClick={() => onOpenAuth?.("login")}
            className="px-5 py-2 rounded-full text-sm font-semibold text-[#00e5be] bg-[#00e5be]/10 hover:bg-[#00e5be]/20 border border-[#00e5be]/40 transition-all hover:scale-105"
          >
            Log in
          </button>

          {/* Register Button */}
          <button
            onClick={() => onOpenAuth?.("register")}
            className="px-5 py-2 rounded-full text-sm font-bold text-[#091519] bg-[#00e5be] hover:bg-[#35f0cb] transition-all shadow-[0_0_20px_rgba(0,229,190,0.35)] hover:shadow-[0_0_25px_rgba(0,229,190,0.55)] hover:scale-105"
          >
            Register
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#182333] text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-2 pb-6 bg-[#0e141c] border-b border-[#1e2a3a] space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search events..."
              className="w-full bg-[#182333] text-sm text-slate-100 placeholder-slate-400 pl-9 pr-4 py-2.5 rounded-full border border-[#27384e]"
            />
          </div>
          <div className="flex flex-col space-y-2 text-sm font-medium">
            <a
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md bg-[#131b26] text-[#00e5be]"
            >
              Home
            </a>
            <a
              href="#trending-events"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-slate-300 hover:text-white"
            >
              Events
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-slate-300 hover:text-white"
            >
              About
            </a>
            <a
              href="#footer"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-slate-300 hover:text-white"
            >
              Contact
            </a>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth?.("login");
              }}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-[#00e5be] border border-[#00e5be]/40 bg-[#00e5be]/10 text-center"
            >
              Log in
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth?.("register");
              }}
              className="flex-1 py-2.5 rounded-full text-sm font-bold text-[#091519] bg-[#00e5be] text-center"
            >
              Register
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
