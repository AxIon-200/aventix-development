"use client";
import { useEffect, useState } from "react";
import {
  publicAuthClient,
  type AccountSession,
  type PublicAuthClient,
} from "@/lib/auth/client";

export function useAccountSession(client: PublicAuthClient = publicAuthClient) {
  const [state, setState] = useState<{
    loading: boolean;
    session: AccountSession | null;
    unavailable: boolean;
  }>({
    loading: Boolean(client.getSession),
    session: null,
    unavailable: false,
  });
  useEffect(() => {
    let active = true;
    let request = 0;
    async function load() {
      const current = ++request;
      try {
        const session = client.getSession ? await client.getSession() : null;
        if (
          session &&
          (typeof session.userId !== "string" ||
            typeof session.displayName !== "string" ||
            typeof session.canBook !== "boolean")
        )
          throw new Error("Unsupported session format");
        if (
          session?.navigation &&
          (!Array.isArray(session.navigation) ||
            !session.navigation.every(
              (item) =>
                typeof item.label === "string" && typeof item.href === "string",
            ))
        )
          throw new Error("Unsupported account navigation");
        if (active && current === request)
          setState({
            loading: false,
            session,
            unavailable: !client.getSession,
          });
      } catch {
        if (active && current === request)
          setState({ loading: false, session: null, unavailable: true });
      }
    }
    const reload = () => { void load(); };
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    reload();
    window.addEventListener("aventix:session-updated", reload);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("aventix:session-updated", reload);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [client]);
  return {
    ...state,
    clearSession: () =>
      setState({ loading: false, session: null, unavailable: false }),
  };
}
