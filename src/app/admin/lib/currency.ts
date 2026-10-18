export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}
