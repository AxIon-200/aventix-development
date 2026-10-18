"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ManagedUser,
  UserStats,
  UserStatusFilter,
} from "@/app/admin/types/users";
import { PaginatedResult } from "@/app/admin/types/common";
import { getUsers, getUserStats } from "@/app/admin/services/userService";

export type UserListParams = {
  page: number;
  pageSize: number;
  search: string;
  status: UserStatusFilter;
};

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
    getUsers({ page, pageSize, search, filters: { status } })
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
