import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./load-typescript.mjs";

const { createSimulationSession, completeSimulation } = load("src/lib/paymongo-simulation.ts");

test("all simulated payment methods preserve centavos and issue unique demo references", () => {
  const references = new Set();
  for (const method of ["GCash", "Maya", "Card"]) {
    const session = createSimulationSession(method, 123.45);
    assert.equal(session.amountCentavos, 12345);
    assert.equal(session.status, "pending");
    const result = completeSimulation(session, "paid");
    assert.equal(result.method, method);
    assert.match(result.id, /^cs_demo_/);
    assert.match(result.paymentReference, /^pay_demo_/);
    assert.equal(completeSimulation(result, "paid"), result);
    assert.equal(completeSimulation(result, "failed"), result);
    references.add(result.paymentReference);
  }
  assert.equal(references.size, 3);
});

test("failed and cancelled payments cannot issue payment proof; retry uses a fresh session", () => {
  for (const outcome of ["failed", "cancelled"]) {
    const original = createSimulationSession("GCash", 100);
    const result = completeSimulation(original, outcome);
    assert.equal(result.status, outcome);
    assert.equal(result.paymentReference, undefined);
    assert.equal(completeSimulation(result, "paid"), result);
    assert.notEqual(createSimulationSession("Maya", 100).id, original.id);
  }
});

test("invalid amounts and methods cannot start a checkout", () => {
  for (const amount of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => createSimulationSession("Card", amount));
  }
  assert.throws(() => createSimulationSession("unknown", 100));
});
