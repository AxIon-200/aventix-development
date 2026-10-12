import { Payment, TransactionStatus } from "@/app/admin/types/payments";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCHES — only used while USE_MOCK is true in paymentService.ts
//   seedPayments: false = empty table (the real starting state)
//                 true  = 68 sample transactions
//   failRequests: true  = every request fails (preview the error states)
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  seedPayments: true,
  failRequests: false,
};

const USERS = ["Mia Santos", "Noah Garcia", "Alyssa Cruz", "Ethan Lim", "Sofia Reyes", "Daniel Tan", "Nina Ramos", "Lucas Bautista", "Isabel Mendoza", "Gabriel Aquino"];
const METHODS = ["GCash", "Visa •••• 4921", "Maya", "GCash", "Visa •••• 1184", "GCash", "Maya"];
const BASE_AMOUNTS = [1700, 400, 2400, 950, 3400, 600, 800];
const STATUS_CYCLE: TransactionStatus[] = ["paid", "paid", "pending", "paid", "paid", "refunded", "paid"];

export const MOCK_EVENT_TITLES = [
  "Neon Nights: Live Sessions",
  "Art After Dark",
  "Build & Ship Weekend",
  "Design Systems 101",
  "Northstar Acoustic Night",
  "Pulse Summit",
];

function buildDemoPayments(count: number): Payment[] {
  const DAY = 86_400_000;
  return Array.from({ length: count }, (_, i) => ({
    id: `pay-${70331 + i}`,
    paymentCode: `PAY-${70331 + i}`,
    userName: USERS[(i * 3 + 1) % USERS.length],
    methodLabel: METHODS[i % METHODS.length],
    amount: BASE_AMOUNTS[i % BASE_AMOUNTS.length] + Math.floor(i / 7) * 50,
    status: STATUS_CYCLE[i % STATUS_CYCLE.length],
    createdAt: new Date(Date.now() - i * 0.9 * DAY - (i % 11) * 3_600_000).toISOString(),
  }));
}

// Read-only data: payment state is changed from the Booking page.
export const mockPayments: Payment[] = DEMO.seedPayments ? buildDemoPayments(68) : [];
