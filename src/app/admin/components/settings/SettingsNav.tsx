"use client";

import { KeyboardEvent, useRef } from "react";
import { SettingsTabId } from "@/app/admin/types/settings";
import { TabConfig } from "@/app/admin/components/settings/settingsConfig";

type Props = {
  tabs: TabConfig[];
  active: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
  dirtyTabs: Record<SettingsTabId, boolean>;
};

export const tabId = (id: SettingsTabId) => `settings-tab-${id}`;
export const panelId = (id: SettingsTabId) => `settings-panel-${id}`;

export function SettingsNav({ tabs, active, onChange, dirtyTabs }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Arrow keys / Home / End move between tabs (standard tabs keyboard pattern).
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.id === active);
    let next = i;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;

    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Settings sections"
      onKeyDown={onKeyDown}
      className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3 lg:flex-col lg:overflow-visible"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            id={tabId(tab.id)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${
              selected
                ? "border-teal-400/40 bg-teal-500/10"
                : "border-transparent hover:bg-white/5"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`text-sm font-medium ${selected ? "text-white" : "text-slate-300"}`}>
                {tab.label}
              </span>
              {dirtyTabs[tab.id] && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                  <span className="sr-only">(unsaved changes)</span>
                </>
              )}
            </span>
            <span className="mt-0.5 hidden text-[11px] text-slate-500 lg:block">{tab.description}</span>
          </button>
        );
      })}
    </div>
  );
}
