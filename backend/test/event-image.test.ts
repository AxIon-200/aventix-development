import { describe, expect, it } from "vitest";
import { validateEventImage } from "../src/lib/event-image.js";

describe("event image uploads", () => {
  it("accepts matching image signatures and rejects mismatched or oversized files", () => {
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]), Buffer.from("IHDR"), Buffer.alloc(8)]);
    expect(() => validateEventImage(png, "image/png")).not.toThrow();
    expect(() => validateEventImage(png, "image/jpeg")).toThrow();
    expect(() => validateEventImage(Buffer.alloc(3 * 1024 * 1024 + 1), "image/png")).toThrow();
    expect(() => validateEventImage(Buffer.alloc(0), "image/png")).toThrow();
  });
});
