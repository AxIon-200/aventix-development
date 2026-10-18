/**
 * Shared formatting utilities across all user roles
 */

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString()}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
