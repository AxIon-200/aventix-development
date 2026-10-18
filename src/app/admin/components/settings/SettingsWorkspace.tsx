"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SettingsResponse, SettingsTabId } from "@/app/admin/types/settings";
import { useSettingsForm } from "@/app/admin/hooks/useSettingsForm";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/app/admin/components/ui/ConfirmDialog";
import { ChangePasswordModal } from "@/app/admin/components/settings/ChangePasswordModal";
import { ServiceStatusBar } from "@/app/admin/components/settings/ServiceStatusBar";
import { SettingsNav, panelId, tabId } from "@/app/admin/components/settings/SettingsNav";
import { TABS } from "@/app/admin/components/settings/settingsConfig";
import {
  AppearanceSettings,
  GeneralSettings,
  NotificationSettings,
  SecuritySettings,
  SystemSettings,
} from "@/app/admin/components/settings/settingsSections";

export function SettingsWorkspace({ initial }: { initial: SettingsResponse }) {
  const toast = useToast();
  const form = useSettingsForm(initial);
  const { draft, isDirty, isSaving, save } = form;

  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [maintenancePrompt, setMaintenancePrompt] = useState(false);

  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;
    const result = await save();
    if (result.ok) toast.success("Settings saved.");
    else toast.error(result.message);
  }, [isDirty, isSaving, save, toast]);

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleSave]);

  // Warn before closing/reloading the tab with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function toggleMaintenance(next: boolean) {
    // Turning it ON affects every user, so ask first. Turning it off needs no prompt.
    if (next) setMaintenancePrompt(true);
    else form.setField("system", "maintenanceMode", false);
  }

  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const rowProps = { values: draft, onChange: form.setField };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
      <SettingsNav tabs={TABS} active={activeTab} onChange={setActiveTab} dirtyTabs={form.dirtyTabs} />

      <section
        role="tabpanel"
        id={panelId(tab.id)}
        aria-labelledby={tabId(tab.id)}
        className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      >
        <div>
          <h2 className="text-base font-semibold text-white">{tab.title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{tab.subtitle}</p>
        </div>

        {/* Locked while saving so edits can't be lost mid-request. */}
        <fieldset disabled={isSaving} className="min-w-0 divide-y divide-white/5">
          {tab.id === "general" && <GeneralSettings {...rowProps} />}
          {tab.id === "notifications" && <NotificationSettings {...rowProps} />}
          {tab.id === "security" && (
            <SecuritySettings {...rowProps} onChangePassword={() => setPasswordOpen(true)} />
          )}
          {tab.id === "appearance" && <AppearanceSettings {...rowProps} />}
          {tab.id === "system" && <SystemSettings {...rowProps} onToggleMaintenance={toggleMaintenance} />}
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className={`text-xs ${isDirty ? "text-amber-300" : "text-slate-500"}`} aria-live="polite">
            {isDirty ? "You have unsaved changes." : tab.note}
          </p>
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={form.discard}
                disabled={isSaving}
                className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="flex items-center gap-2 rounded-lg bg-teal-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>

        <ServiceStatusBar message={tab.status} updatedAt={form.updatedAt} />
      </section>

      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}

      <ConfirmDialog
        isOpen={maintenancePrompt}
        title="Enable maintenance mode?"
        description="Once you save, user-facing actions like booking and checkout will be restricted for everyone on the platform until you turn this off."
        confirmLabel="Enable"
        variant="danger"
        onCancel={() => setMaintenancePrompt(false)}
        onConfirm={() => {
          form.setField("system", "maintenanceMode", true);
          setMaintenancePrompt(false);
        }}
      />
    </div>
  );
}
