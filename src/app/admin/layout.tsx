import { ToastProvider } from "@/app/admin/components/ui/ToastProvider";
import { AdminPreferencesProvider } from "@/app/admin/components/settings/AdminPreferencesProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider><AdminPreferencesProvider>{children}</AdminPreferencesProvider></ToastProvider>;
}
