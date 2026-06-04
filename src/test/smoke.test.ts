import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("environment is wired up", () => {
    expect(true).toBe(true);
    expect(typeof window).toBe("object");
  });
});
