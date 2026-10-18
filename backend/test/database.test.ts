import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";

describe("Test Database Connection", () => {
  it("connects to the isolated Aventix test database", async () => {
    const result = await prisma.$queryRaw<
      Array<{
        environment: string;
      }>
    >`
      SELECT environment
      FROM public.test_environment_marker
      WHERE id = 1
    `;

    expect(result).toHaveLength(1);
    expect(result[0]?.environment).toBe("aventix-test");
  });
});