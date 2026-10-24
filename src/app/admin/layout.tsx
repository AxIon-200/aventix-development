import { ToastProvider } from "@/app/admin/components/ui/ToastProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
