"use client";

import {
  Users,
  Store,
  CalendarDays,
  Layers,
  Ticket,
  Image as ImageIcon,
  Activity,
  Download,
} from "lucide-react";
import { useFetch } from "@/app/admin/hooks/useFetch";
import {
  getDashboardStats,
  getRecentEvents,
  getRecentUsers,
  getRecentBookings,
} from "@/app/admin/services/dashboardService";
import { StatCard } from "@/app/admin/components/dashboard/StatCard";
import { SalesAnalyticsChart } from "@/app/admin/components/dashboard/SalesAnalyticsCard";
import { BookingStatusCard } from "@/app/admin/components/dashboard/BookingStatusCard";
import { RecentTable } from "@/app/admin/components/dashboard/RecentTable";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useFetch(
    () => getDashboardStats(),
    []
  );
  const { data: events, isLoading: eventsLoading } = useFetch(
    () => getRecentEvents(),
    []
  );
  const { data: users, isLoading: usersLoading } = useFetch(
    () => getRecentUsers(),
    []
  );
  const { data: bookings, isLoading: bookingsLoading } = useFetch(
    () => getRecentBookings(),
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Aventix Platform
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Administrator Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor platform activity, ticket sales, organizers, users,
            bookings, and revenue from one control center.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
          <Download className="h-4 w-4" />
          Export report
        </button>
      </div>

      {statsLoading || !stats ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} change={stats.totalUsersChange} icon={Users} />
          <StatCard label="Total Organizers" value={stats.totalOrganizers} change={stats.totalOrganizersChange} icon={Store} />
          <StatCard label="Total Events" value={stats.totalEvents} change={stats.totalEventsChange} icon={CalendarDays} />
          <StatCard label="Upcoming Events" value={stats.upcomingEvents} change={stats.upcomingEventsChange} icon={Layers} />
          <StatCard label="Confirmed Bookings" value={stats.confirmedBookings} change={stats.confirmedBookingsChange} icon={Ticket} />
          <StatCard label="Tickets Sold" value={stats.ticketsSold.toLocaleString()} change={stats.ticketsSoldChange} icon={ImageIcon} />
          <StatCard label="Recorded Revenue" value={`₱${stats.recordedRevenue.toLocaleString()}`} change={stats.recordedRevenueChange} icon={ImageIcon} />
          <StatCard label="Recent Activity" value={stats.recentActivityCount} change={stats.recentActivityChange} icon={Activity} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SalesAnalyticsChart />
        </div>
        <BookingStatusCard />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <RecentTable
          title="Recent events"
          rows={events}
          isLoading={eventsLoading}
          getRowId={(e) => e.id}
          emptyMessage="No events yet"
          columns={[
            { header: "Event", render: (e) => e.title },
            { header: "Date", render: (e) => new Date(e.date).toLocaleDateString() },
            { header: "Status", render: (e) => <span className="capitalize">{e.status}</span> },
          ]}
        />
        <RecentTable
          title="Recent users"
          rows={users}
          isLoading={usersLoading}
          getRowId={(u) => u.id}
          emptyMessage="No users yet"
          columns={[
            { header: "Name", render: (u) => u.name },
            { header: "Email", render: (u) => u.email },
            { header: "Joined", render: (u) => new Date(u.joinedAt).toLocaleDateString() },
          ]}
        />
        <RecentTable
          title="Recent bookings"
          rows={bookings}
          isLoading={bookingsLoading}
          getRowId={(b) => b.id}
          emptyMessage="No bookings yet"
          columns={[
            { header: "Event", render: (b) => b.eventTitle },
            { header: "User", render: (b) => b.userName },
            { header: "Status", render: (b) => <span className="capitalize">{b.status}</span> },
          ]}
        />
      </div>
    </div>
  );
}
