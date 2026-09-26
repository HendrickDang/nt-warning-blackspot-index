/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CommunityFeature } from "../types";
import { parseCsv } from "./csv";
import {
  buildCoverageIndex,
  computeCommunityWBI,
  createBushfireRiskMap,
  extractNTTowerSites,
} from "./wbiCalculators";

// End-to-end check of the WBI pipeline against the real bundled datasets. This
// is the closest thing to a runtime smoke test without a browser: it verifies
// the tower schema mapping, coverage index and scoring all agree on the
// shipped data.
const readJson = (relative: string): unknown =>
  JSON.parse(readFileSync(new URL(relative, import.meta.url), "utf8"));
const readText = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

describe("WBI pipeline over bundled data", () => {
  it("scores every community with a valid tier", () => {
    const communities = (
      readJson("../../public/data/communities.geojson") as {
        features: CommunityFeature[];
      }
    ).features;
    const towers = readJson("../../public/data/towers.geojson");
    const coverage = readJson("../../public/data/coverage.geojson");
    const riskMap = createBushfireRiskMap(
      parseCsv(readText("../../public/data/Community_Bushfire_Risk.csv"))
    );

    const rings = buildCoverageIndex(coverage);
    const sites = extractNTTowerSites(towers);

    expect(communities.length).toBe(792);
    expect(rings.length).toBeGreaterThan(0);
    expect(sites.length).toBeGreaterThan(0);

    const enriched = communities.map((community) =>
      computeCommunityWBI(community, sites, rings, riskMap)
    );

    for (const props of enriched) {
      expect(props.wbi_score).toBeGreaterThanOrEqual(0);
      expect(props.wbi_score).toBeLessThanOrEqual(100);
      expect(["Critical", "High", "Moderate", "Low"]).toContain(props.wbi_tier);
      expect(typeof props.has_coverage).toBe("boolean");
      expect(Number.isFinite(props.nearest_tower_km)).toBe(true);
    }

    const tierTotal = (["Critical", "High", "Moderate", "Low"] as const).reduce(
      (sum, tier) => sum + enriched.filter((p) => p.wbi_tier === tier).length,
      0
    );
    expect(tierTotal).toBe(792);

    // A warning-blackspot index for remote NT should surface some critical sites.
    expect(enriched.filter((p) => p.wbi_tier === "Critical").length).toBeGreaterThan(0);
  });
});
