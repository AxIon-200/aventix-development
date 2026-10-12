"use client";

import { AdminSettings, SetField } from "@/app/admin/types/settings";
import { SelectField } from "@/app/admin/components/ui/SelectField";
import { Toggle } from "@/app/admin/components/ui/Toggle";
import { SettingRow } from "@/app/admin/components/settings/SettingRow";
import {
  LANGUAGE_OPTIONS,
  SESSION_TIMEOUT_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/app/admin/components/settings/settingsConfig";

// Rows that appear on more than one tab. Each one reads and writes a single
// value, so the copies on different tabs can never disagree.
export type RowProps = { values: AdminSettings; onChange: SetField };

export function TimezoneRow({ values, onChange }: RowProps) {
  return (
    <SettingRow
      id="timezone"
      label="Timezone"
      description="Used when displaying timestamps in activity logs and reports."
      control={(a) => (
        <SelectField
          {...a}
          value={values.general.timezone}
          onChange={(v) => onChange("general", "timezone", v)}
          options={TIMEZONE_OPTIONS}
        />
      )}
    />
  );
}

export function LanguageRow({ values, onChange }: RowProps) {
  return (
    <SettingRow
      id="language"
      label="Language"
      description="Interface language for this administrator account."
      control={(a) => (
        <SelectField
          {...a}
          value={values.general.language}
          onChange={(v) => onChange("general", "language", v)}
          options={LANGUAGE_OPTIONS}
        />
      )}
    />
  );
}

export function AutoLogoutRow({ values, onChange }: RowProps) {
  return (
    <SettingRow
      id="auto-logout"
      label="Automatic logout"
      description="Sign out after a period of inactivity for better account security."
      control={(a) => (
        <Toggle
          {...a}
          checked={values.security.autoLogout}
          onChange={(v) => onChange("security", "autoLogout", v)}
        />
      )}
    />
  );
}

export function SessionTimeoutRow({ values, onChange }: RowProps) {
  const enabled = values.security.autoLogout;
  return (
    <SettingRow
      id="session-timeout"
      label="Session timeout"
      description={
        enabled
          ? "How long an inactive session remains active."
          : "Turn on automatic logout to choose a timeout."
      }
      control={(a) => (
        <SelectField
          {...a}
          disabled={!enabled}
          value={String(values.security.sessionTimeout)}
          onChange={(v) => onChange("security", "sessionTimeout", Number(v))}
          options={SESSION_TIMEOUT_OPTIONS}
        />
      )}
    />
  );
}

export function CompactTablesRow({ values, onChange }: RowProps) {
  return (
    <SettingRow
      id="compact-tables"
      label="Compact tables"
      description="Reduce row height across management tables."
      control={(a) => (
        <Toggle
          {...a}
          checked={values.appearance.compactTables}
          onChange={(v) => onChange("appearance", "compactTables", v)}
        />
      )}
    />
  );
}
