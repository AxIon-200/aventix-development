/** Local demo only. These records are never proof of a provider payment. */
export type SimulationMethod = "GCash" | "Maya" | "Card";
export type SimulationOutcome = "paid" | "failed" | "cancelled";
export interface SimulationSession {
  id: string;
  method: SimulationMethod;
  amountCentavos: number;
  status: "pending" | SimulationOutcome;
  paymentReference?: string;
}

export function createSimulationSession(method: SimulationMethod, amount: number): SimulationSession {
  const amountCentavos = Math.round(amount * 100);
  if (!["GCash", "Maya", "Card"].includes(method) || !Number.isSafeInteger(amountCentavos) || amountCentavos < 0) {
    throw new Error("Invalid simulation payment details.");
  }
  return { id: `cs_demo_${crypto.randomUUID()}`, method, amountCentavos, status: "pending" };
}

export function completeSimulation(session: SimulationSession, outcome: SimulationOutcome): SimulationSession {
  // A checkout attempt can only settle once, including repeated clicks.
  if (session.status !== "pending") return session;
  if (!["paid", "failed", "cancelled"].includes(outcome)) throw new Error("Invalid simulation outcome.");
  return {
    ...session,
    status: outcome,
    ...(outcome === "paid" ? { paymentReference: `pay_demo_${crypto.randomUUID()}` } : {}),
  };
}
