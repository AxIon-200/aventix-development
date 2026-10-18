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
    async function load() {
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
        if (active)
          setState({
            loading: false,
            session,
            unavailable: !client.getSession,
          });
      } catch {
        if (active)
          setState({ loading: false, session: null, unavailable: true });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [client]);
  return {
    ...state,
    clearSession: () =>
      setState({ loading: false, session: null, unavailable: false }),
  };
}
