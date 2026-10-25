import { AdminSettings, SettingsSection, SettingsTabId } from "@/app/admin/types/settings";
import { SelectOptionItem } from "@/app/admin/components/ui/SelectField";

export type TabConfig = {
  id: SettingsTabId;
  label: string;
  description: string; // under the label in the left nav
  title: string; // panel heading
  subtitle: string;
  status: string; // text in the status bar at the bottom of the panel
  note: string; // text next to the Save button
};

const ACCOUNT_NOTE = "Changes apply to this administrator account only.";

export const TABS: TabConfig[] = [
  {
    id: "general",
    label: "General",
    description: "Workspace and account defaults",
    title: "General settings",
    subtitle: "Workspace defaults used across the Aventix admin portal.",
    status: "Preferences are stored for your administrator account",
    note: ACCOUNT_NOTE,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts and email preferences",
    title: "Notification settings",
    subtitle: "Save your notification preferences. Automated delivery is not available yet.",
    status: "Preferences are saved; automated notification delivery is not available",
    note: ACCOUNT_NOTE,
  },
  {
    id: "security",
    label: "Security",
    description: "Authentication and sessions",
    title: "Security settings",
    subtitle: "Manage authentication and session controls.",
    status: "Password changes use your account authentication service",
    note: ACCOUNT_NOTE,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and density",
    title: "Appearance settings",
    subtitle: "Customize the admin workspace appearance.",
    status: "Saved appearance preferences apply across your admin workspace",
    note: ACCOUNT_NOTE,
  },
  {
    id: "system",
    label: "System",
    description: "Application behavior",
    title: "System settings",
    subtitle: "Control application behavior and maintenance preferences.",
    status: "Data refresh applies while your admin workspace is open",
    note: "Changes apply to this administrator account only. Maintenance mode is unavailable.",
  },
];

// Which settings each tab shows. Used to put an "unsaved" dot on the right tabs.
// A setting can appear on several tabs (it is still one value).
type FieldRef = {
  [S in SettingsSection]: readonly [S, keyof AdminSettings[S]];
}[SettingsSection];

export const TAB_FIELDS: Record<SettingsTabId, FieldRef[]> = {
  general: [
    ["general", "timezone"],
    ["general", "language"],
    ["security", "autoLogout"],
    ["security", "sessionTimeout"],
    ["appearance", "compactTables"],
  ],
  notifications: [
    ["notifications", "email"],
    ["notifications", "bookingReminders"],
    ["notifications", "paymentAlerts"],
    ["notifications", "eventUpdates"],
    ["notifications", "dailySummary"],
  ],
  security: [
    ["security", "twoFactor"],
    ["security", "loginAlerts"],
    ["security", "autoLogout"],
    ["security", "sessionTimeout"],
  ],
  appearance: [
    ["appearance", "theme"],
    ["appearance", "density"],
    ["appearance", "compactTables"],
    ["appearance", "sidebar"],
    ["appearance", "reduceMotion"],
  ],
  system: [
    ["general", "timezone"],
    ["general", "language"],
    ["security", "autoLogout"],
    ["system", "dataRefresh"],
    ["system", "maintenanceMode"],
  ],
};

export const TIMEZONE_OPTIONS: SelectOptionItem[] = [
  { value: "Asia/Manila", label: "Asia/Manila (GMT+8)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (GMT+8)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (GMT+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+9)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (GMT+10/+11)" },
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "Europe/London", label: "Europe/London (GMT+0/+1)" },
  { value: "America/New_York", label: "America/New York (GMT−5/−4)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (GMT−8/−7)" },
];

export const LANGUAGE_OPTIONS: SelectOptionItem[] = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino (coming soon)", disabled: true },
];

export const SESSION_TIMEOUT_OPTIONS: SelectOptionItem[] = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
];

export const DAILY_SUMMARY_OPTIONS: SelectOptionItem[] = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays only" },
  { value: "weekly", label: "Once a week" },
  { value: "never", label: "Never" },
];

// Only dark exists in the app today; the others show up but can't be picked yet.
export const THEME_OPTIONS: SelectOptionItem[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light (coming soon)", disabled: true },
  { value: "system", label: "System (coming soon)", disabled: true },
];

export const DENSITY_OPTIONS: SelectOptionItem[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export const SIDEBAR_OPTIONS: SelectOptionItem[] = [
  { value: "expanded", label: "Expanded" },
  { value: "collapsed", label: "Collapsed" },
];

export const DATA_REFRESH_OPTIONS: SelectOptionItem[] = [
  { value: "off", label: "Manual only" },
  { value: "1m", label: "Every minute" },
  { value: "5m", label: "Every 5 minutes" },
  { value: "15m", label: "Every 15 minutes" },
];
