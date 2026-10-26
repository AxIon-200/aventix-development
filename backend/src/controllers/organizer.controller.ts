import type { RequestHandler } from "express";
import { z } from "zod";
import { OrganizerService } from "../services/organizer.service.js";
import { csvCell, eventCreate, eventFilters, eventUpdate, OrganizerError, profileUpdate, publishEventInput, reportInput, scanInput, ticketTierInput } from "../lib/organizer-input.js";
import { validateEventImage } from "../lib/event-image.js";

export const getOrganizerDashboard: RequestHandler = async (_req, res) => {
  res.json({ data: await OrganizerService.getDashboard(res.locals.organization.id, res.locals.organization.organizationName) });
};
export const getOrganizerEvents: RequestHandler = async (req, res) => {
  res.json({ data: await OrganizerService.getEvents(res.locals.organization.id, eventFilters.parse(req.query)) });
};
export const getOrganizerEvent: RequestHandler = async (req, res) => {
  res.json({ data: await OrganizerService.event(res.locals.organization.id, z.uuid().parse(req.params.id)) });
};
export const saveOrganizerEvent: RequestHandler = async (req, res) => {
  const id = req.method === "PATCH" ? z.uuid().parse(req.params.id) : undefined;
  const input = id ? eventUpdate.parse(req.body) : eventCreate.parse(req.body);
  const expected = "expectedUpdatedAt" in input ? input.expectedUpdatedAt as string : undefined;
  res.status(id ? 200 : 201).json({ data: await OrganizerService.saveEvent(res.locals.organization.id, input, id, expected) });
};
export const saveOrganizerPoster: RequestHandler = async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const expected = z.iso.datetime().parse(req.get("X-Event-Updated-At"));
  const data = req.body as Buffer;
  validateEventImage(data, req.get("Content-Type") ?? "");
  res.json({ data: await OrganizerService.savePoster(res.locals.organization.id, id,
    req.get("Content-Type")!, data, expected) });
};
export const saveOrganizerTier: RequestHandler = async (req, res) => {
  const eventId = z.uuid().parse(req.params.id);
  const tierId = req.params.tierId ? z.uuid().parse(req.params.tierId) : undefined;
  res.status(tierId ? 200 : 201).json({ data: await OrganizerService.saveTier(res.locals.organization.id, eventId,
    ticketTierInput.parse(req.body), tierId) });
};
export const publishOrganizerEvent: RequestHandler = async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const input = publishEventInput.parse(req.body);
  res.json({ data: await OrganizerService.publishEvent(res.locals.organization.id, res.locals.user.id, id, input.expectedUpdatedAt) });
};
export const getOrganizerProfile: RequestHandler = async (_req, res) => { res.json({ data: await OrganizerService.profile(res.locals.user.id) }); };
export const saveOrganizerProfile: RequestHandler = async (req, res) => { res.json({ data: await OrganizerService.saveProfile(res.locals.user.id, profileUpdate.parse(req.body)) }); };
export const scanTicketQRCode: RequestHandler = async (req, res) => {
  res.json({ data: await OrganizerService.validateGateCheckIn(res.locals.organization.id, res.locals.user.id, scanInput.parse(req.body).ticketCode) });
};
export const getOrganizerCheckIns: RequestHandler = async (_req, res) => { res.json({ data: await OrganizerService.checkIns(res.locals.user.id, res.locals.organization.id) }); };
export const getOrganizerAnalytics: RequestHandler = async (req, res) => {
  const { from, to } = reportInput.parse(req.query);
  const { rows, ...report } = await OrganizerService.analytics(res.locals.organization.id, from, to);
  if (req.path !== "/analytics/export") { res.json({ data: report }); return; }
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="organizer-sales-${from}-${to}.csv"` });
  res.send([["Payment date", "Booking reference", "Event", "Ticket tier", "Quantity", "Unit price PHP", "Subtotal PHP", "Test payment"],
    ...rows.map(row => [row.paidAt, row.reference, row.eventTitle, row.tier, row.quantity, row.unitPrice.toFixed(2), row.subtotal.toFixed(2), row.testMode ? "Yes" : "No"])]
    .map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n");
};
export const organizerError: import("express").ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error instanceof OrganizerError ? error.status : error instanceof z.ZodError ? 400 : 500;
  const code = error instanceof OrganizerError ? error.code : status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR";
  res.status(status).json({ error: { code, message: status === 500 ? "Organizer request could not be completed" : code } });
};
