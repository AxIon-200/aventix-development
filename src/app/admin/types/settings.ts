export type SettingsTabId = "general" | "notifications" | "security" | "appearance" | "system";

export type DailySummary = "daily" | "weekdays" | "weekly" | "never";
export type Theme = "dark" | "light" | "system";
export type Density = "comfortable" | "compact";
export type SidebarDefault = "expanded" | "collapsed";
export type DataRefresh = "off" | "1m" | "5m" | "15m";

// Every setting lives in exactly one place. Some controls (timezone, language,
// automatic logout, compact tables) are *shown* on more than one tab, but they
// all read and write the same value here.
export type AdminSettings = {
  general: {
    timezone: string; // IANA name, e.g. "Asia/Manila"
    language: string; // "en" | "fil"
  };
  notifications: {
    email: boolean;
    bookingReminders: boolean;
    paymentAlerts: boolean;
    eventUpdates: boolean;
    dailySummary: DailySummary;
  };
  security: {
    twoFactor: boolean;
    loginAlerts: boolean;
    autoLogout: boolean;
    sessionTimeout: number; // minutes
  };
  appearance: {
    theme: Theme;
    density: Density;
    compactTables: boolean;
    sidebar: SidebarDefault;
    reduceMotion: boolean;
  };
  system: {
    dataRefresh: DataRefresh;
    maintenanceMode: boolean; // platform-wide, not per-account
  };
};

export type SettingsSection = keyof AdminSettings;

// GET /admin/settings and PUT /admin/settings both return this.
export type SettingsResponse = {
  settings: AdminSettings;
  updatedAt: string | null; // null until the first save
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

// Typed setter shared by every settings view.
export type SetField = <S extends SettingsSection, K extends keyof AdminSettings[S]>(
  section: S,
  key: K,
  value: AdminSettings[S][K]
) => void;
