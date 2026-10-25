import { createCipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

export class OrganizerError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export const categoryMap = { Concert: "CONCERT", Gig: "GIG", Festival: "MUSIC_FESTIVAL",
  Conference: "CONFERENCE", Sports: "SPORTS", Theater: "THEATER" } as const;
export const categoryLabel = (value: string | null) => Object.entries(categoryMap).find(([, code]) => code === value)?.[0] ?? "Not set";
const fields = {
  title: z.string().trim().min(1).max(200),
  category: z.enum(["Concert", "Gig", "Festival", "Conference", "Sports", "Theater"]).nullable(),
  startsAt: z.iso.datetime({ offset: true }).nullable(),
  venueText: z.string().trim().max(300), description: z.string().trim().max(10000),
};
export const eventCreate = z.object({ title: fields.title, category: fields.category.optional(),
  startsAt: fields.startsAt.optional(), venueText: fields.venueText.optional(), description: fields.description.optional() }).strict();
export const eventUpdate = eventCreate.partial().extend({ expectedUpdatedAt: z.iso.datetime() }).strict()
  .refine(value => Object.keys(value).length > 1);
export const eventFilters = z.object({ search: z.string().trim().max(200).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SOLD_OUT", "COMPLETED", "CANCELLED"]).optional() }).strict();
export const profileUpdate = z.object({ organizationName: z.string().trim().min(2).max(150).optional(),
  contactEmail: z.string().trim().toLowerCase().pipe(z.email().max(254)).optional(), bio: z.string().trim().max(2000).optional(),
  bankName: z.string().trim().min(1).max(150).optional(), accountNumber: z.string().regex(/^\d{4,34}$/).optional(),
}).strict().refine(value => Object.keys(value).length > 0)
  .refine(value => (value.bankName === undefined) === (value.accountNumber === undefined), { message: "Provide both bank fields" });
export const scanInput = z.object({ ticketCode: z.string().trim().min(1).max(200) }).strict();
export const reportInput = z.object({ from: z.iso.date(), to: z.iso.date() }).strict().refine(value => value.from <= value.to);
export function reportDates(from: string, to: string) {
  const start = new Date(`${from}T00:00:00+08:00`);
  const end = new Date(new Date(`${to}T00:00:00+08:00`).getTime() + 86400000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) throw new OrganizerError("VALIDATION_ERROR");
  return { start, end, previousStart: new Date(start.getTime() - (end.getTime() - start.getTime())) };
}
export function encryptAccount(value: string) {
  const configured = process.env.ORGANIZER_PAYOUT_KEY;
  if (!configured || !/^[a-fA-F0-9]{64}$/.test(configured)) throw new OrganizerError("PAYOUT_STORAGE_UNAVAILABLE", 503);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(configured, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}
export const csvCell = (value: unknown) => {
  const raw = String(value ?? "");
  return `"${(/^\s*[=+\-@]/u.test(raw) ? `'${raw}` : raw).replaceAll('"', '""')}"`;
};
