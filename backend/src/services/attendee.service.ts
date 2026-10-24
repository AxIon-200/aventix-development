import { prisma } from "../lib/prisma.js";

export class AttendeeService {
  static async getDashboard(attendeeId: string) {
    const bookings = await prisma.booking.findMany({
      where: { userId: attendeeId },
      orderBy: { createdAt: "desc" },
      include: {
        event: { include: { venue: true } },
        payments: { select: { status: true, amount: true } },
        items: { include: {
          ticketCategory: { select: { name: true } },
          tickets: { select: { id: true, ticketCode: true, status: true } },
        } },
      },
    });
    return {
      userId: attendeeId,
      bookings: bookings.map(booking => ({
        id: booking.id,
        reference: booking.bookingReference,
        eventId: booking.eventId,
        eventTitle: booking.event.name,
        startsAt: (booking.event.startTime ?? booking.event.eventDate)?.toISOString() ?? null,
        eventStatus: booking.event.status,
        venue: booking.event.venue?.name ?? "Venue to be announced",
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
        // Failed, pending and refunded attempts never count as spending.
        paidCentavos: booking.payments.filter(payment => payment.status === "PAID")
          .reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0),
        totalCentavos: Math.round(Number(booking.totalAmount) * 100),
        quantity: booking.items.reduce((sum, item) => sum + item.quantity, 0),
        tickets: booking.items.flatMap(item => item.tickets.map(ticket => ({
          id: ticket.id, code: ticket.ticketCode, status: ticket.status, tier: item.ticketCategory.name,
        }))),
      })),
    };
  }
}
