"use client";

import { useEffect, useState, useCallback } from "react";

type FetchState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

// Already in your project from the dashboard/bookings work — skip this
// file if useFetch.ts already exists under src/hooks/.
export function useFetch<T>(fetchFn: () => Promise<T>, deps: unknown[] = []) {
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

  return { ...state, refetch: run };
}
