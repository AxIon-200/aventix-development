"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Menu } from "lucide-react";
import { NotificationBell } from "@/app/admin/components/ui/NotificationBell";
import { getProfile } from "@/app/admin/services/profileService";
import RoleDropdownSwitcher from "@/components/shared/RoleDropdownSwitcher";

type AdminTopbarProps = {
  adminName?: string;
  adminRole?: string;
};

export function AdminTopbar({
  adminName = "Admin",
  adminRole = "Administrator",
}: AdminTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(adminName);
  const [displayRole, setDisplayRole] = useState(adminRole);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load the current administrator's saved profile photo.
  useEffect(() => {
    let mounted = true;
    let receivedPhotoUpdate = false;

    function handlePhotoUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        avatarUrl: string;
      }>;

      receivedPhotoUpdate = true;
      setAvatarUrl(customEvent.detail.avatarUrl);
    }

    window.addEventListener("admin-profile-photo-updated", handlePhotoUpdate);

    getProfile()
      .then((profile) => {
        if (mounted && !receivedPhotoUpdate) {
          setAvatarUrl(profile.avatarUrl ?? null);
        }
      })
      .catch(() => {
        // Keep using the initials if the profile request fails.
      });

    return () => {
      mounted = false;
      window.removeEventListener(
        "admin-profile-photo-updated",
        handlePhotoUpdate,
      );
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let receivedProfileUpdate = false;

    function handleProfileUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        fullName: string;
        roleLabel: string;
      }>;

      receivedProfileUpdate = true;
      setDisplayName(customEvent.detail.fullName);
      setDisplayRole(customEvent.detail.roleLabel);
    }

    window.addEventListener("admin-profile-updated", handleProfileUpdate);

    // Load the saved name when the topbar first appears.
    getProfile()
      .then((profile) => {
        if (mounted && !receivedProfileUpdate) {
          setDisplayName(profile.fullName || adminName);
          setDisplayRole(profile.roleLabel || adminRole);
        }
      })
      .catch(() => {
        // Keep the fallback values if loading fails.
      });

    return () => {
      mounted = false;

      window.removeEventListener("admin-profile-updated", handleProfileUpdate);
    };
  }, [adminName, adminRole]);

  // Focus the search input when it opens.
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  // Close the search input when Escape is pressed.
  useEffect(() => {
    if (!searchOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#0B0F19]/95 backdrop-blur-md px-3 sm:px-6 lg:px-8">
      {/* Mobile Drawer Toggle & Logo */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("aventix-toggle-sidebar"))}
          aria-label="Open sidebar menu"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:border-teal-400/40 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/admin/dashboard" className="flex items-center gap-2 lg:hidden">
          <Image
            src="/images/aventix-icon.png"
            alt="Aventix"
            width={24}
            height={24}
            className="h-5 w-auto"
          />
          <span className="text-xs font-bold text-white tracking-wide">ADMIN</span>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Demo Role Switcher */}
        <RoleDropdownSwitcher compact />

        {/* Expandable Search */}
        <div
          className={`flex items-center transition-all duration-200 ${
            searchOpen ? "w-44 sm:w-64 md:w-80" : "w-9"
          }`}
        >
          {searchOpen ? (
            <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-teal-400/30 bg-[#111b24] px-2.5 shadow-lg shadow-black/10">
              <Search className="h-4 w-4 shrink-0 text-teal-300" />

              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users, events..."
                aria-label="Search users, events, and bookings"
                className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-white outline-none placeholder:text-slate-500"
              />

              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="shrink-0 rounded p-0.5 text-slate-500 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              aria-expanded={searchOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-teal-400/30 hover:bg-white/5 hover:text-teal-300"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Administrator Profile Info */}
        <div className="flex shrink-0 items-center gap-2 pl-0.5 sm:pl-1">
          {avatarUrl ? (
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-teal-400/30">
              <Image
                src={avatarUrl}
                alt={`${displayName}'s profile photo`}
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-teal-400/30 bg-teal-500 text-xs font-semibold text-slate-950">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="hidden leading-tight md:block">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-slate-500">{displayRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
