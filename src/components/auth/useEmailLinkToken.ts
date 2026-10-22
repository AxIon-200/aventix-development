"use client";

import { useEffect, useRef, useState } from "react";

type CaptureState = "loading" | "missing" | "ready";

/** Keeps authentication email tokens in memory and removes the fragment from history. */
export function useEmailLinkToken(destination?: string, onReopen?: () => void) {
  const [token, setToken] = useState<string | undefined>(undefined);
  const captured = useRef(false);
  const [status, setStatus] = useState<CaptureState>("loading");

  useEffect(() => {
    function capture(reopened = false) {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      if (captured.current && !fragment.has("token")) return;
      captured.current = true;
      const value = fragment.getAll("token").length === 1 ? fragment.get("token") : null;
      window.history.replaceState(window.history.state, "", window.location.pathname + (destination ? `?${new URLSearchParams({ returnTo: destination })}` : ""));
      const capturedToken = value && value.length <= 512 ? value : undefined;
      setToken(capturedToken);
      setStatus(capturedToken ? "ready" : "missing");
      if (reopened) onReopen?.();
    }
    capture();
    function onHashChange() { capture(true); }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [destination, onReopen]);

  function clear() {
    setToken(undefined);
    setStatus("missing");
  }

  return { token, status, clear };
}
