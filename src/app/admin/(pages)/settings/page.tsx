"use client";

import { getSettings } from "@/app/admin/services/settingsService";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { SettingsSkeleton } from "@/app/admin/components/settings/SettingsSkeleton";
import { SettingsWorkspace } from "@/app/admin/components/settings/SettingsWorkspace";

export default function SettingsPage() {
  const settings = useFetch(getSettings, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Configure your administrator workspace and system preferences."
      />

      {settings.error ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <ErrorState
            title="Couldn't load settings"
            message={settings.error}
            onRetry={settings.refetch}
          />
        </div>
      ) : settings.isLoading || !settings.data ? (
        <SettingsSkeleton />
      ) : (
        // Mounted only once data exists, so the form state starts from the saved values.
        <SettingsWorkspace initial={settings.data} />
      )}
    </div>
  );
}
