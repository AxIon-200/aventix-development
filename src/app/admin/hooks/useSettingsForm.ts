"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AdminSettings,
  SetField,
  SettingsResponse,
  SettingsTabId,
} from "@/app/admin/types/settings";
import { TAB_FIELDS } from "@/app/admin/components/settings/settingsConfig";
import { updateSettings } from "@/app/admin/services/settingsService";

type Section = Record<string, unknown>;

function read(settings: AdminSettings, section: string, key: string) {
  return (settings[section as keyof AdminSettings] as Section)[key];
}

export type SaveResult = { ok: true } | { ok: false; message: string };

// One draft for ALL tabs, so switching tabs never loses an edit, plus the
// "what changed since the last save" bookkeeping.
// Mount it with a `key` (or only once data exists) so it starts from fresh data.
export function useSettingsForm(initial: SettingsResponse) {
  const [saved, setSaved] = useState(initial.settings);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [draft, setDraft] = useState(initial.settings);
  const [isSaving, setIsSaving] = useState(false);

  const setField: SetField = useCallback((section, key, value) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
  }, []);

  const dirtyTabs = useMemo(() => {
    const result = {} as Record<SettingsTabId, boolean>;
    for (const tab of Object.keys(TAB_FIELDS) as SettingsTabId[]) {
      result[tab] = TAB_FIELDS[tab].some(
        ([s, k]) => read(saved, s, k as string) !== read(draft, s, k as string)
      );
    }
    return result;
  }, [saved, draft]);

  const isDirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  const discard = useCallback(() => setDraft(saved), [saved]);

  const save = useCallback(async (): Promise<SaveResult> => {
    setIsSaving(true);
    try {
      const res = await updateSettings(draft);
      setSaved(res.settings);
      setDraft(res.settings);
      setUpdatedAt(res.updatedAt);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed to save settings" };
    } finally {
      setIsSaving(false);
    }
  }, [draft]);

  return { draft, updatedAt, isSaving, isDirty, dirtyTabs, setField, discard, save };
}
