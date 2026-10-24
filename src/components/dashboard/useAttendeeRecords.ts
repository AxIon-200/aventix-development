"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccountSession } from "@/components/auth/useAccountSession";
import { demoStorageKey, demoRecordsChanged, parseDemoBookings, type AttendeeRecords } from "@/lib/attendee-records";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(demoRecordsChanged, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(demoRecordsChanged, listener);
  };
}

export function useAttendeeRecords() {
  const account = useAccountSession();
  const userId = !account.loading && !account.unavailable && account.session?.role === "ATTENDEE"
    ? account.session.userId : undefined;
  const [result, setResult] = useState<{ userId: string; data?: AttendeeRecords; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const raw = useSyncExternalStore(subscribe, () => {
    try { return userId ? localStorage.getItem(demoStorageKey(userId)) : null; }
    catch { return null; }
  }, () => null);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch("/api/v1/attendee/dashboard", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Your attendee records could not be loaded. Please retry.");
        const body = await response.json();
        if (body.data?.userId !== userId || !Array.isArray(body.data?.bookings)) throw new Error("Attendee records could not be verified.");
        if (!controller.signal.aborted) setResult({ userId, data: body.data });
      })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ userId, error: error.message });
      });
    return () => controller.abort();
  }, [userId, revision]);

  const current = result?.userId === userId ? result : null;
  return {
    loading: !userId || !current,
    error: current?.error,
    bookings: current?.data?.bookings ?? [],
    demos: userId ? parseDemoBookings(raw) : [],
    retry: () => setRevision(value => value + 1),
  };
}
