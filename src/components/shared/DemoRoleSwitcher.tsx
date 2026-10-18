"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe,
  Ticket,
  CalendarPlus,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
} from "lucide-react";

export type DemoRole = "GUEST" | "ATTENDEE" | "ORGANIZER" | "ADMINISTRATOR";

interface RoleOption {
  role: DemoRole;
  label: string;
  badge: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ROLES: RoleOption[] = [
  {
    role: "GUEST",
    label: "Guest",
    badge: "Public",
    path: "/",
    icon: Globe,
    color: "from-sky-500 to-teal-400",
  },
  {
    role: "ATTENDEE",
    label: "Attendee",
    badge: "User",
    path: "/dashboard",
    icon: Ticket,
    color: "from-emerald-500 to-teal-400",
  },
  {
    role: "ORGANIZER",
    label: "Organizer",
    badge: "Host",
    path: "/organizer/dashboard",
    icon: CalendarPlus,
    color: "from-teal-400 to-cyan-500",
  },
  {
    role: "ADMINISTRATOR",
    label: "Admin",
    badge: "Operator",
    path: "/admin/dashboard",
    icon: ShieldCheck,
    color: "from-indigo-400 to-teal-400",
  },
];

export default function DemoRoleSwitcher() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Determine current active role from pathname
  let currentRole: DemoRole = "GUEST";
  if (pathname.startsWith("/admin")) {
    currentRole = "ADMINISTRATOR";
  } else if (pathname.startsWith("/organizer")) {
    currentRole = "ORGANIZER";
  } else if (pathname.startsWith("/dashboard") || pathname.startsWith("/bookings")) {
    currentRole = "ATTENDEE";
  } else {
    currentRole = "GUEST";
  }

  const activeOption = ROLES.find((r) => r.role === currentRole) || ROLES[0];

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        title="Open Role Demo Switcher"
        aria-label="Open Role Demo Switcher"
        className="fixed bottom-4 right-4 z-[999] flex h-10 w-10 items-center justify-center rounded-full border border-teal-400/40 bg-[#0B0F19]/90 text-teal-300 shadow-lg shadow-teal-950/40 backdrop-blur-md transition-all hover:scale-110 hover:border-teal-300"
      >
        <Sparkles className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Frontend Demo Role Selector"
      className="fixed bottom-4 left-1/2 z-[999] -translate-x-1/2 transition-all duration-300"
    >
      <div className="flex items-center gap-2 rounded-full border border-teal-500/30 bg-[#0B0F19]/95 px-3 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        {/* Demo Tag */}
        <div className="flex items-center gap-1.5 border-r border-white/10 pr-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-teal-400">
            Demo
          </span>
        </div>

        {/* Minimized view */}
        {minimized ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <activeOption.icon className="h-3.5 w-3.5 text-teal-400" />
              <span>{activeOption.label}</span>
            </span>
            <button
              onClick={() => setMinimized(false)}
              aria-label="Expand demo switcher"
              className="rounded p-1 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* Expanded Role Pills */
          <div className="flex items-center gap-1">
            {ROLES.map(({ role, label, path, icon: Icon }) => {
              const isActive = role === currentRole;
              return (
                <button
                  key={role}
                  onClick={() => {
                    if (pathname !== path) {
                      router.push(path);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-teal-500 text-slate-950 font-semibold shadow-sm shadow-teal-500/30 scale-105"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              );
            })}

            {/* Collapse / Close Controls */}
            <div className="flex items-center pl-1 border-l border-white/10 ml-1">
              <button
                onClick={() => setMinimized(true)}
                title="Minimize toolbar"
                aria-label="Minimize demo switcher"
                className="rounded p-1 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setHidden(true)}
                title="Hide toolbar"
                aria-label="Hide demo switcher"
                className="rounded p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
