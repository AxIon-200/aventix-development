"use client";

import React from "react";
import AventixLogo from "./AventixLogo";

export default function Footer() {
  return (
    <footer id="footer" className="bg-[#080c11] border-t border-[#161f2c] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12">
          {/* Brand Info & Socials */}
          <div className="md:col-span-5 space-y-5">
            <AventixLogo size="md" />

            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              The Philippines&apos; most trusted platform for concert, gig, and festival
              ticketing.
            </p>

            {/* Social Media Circular Buttons */}
            <div className="flex items-center gap-3 pt-1">
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-[#131b26] border border-[#202d3f] flex items-center justify-center text-slate-300 hover:text-[#00e5be] hover:border-[#00e5be]/50 transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-[#131b26] border border-[#202d3f] flex items-center justify-center text-slate-300 hover:text-[#00e5be] hover:border-[#00e5be]/50 transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a
                href="#"
                aria-label="Twitter / X"
                className="w-10 h-10 rounded-full bg-[#131b26] border border-[#202d3f] flex items-center justify-center text-slate-300 hover:text-[#00e5be] hover:border-[#00e5be]/50 transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="#"
                aria-label="TikTok"
                className="w-10 h-10 rounded-full bg-[#131b26] border border-[#202d3f] flex items-center justify-center text-slate-300 hover:text-[#00e5be] hover:border-[#00e5be]/50 transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.3 6.3 0 0 0 1.94-4.52V8.42a8.28 8.28 0 0 0 4.83 1.54V6.51a4.8 4.8 0 0 1-1-.18z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Nav Links Column 1: About Us */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">About Us</h4>
            <ul className="space-y-2.5 text-sm text-slate-400 font-normal">
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Press
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Links Column 2: Help Center */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">Help Center</h4>
            <ul className="space-y-2.5 text-sm text-slate-400 font-normal">
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Refund Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Organizer Help
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Links Column 3: Terms of Service */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">Terms of Service</h4>
            <ul className="space-y-2.5 text-sm text-slate-400 font-normal">
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#00e5be] transition-colors">
                  Data Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#161f2c] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
          <p>© 2024 Aventix. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-slate-400 font-medium">
            <span>Made for music lovers in the Philippines</span>
            <span role="img" aria-label="Philippines Flag">🇵🇭</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
