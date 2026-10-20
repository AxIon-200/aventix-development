"use client";
import { useEffect, useRef, useState } from "react";
import { AuthClientError, publicAuthClient, type AccountSession, type AuthErrorCode, type PublicAuthClient } from "@/lib/auth/client";

export type AccountState = { loading: boolean; session: AccountSession | null; unavailable: boolean; error?: AuthErrorCode };

export function useAccountSession(client: PublicAuthClient = publicAuthClient, initial?: AccountState) {
  const [state, setState] = useState<AccountState>(initial ?? { loading: true, session: null, unavailable: false });
  const sequence = useRef(0);
  const reload = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true;
    async function load() {
      const current = ++sequence.current;
      try {
        if (!client.getSession) throw new AuthClientError("UNAVAILABLE");
        const session = await client.getSession();
        if (active && current === sequence.current) setState({ loading: false, session, unavailable: false });
      } catch (error) {
        if (active && current === sequence.current) setState({ loading: false, session: null, unavailable: true,
          error: error instanceof AuthClientError ? error.code : "UNAVAILABLE" });
      }
    }
    const refresh = () => { void load(); };
    reload.current = refresh;
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail === "signed-out" || detail === "blocked") {
        ++sequence.current;
        setState({ loading: false, session: null, unavailable: detail === "blocked", error: detail === "blocked" ? "LOGOUT_UNCERTAIN" : undefined });
      } else refresh();
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("aventix:session-updated", changed);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      window.removeEventListener("aventix:session-updated", changed);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [client]);
  return { ...state, retry: () => reload.current(), clearSession: () => {
    ++sequence.current;
    setState({ loading: false, session: null, unavailable: false });
  } };
}
