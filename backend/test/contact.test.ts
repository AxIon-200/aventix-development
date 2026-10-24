import express from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { createAuth } from "../src/lib/auth.js";
import { contactRouter } from "../src/routes/contact.routes.js";
import { saveContactMessage, type SaveContactMessage } from "../src/lib/contact-message.js";
import { prisma } from "../src/lib/prisma.js";

const user = { id: "attendee-id", name: "Aventix Attendee", email: "attendee@example.com", role: "ATTENDEE" };
const message = { subject: "Ticket question", message: "Please help with my booking." };

const saved = { id: "f6696821-7aeb-4102-992f-e31480617e2e", createdAt: new Date("2026-10-24T08:00:00Z") };

function fixture(role = "ATTENDEE", status = 200, save: SaveContactMessage = vi.fn(async () => saved)) {
  const auth = { api: { readOwnProfile: async () => Response.json(
    status === 200 ? { data: { user: { ...user, role } } } : { error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in" } },
    { status },
  ) } } as unknown as ReturnType<typeof createAuth>;
  const app = express();
  app.use(express.json());
  app.use("/api/v1/contact", contactRouter(auth, save));
  return app;
}

describe("attendee contact submission", () => {
  it("saves the verified account identity instead of client supplied identity", async () => {
    const save = vi.fn(async () => saved);
    const response = await request(fixture("ATTENDEE", 200, save)).post("/api/v1/contact")
      .set("Origin", process.env.FRONTEND_URL!).send({ ...message, name: "Imposter", email: "wrong@example.com" });
    expect(response.status).toBe(400);
    expect(save).not.toHaveBeenCalled();

    const accepted = await request(fixture("ATTENDEE", 200, save)).post("/api/v1/contact")
      .set("Origin", process.env.FRONTEND_URL!).send(message);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data).toEqual({ id: saved.id, createdAt: saved.createdAt.toISOString() });
    expect(save).toHaveBeenCalledWith({ ...message, attendeeId: user.id, senderName: user.name, senderEmail: user.email });
  });

  it("requires an eligible attendee and valid same-origin input", async () => {
    expect((await request(fixture("ORGANIZER")).post("/api/v1/contact")
      .set("Origin", process.env.FRONTEND_URL!).send(message)).status).toBe(403);
    expect((await request(fixture("ATTENDEE", 401)).post("/api/v1/contact")
      .set("Origin", process.env.FRONTEND_URL!).send(message)).status).toBe(401);
    expect((await request(fixture()).post("/api/v1/contact")
      .set("Origin", "http://other.localhost:3000").send(message)).status).toBe(403);
    expect((await request(fixture()).post("/api/v1/contact")
      .set("Origin", process.env.FRONTEND_URL!).send({ subject: "x", message: "short" })).status).toBe(400);
  });

  it("does not claim submission when the database write fails", async () => {
    const response = await request(fixture("ATTENDEE", 200, async () => { throw new Error("database failed"); }))
      .post("/api/v1/contact").set("Origin", process.env.FRONTEND_URL!).send(message);
    expect(response.status).toBe(503);
    expect(response.body.data).toBeUndefined();
  });
});

it("persists an attendee message in the test database", async () => {
  const attendeeId = randomUUID();
  let messageId: string | undefined;
  try {
    await prisma.user.create({ data: {
      id: attendeeId,
      name: "Contact Fixture",
      firstName: "Contact",
      lastName: "Fixture",
      email: `contact-${attendeeId}@example.invalid`,
      role: "ATTENDEE",
    } });
    const saved = await saveContactMessage({
      attendeeId,
      senderName: "Contact Fixture",
      senderEmail: `contact-${attendeeId}@example.invalid`,
      ...message,
    });
    messageId = saved.id;
    const stored = await prisma.contactMessage.findUniqueOrThrow({ where: { id: saved.id } });
    expect(stored).toMatchObject({ attendeeId, senderName: "Contact Fixture", subject: message.subject, message: message.message });
    expect(saved.createdAt).toBeInstanceOf(Date);
  } finally {
    if (messageId) await prisma.contactMessage.delete({ where: { id: messageId } });
    await prisma.user.deleteMany({ where: { id: attendeeId } });
  }
});
