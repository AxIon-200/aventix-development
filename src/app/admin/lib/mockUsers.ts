import { ManagedUser, UserStatus } from "@/app/admin/types/users";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCHES — only used while USE_MOCK is true in userService.ts
//   seedUsers:    false = empty table (the real starting state)
//                 true  = 47 sample users, so you can preview rows,
//                         pagination, filters, and the action flows
//   failRequests: true  = every request fails, so you can preview the
//                         error states
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  seedUsers: false,
  failRequests: false,
};

const FIRST = ["Noah", "Alyssa", "Ethan", "Sofia", "Daniel", "Nina", "Mia", "Lucas", "Isabel", "Gabriel", "Chloe", "Miguel"];
const LAST = ["Garcia", "Cruz", "Lim", "Reyes", "Tan", "Ramos", "Santos", "Bautista", "Mendoza", "Aquino", "Villanueva", "Castro"];
const STATUS_CYCLE: UserStatus[] = ["active", "active", "inactive", "active", "pending", "active", "active", "inactive"];

function buildDemoUsers(count: number): ManagedUser[] {
  const DAY = 24 * 60 * 60 * 1000;
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 5 + 3) % LAST.length];
    return {
      id: `usr-${1000 + i}`,
      userCode: `USR-${1000 + i}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@email.com`.toLowerCase(),
      status: STATUS_CYCLE[i % STATUS_CYCLE.length],
      joinedAt: new Date(Date.now() - i * 2.5 * DAY).toISOString(),
      avatarUrl: null,
    };
  });
}

// Mutable on purpose: the mock service edits it so Activate/Deactivate
// actually change what the table and stat cards show.
export const mockUsers: ManagedUser[] = DEMO.seedUsers ? buildDemoUsers(47) : [];
