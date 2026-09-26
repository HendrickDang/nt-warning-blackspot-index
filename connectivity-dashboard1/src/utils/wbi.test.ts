import { describe, expect, it } from "vitest";
import { getWbiTierStyle, wbiTierFromScore } from "./wbi";

describe("wbiTierFromScore", () => {
  it("maps scores to tiers at the documented boundaries", () => {
    expect(wbiTierFromScore(100)).toBe("Critical");
    expect(wbiTierFromScore(75)).toBe("Critical");
    expect(wbiTierFromScore(74)).toBe("High");
    expect(wbiTierFromScore(60)).toBe("High");
    expect(wbiTierFromScore(59)).toBe("Moderate");
    expect(wbiTierFromScore(40)).toBe("Moderate");
    expect(wbiTierFromScore(39)).toBe("Low");
    expect(wbiTierFromScore(0)).toBe("Low");
  });
});

describe("getWbiTierStyle", () => {
  it("returns the tier style for known tiers", () => {
    expect(getWbiTierStyle("Critical").fill).toBe("#dc2626");
    expect(getWbiTierStyle("Low").badge).toContain("emerald");
  });

  it("falls back for unknown or missing tiers", () => {
    expect(getWbiTierStyle(undefined).tier).toBe("Low");
    expect(getWbiTierStyle("nonsense").badge).toContain("slate");
  });
});
