export class AdminService {
  static async getOverview() {
    return {
      totalUsers: 1420,
      totalOrganizers: 38,
      totalEvents: 64,
      ticketsSold: 9450,
      grossRevenue: 2845000,
    };
  }

  static async getUsers() {
    return [];
  }

  static async getOrganizers() {
    return [];
  }

  static async getBookings() {
    return [];
  }
}
