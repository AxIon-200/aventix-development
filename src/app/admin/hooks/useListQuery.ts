"use client";

import { useCallback, useEffect, useState } from "react";
import { ListParams, PaginatedResult } from "@/app/admin/types/common";
import { useDebounce } from "@/app/admin/hooks/useDebounce";

type Options<T, F extends Record<string, string>> = {
  // Pass a stable function (your service function, defined at module level).
  fetcher: (params: ListParams<F>) => Promise<PaginatedResult<T>>;
  initialFilters: F;
  pageSize?: number;
  searchDebounceMs?: number;
};

export interface ListQueryResult<T, F extends Record<string, string>> {
  data: PaginatedResult<T> | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;

  searchInput: string; // what's typed in the box
  search: string; // the debounced value actually sent to the backend
  setSearchInput: (value: string) => void;
  filters: F;
  setFilter: (key: keyof F & string, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  total: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
}

// Owns search + filters + pagination + fetching for ANY list page.
// Changing the search or a filter resets to page 1 in the same update,
// so there is never a request with a stale page number.
export function useListQuery<T, F extends Record<string, string>>({
  fetcher,
  initialFilters,
  pageSize = 10,
  searchDebounceMs = 400,
}: Options<T, F>): ListQueryResult<T, F> {
  const [initial] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const debounced = useDebounce(searchInput, searchDebounceMs);
  const [query, setQuery] = useState<{ page: number; search: string; filters: F }>({
    page: 1,
    search: "",
    filters: initialFilters,
  });
  const [state, setState] = useState<{
    data: PaginatedResult<T> | null;
    isLoading: boolean;
    error: string | null;
  }>({ data: null, isLoading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const next = debounced.trim();
    setQuery((q) => (q.search === next ? q : { ...q, search: next, page: 1 }));
  }, [debounced]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetcher({ page: query.page, pageSize, search: query.search, filters: query.filters })
      .then((data) => !cancelled && setState({ data, isLoading: false, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({ data: null, isLoading: false, error: err?.message ?? "Something went wrong" })
      );
    return () => {
      cancelled = true;
    };
  }, [fetcher, query, pageSize, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const setPage = useCallback((page: number) => setQuery((q) => ({ ...q, page })), []);
  const setFilter = useCallback(
    (key: keyof F & string, value: string) =>
      setQuery((q) => ({ ...q, page: 1, filters: { ...q.filters, [key]: value } })),
    []
  );
  const clearFilters = useCallback(() => {
    setSearchInput("");
    setQuery({ page: 1, search: "", filters: initial });
  }, [initial]);

  const total = state.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters =
    query.search !== "" || (Object.keys(initial) as (keyof F)[]).some((k) => query.filters[k] !== initial[k]);

  return {
    ...state,
    refetch,
    searchInput,
    search: query.search,
    setSearchInput,
    filters: query.filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    page: query.page,
    setPage,
    pageSize,
    total,
    totalPages,
    rangeStart: total === 0 ? 0 : (query.page - 1) * pageSize + 1,
    rangeEnd: Math.min(query.page * pageSize, total),
  };
}
