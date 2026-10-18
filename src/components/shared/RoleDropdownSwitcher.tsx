"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe,
  Ticket,
  CalendarPlus,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { DemoRole } from "./DemoRoleSwitcher";

interface RoleItem {
  role: DemoRole;
  label: string;
  badge: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_ITEMS: RoleItem[] = [
  {
    role: "GUEST",
    label: "Guest",
    badge: "Landing",
    path: "/",
    icon: Globe,
  },
  {
    role: "ATTENDEE",
    label: "Attendee",
    badge: "User",
    path: "/dashboard",
    icon: Ticket,
  },
  {
    role: "ORGANIZER",
    label: "Organizer",
    badge: "Host",
    path: "/organizer/dashboard",
    icon: CalendarPlus,
  },
  {
    role: "ADMINISTRATOR",
    label: "Admin",
    badge: "Operator",
    path: "/admin/dashboard",
    icon: ShieldCheck,
  },
];

export default function RoleDropdownSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive active role from route
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

  const activeItem = ROLE_ITEMS.find((r) => r.role === currentRole) || ROLE_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`group flex items-center gap-2 rounded-lg border border-teal-500/30 bg-[#131d27]/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition-all hover:border-teal-400 hover:bg-[#182736] hover:text-white ${
          open ? "ring-2 ring-teal-400/40" : ""
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-teal-400 animate-pulse" />
          {!compact && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400">
              Role:
            </span>
          )}
          <ActiveIcon className="h-3.5 w-3.5 text-teal-300" />
          <span className="font-semibold">{activeItem.label}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-teal-300" : "group-hover:text-slate-200"
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl border border-teal-500/30 bg-[#0B0F19]/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-white/10 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
              Frontend Role Demo
            </p>
            <p className="text-[11px] text-slate-400">Switch current view portal</p>
          </div>

          <div className="space-y-0.5">
            {ROLE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = item.role === currentRole;

              return (
                <button
                  key={item.role}
                  onClick={() => {
                    setOpen(false);
                    if (pathname !== item.path) {
                      router.push(item.path);
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    isSelected
                      ? "bg-teal-500 text-slate-950 font-semibold shadow-sm"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isSelected ? "text-slate-950" : "text-teal-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
