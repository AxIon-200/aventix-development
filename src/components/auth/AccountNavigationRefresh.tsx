"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { publicAuthClient } from "@/lib/auth/client";
import { accountSession } from "@/lib/auth/account-session";

/** Lives above page layouts so preserved and query-only navigations also refresh. */
export default function AccountNavigationRefresh() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    accountSession(publicAuthClient).navigate(`${pathname}?${search}`);
  }, [pathname, search]);
  return null;
}
