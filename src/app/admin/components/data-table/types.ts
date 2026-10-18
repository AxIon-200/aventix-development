import { ReactNode } from "react";

export type Column<T> = {
  header: string;
  align?: "left" | "center" | "right";
  className?: string; // extra classes for the cell, e.g. "max-w-[240px] truncate"
  render: (row: T) => ReactNode;
};

export type FilterOption = { value: string; label: string };

export type FilterConfig = {
  key: string; // must match a key of the page's filters object
  label: string; // accessible name, e.g. "Filter by status"
  allLabel: string; // text for the "no filter" option, e.g. "All statuses"
  options: FilterOption[];
};
