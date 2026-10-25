"use client";
import { useCallback, useEffect, useState } from "react";
import { organizerErrorMessage, organizerRequest } from "@/lib/organizer";

export function useOrganizerData<T>(path: string | null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ path: string | null; revision: number; data?: T; error?: string }>({ path: null, revision: -1 });
  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    organizerRequest<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ path, revision, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ path, revision, error: organizerErrorMessage(error) });
    });
    return () => controller.abort();
  }, [path, revision]);
  const current = state.path === path && state.revision === revision;
  const retry = useCallback(() => setRevision(value => value + 1), []);
  return { data: current ? state.data : undefined, error: current ? state.error : undefined,
    loading: path !== null && (!current || (!state.data && !state.error)), retry };
}
