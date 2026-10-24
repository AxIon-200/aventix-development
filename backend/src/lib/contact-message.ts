import { prisma } from "./prisma.js";

export interface ContactSubmission {
  attendeeId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

export type SaveContactMessage = (submission: ContactSubmission) => Promise<{ id: string; createdAt: Date }>;

export const saveContactMessage: SaveContactMessage = (submission) =>
  prisma.contactMessage.create({ data: submission, select: { id: true, createdAt: true } });
