"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ManagedUser,
  PaginatedResult,
  UserListParams,
  UserStats,
} from "@/app/admin/types/users";
import { getUsers, getUserStats } from "@/app/admin/services/userService";

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

export function useUsers({ page, pageSize, search, status }: UserListParams) {
  const [state, setState] = useState<QueryState<PaginatedResult<ManagedUser>>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    getUsers({ page, pageSize, search, status })
      .then((data) => !cancelled && setState({ data, isLoading: false, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({ data: null, isLoading: false, error: err?.message ?? "Something went wrong" })
      );
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, status, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}

export function useUserStats() {
  const [state, setState] = useState<QueryState<UserStats>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    getUserStats()
      .then((data) => !cancelled && setState({ data, isLoading: false, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({ data: null, isLoading: false, error: err?.message ?? "Something went wrong" })
      );
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}
