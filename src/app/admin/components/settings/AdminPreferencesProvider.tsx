"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AdminSettings } from "@/app/admin/types/settings";
import { getSettings, SETTINGS_SAVED_EVENT } from "@/app/admin/services/settingsService";

const PreferencesContext = createContext<AdminSettings | null>(null);
export const useAdminPreferences = () => useContext(PreferencesContext);

export function AdminPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  useEffect(() => {
    let current = true;
    let changed = false;
    const onSave = (event: Event) => {
      changed = true;
      setSettings((event as CustomEvent<AdminSettings>).detail);
    };
    window.addEventListener(SETTINGS_SAVED_EVENT, onSave);
    getSettings().then(result => {
      if (current && !changed) setSettings(result.settings);
    }).catch(() => { /* The settings page provides the load error and retry UI. */ });
    return () => { current = false; window.removeEventListener(SETTINGS_SAVED_EVENT, onSave); };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.dataset.adminTimezone = settings.general.timezone;
    try {
      localStorage.setItem("aventix_admin_sidebar_collapsed", settings.appearance.sidebar === "collapsed" ? "1" : "0");
      window.dispatchEvent(new Event("aventix-admin-sidebar-change"));
    } catch { /* Browser storage may be disabled. */ }
    return () => { delete root.dataset.adminTimezone; };
  }, [settings]);

  return <PreferencesContext.Provider value={settings}>
    <div className="admin-workspace" data-density={settings?.appearance.density}
      data-compact-tables={settings?.appearance.compactTables || undefined}
      data-reduce-motion={settings?.appearance.reduceMotion || undefined}>
      {children}
    </div>
  </PreferencesContext.Provider>;
}
