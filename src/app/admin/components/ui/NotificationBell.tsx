
"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";

export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
};

type NotificationBellProps = {
  initialNotifications?: AdminNotification[];
};

export function NotificationBell({
  initialNotifications = [],
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Intentionally empty by default.
  const [notifications, setNotifications] =
    useState<AdminNotification[]>(initialNotifications);

  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // Close the panel when the user clicks outside or presses Escape.
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function markAsRead(id: string) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Notification bell */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-controls="admin-notifications-panel"
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg
          border border-white/10 transition-colors
          ${
            isOpen
              ? "bg-teal-400/10 text-teal-300"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
      >
        <Bell className="h-4 w-4" />

        {/* Show a dot only when there are unread notifications */}
        {unreadCount > 0 && (
          <>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-400" />
            <span className="sr-only">
              {unreadCount} unread notifications
            </span>
          </>
        )}
      </button>

      {/* Notification dropdown */}
      {isOpen && (
        <section
          id="admin-notifications-panel"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)]
            overflow-hidden rounded-xl border border-white/10
            bg-[#111b24] text-white shadow-2xl shadow-black/40"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Notifications
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Updates from your Aventix dashboard
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300">
                {notifications.length}
              </span>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Empty state */}
          {notifications.length === 0 ? (
            <div
              aria-live="polite"
              className="flex min-h-[240px] flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-400/15 bg-teal-400/10">
                <Inbox className="h-6 w-6 text-teal-300" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-100">
                You&apos;re all caught up
              </h3>

              <p className="mt-2 max-w-[250px] text-xs leading-5 text-slate-400">
                You don&apos;t have any notifications yet. New updates will
                appear here when there&apos;s something to review.
              </p>

              <span className="mt-4 rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-500">
                All clear
              </span>
            </div>
          ) : (
            <>
              {/* Notifications toolbar */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="text-xs text-slate-400">
                  {unreadCount === 0
                    ? "All notifications read"
                    : `${unreadCount} unread`}
                </p>

                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="flex items-center gap-1.5 text-xs font-medium text-teal-300 transition hover:text-teal-200 disabled:cursor-not-allowed disabled:text-slate-600"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all as read
                </button>
              </div>

              {/* Notification list */}
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className="flex w-full gap-3 border-b border-white/5 px-4 py-4 text-left transition last:border-b-0 hover:bg-white/[0.04]"
                  >
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        notification.read
                          ? "bg-slate-600"
                          : "bg-teal-400"
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-100">
                          {notification.title}
                        </span>

                        {!notification.read && (
                          <span className="shrink-0 text-[10px] font-medium text-teal-300">
                            New
                          </span>
                        )}
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-400">
                        {notification.message}
                      </span>

                      <span className="mt-2 block text-[10px] text-slate-500">
                        {notification.createdAt}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Panel footer */}
          <div className="border-t border-white/10 bg-black/10 px-4 py-3">
            <p className="text-center text-[10px] text-slate-500">
              Aventix Admin · Notifications
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
