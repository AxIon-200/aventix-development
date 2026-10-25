"use client";

import { KeyRound } from "lucide-react";
import { DailySummary, DataRefresh, Density, SidebarDefault, Theme } from "@/app/admin/types/settings";
import { SelectField } from "@/app/admin/components/ui/SelectField";
import { Toggle } from "@/app/admin/components/ui/Toggle";
import { SettingRow } from "@/app/admin/components/settings/SettingRow";
import {
  AutoLogoutRow,
  CompactTablesRow,
  LanguageRow,
  RowProps,
  SessionTimeoutRow,
  TimezoneRow,
} from "@/app/admin/components/settings/settingsRows";
import {
  DAILY_SUMMARY_OPTIONS,
  DATA_REFRESH_OPTIONS,
  DENSITY_OPTIONS,
  SIDEBAR_OPTIONS,
  THEME_OPTIONS,
} from "@/app/admin/components/settings/settingsConfig";

export function GeneralSettings(p: RowProps) {
  return (
    <>
      <TimezoneRow {...p} />
      <LanguageRow {...p} />
      <AutoLogoutRow {...p} />
      <SessionTimeoutRow {...p} />
      <CompactTablesRow {...p} />
    </>
  );
}

export function NotificationSettings({ values, onChange }: RowProps) {
  const n = values.notifications;
  return (
    <>
      <SettingRow
        id="email"
        label="Email notifications"
        description="Receive important account and system updates by email."
        control={(a) => (
          <Toggle {...a} checked={n.email} onChange={(v) => onChange("notifications", "email", v)} />
        )}
      />
      <SettingRow
        id="booking-reminders"
        label="Booking reminders"
        description="Send reminders for upcoming bookings and schedule changes."
        control={(a) => (
          <Toggle
            {...a}
            checked={n.bookingReminders}
            onChange={(v) => onChange("notifications", "bookingReminders", v)}
          />
        )}
      />
      <SettingRow
        id="payment-alerts"
        label="Payment alerts"
        description="Notify administrators when payments are completed or refunded."
        control={(a) => (
          <Toggle
            {...a}
            checked={n.paymentAlerts}
            onChange={(v) => onChange("notifications", "paymentAlerts", v)}
          />
        )}
      />
      <SettingRow
        id="event-updates"
        label="Event updates"
        description="Receive updates when organizers create or edit events."
        control={(a) => (
          <Toggle
            {...a}
            checked={n.eventUpdates}
            onChange={(v) => onChange("notifications", "eventUpdates", v)}
          />
        )}
      />
      <SettingRow
        id="daily-summary"
        label="Daily activity summary"
        description="Choose how often the daily activity summary is delivered."
        control={(a) => (
          <SelectField
            {...a}
            value={n.dailySummary}
            onChange={(v) => onChange("notifications", "dailySummary", v as DailySummary)}
            options={DAILY_SUMMARY_OPTIONS}
          />
        )}
      />
    </>
  );
}

export function SecuritySettings({
  values,
  onChange,
  onChangePassword,
}: RowProps & { onChangePassword: () => void }) {
  const s = values.security;
  return (
    <>
      <SettingRow
        id="password"
        label="Password authentication"
        description="Update the administrator password used to sign in."
        control={(a) => (
          <button
            type="button"
            onClick={onChangePassword}
            aria-describedby={a.describedBy}
            className="flex items-center justify-center gap-2 rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2 text-sm font-medium text-teal-300 transition-colors hover:bg-teal-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
          >
            <KeyRound className="h-4 w-4" />
            Change password
          </button>
        )}
      />
      <SettingRow
        id="two-factor"
        label="Two-factor authentication"
        description="Not available yet. Administrator sign-in currently uses your password."
        control={(a) => (
          <Toggle {...a} disabled checked={s.twoFactor} onChange={(v) => onChange("security", "twoFactor", v)} />
        )}
      />
      <SettingRow
        id="login-alerts"
        label="Login alerts"
        description="Notifications for new sign-ins are not available yet."
        control={(a) => (
          <Toggle {...a} disabled checked={s.loginAlerts} onChange={(v) => onChange("security", "loginAlerts", v)} />
        )}
      />
      <AutoLogoutRow values={values} onChange={onChange} />
      <SessionTimeoutRow values={values} onChange={onChange} />
    </>
  );
}

export function AppearanceSettings({ values, onChange }: RowProps) {
  const a = values.appearance;
  return (
    <>
      <SettingRow
        id="theme"
        label="Theme"
        description="Choose the interface theme for this administrator account."
        control={(aria) => (
          <SelectField
            {...aria}
            value={a.theme}
            onChange={(v) => onChange("appearance", "theme", v as Theme)}
            options={THEME_OPTIONS}
          />
        )}
      />
      <SettingRow
        id="density"
        label="Interface density"
        description="Control spacing and row height across the workspace."
        control={(aria) => (
          <SelectField
            {...aria}
            value={a.density}
            onChange={(v) => onChange("appearance", "density", v as Density)}
            options={DENSITY_OPTIONS}
          />
        )}
      />
      <CompactTablesRow values={values} onChange={onChange} />
      <SettingRow
        id="sidebar"
        label="Sidebar state"
        description="Choose whether the navigation opens expanded or collapsed."
        control={(aria) => (
          <SelectField
            {...aria}
            value={a.sidebar}
            onChange={(v) => onChange("appearance", "sidebar", v as SidebarDefault)}
            options={SIDEBAR_OPTIONS}
          />
        )}
      />
      <SettingRow
        id="reduce-motion"
        label="Reduce motion"
        description="Use fewer interface animations and transitions."
        control={(aria) => (
          <Toggle
            {...aria}
            checked={a.reduceMotion}
            onChange={(v) => onChange("appearance", "reduceMotion", v)}
          />
        )}
      />
    </>
  );
}

export function SystemSettings({
  values,
  onChange,
  onToggleMaintenance,
}: RowProps & { onToggleMaintenance: (next: boolean) => void }) {
  const sys = values.system;
  return (
    <>
      <TimezoneRow values={values} onChange={onChange} />
      <LanguageRow values={values} onChange={onChange} />
      <AutoLogoutRow values={values} onChange={onChange} />
      <SettingRow
        id="data-refresh"
        label="Data refresh"
        description="Choose how often dashboard data refreshes automatically."
        control={(a) => (
          <SelectField
            {...a}
            value={sys.dataRefresh}
            onChange={(v) => onChange("system", "dataRefresh", v as DataRefresh)}
            options={DATA_REFRESH_OPTIONS}
          />
        )}
      />
      <SettingRow
        id="maintenance"
        label="Maintenance mode"
        badge="All users"
        description="Not available yet. Platform booking and checkout restrictions have not been implemented."
        control={(a) => (
          <Toggle {...a} disabled checked={sys.maintenanceMode} onChange={onToggleMaintenance} />
        )}
      />
    </>
  );
}
