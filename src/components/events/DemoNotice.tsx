export default function DemoNotice() {
  if (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL) return null;
  return <p className="mb-6 rounded-lg border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-5 text-amber-200">Demo events are loaded from the local test database. Event details, prices, availability, and promotional claims are sample content, not live offers. No bookings or payments can be made.</p>;
}
