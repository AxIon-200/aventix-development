import React from "react";
import Link from "next/link";
import AventixLogo from "./AventixLogo";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "/contact" },
      { label: "Refund Policy", href: "#" },
      { label: "Organizer Help", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Data Security", href: "#" },
    ],
  },
];

const socialButton =
  "flex h-10 w-10 items-center justify-center rounded-full border border-[#2c3644] bg-[#1f2833] text-[#66fcf1] transition hover:border-[#66fcf1]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#66fcf1]";

export default function Footer() {
  return (
    <footer id="footer" className="border-t border-[#1f2833] bg-[#0b0c10]">
      <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-12 sm:px-6 lg:px-16 lg:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-5">
            <AventixLogo size="md" />
            <p className="max-w-xs text-sm leading-[22.75px] text-[#c5c6c7]">
              The Philippines&apos; most trusted platform for concert, gig, and festival ticketing.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a href="#" aria-label="Facebook" className={socialButton}>
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className={socialButton}>
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="#" aria-label="Help" className={socialButton}>
                <svg className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
                </svg>
              </a>
              <a href="#" aria-label="TikTok" className={socialButton}>
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.3 6.3 0 0 0 1.94-4.52V8.42a8.28 8.28 0 0 0 4.83 1.54V6.51a4.8 4.8 0 0 1-1-.18z" />
                </svg>
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading} className="space-y-5">
              {/* Figma sets this heading to #0b0c10 on a #0b0c10 background (invisible); white is used so it is readable. */}
              <h4 className="font-display text-base font-bold text-white">{col.heading}</h4>
              <ul className="space-y-3 text-sm text-[#c5c6c7]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-colors hover:text-[#66fcf1] focus-visible:text-[#66fcf1] focus-visible:outline-none">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#1f2833] pt-8 text-sm text-[#c5c6c7] sm:flex-row">
          <p>© 2024 Aventix. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Made for music lovers in the Philippines</span>
            <span role="img" aria-label="Philippines flag">🇵🇭</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
