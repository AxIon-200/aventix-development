"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminPreferences } from "@/app/admin/components/settings/AdminPreferencesProvider";

type FetchState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

// Already in your project from the dashboard/bookings work — skip this
// file if useFetch.ts already exists under src/hooks/.
export function useFetch<T>(fetchFn: () => Promise<T>, deps: unknown[] = [], autoRefresh = false) {
  const preferences = useAdminPreferences();
  const refresh = preferences?.system.dataRefresh ?? "off";
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetchFn()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            data: null,
            isLoading: false,
            error: err?.message ?? "Something went wrong",
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);

  useEffect(() => {
    const minutes = { off: 0, "1m": 1, "5m": 5, "15m": 15 }[refresh];
    if (!autoRefresh || !minutes) return;
    let cancel: (() => void) | undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      cancel?.();
      cancel = run();
    }, minutes * 60_000);
    return () => { clearInterval(timer); cancel?.(); };
  }, [run, refresh, autoRefresh]);

  return { ...state, refetch: run };
}
