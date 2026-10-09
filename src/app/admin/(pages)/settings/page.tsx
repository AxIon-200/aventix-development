export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        This section is wired into the admin layout and routing, ready for
        its own form once the backend endpoint exists.
      </p>
      <div className="mt-6 rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-slate-500">
        Platform settings form goes here
      </div>
    </div>
  );
}
