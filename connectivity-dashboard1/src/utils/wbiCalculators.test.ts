import { describe, expect, it } from "vitest";
import {
  buildCoverageIndex,
  computeCommunityWBI,
  createBushfireRiskMap,
  extractNTTowerSites,
  haversineKm,
  pointInRing,
} from "./wbiCalculators";
import type { CommunityFeature } from "../types";

const SQUARE_RING = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

function makeCommunity(
  overrides: Partial<CommunityFeature["properties"]> = {},
  coordinates: [number, number] = [0, 0]
): CommunityFeature {
  return {
    type: "Feature",
    properties: {
      objectid: 1,
      community_id: 1,
      bushtel_url: "",
      community_name: "TEST",
      community_aliases: "",
      community_type: "Family Outstation",
      main_language: "English",
      local_govt_council: "TEST",
      ward: "",
      land_council: "",
      electorate: "",
      ntg_region: "TOP END",
      population_source: "",
      population_count: 5,
      longitude: coordinates[0],
      latitude: coordinates[1],
      ...overrides,
    },
    geometry: { type: "Point", coordinates },
  };
}

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(-12.46, 130.84, -12.46, 130.84)).toBeCloseTo(0, 5);
  });

  it("measures Darwin to Alice Springs within a sensible range", () => {
    const km = haversineKm(-12.4634, 130.8456, -23.698, 133.8807);
    expect(km).toBeGreaterThan(1250);
    expect(km).toBeLessThan(1350);
  });
});

describe("pointInRing", () => {
  it("detects points inside and outside a ring", () => {
    expect(pointInRing(5, 5, SQUARE_RING)).toBe(true);
    expect(pointInRing(15, 5, SQUARE_RING)).toBe(false);
    expect(pointInRing(-1, 5, SQUARE_RING)).toBe(false);
  });
});

describe("buildCoverageIndex", () => {
  it("extracts a ring with a bounding box", () => {
    const rings = buildCoverageIndex({
      features: [{ geometry: { coordinates: [[SQUARE_RING]] } }],
    });
    expect(rings).toHaveLength(1);
    expect(rings[0]).toMatchObject({ minX: 0, maxX: 10, minY: 0, maxY: 10 });
  });

  it("tolerates missing or malformed input", () => {
    expect(buildCoverageIndex(null)).toEqual([]);
    expect(buildCoverageIndex({})).toEqual([]);
  });
});

describe("extractNTTowerSites", () => {
  const towers = {
    features: [
      {
        geometry: { coordinates: [130.84, -12.46] },
        properties: { carrier: "Telstra", has4G: true, has5G: true },
      },
      {
        // Same site, second carrier → should be merged.
        geometry: { coordinates: [130.84, -12.46] },
        properties: { carrier: "Optus", has4G: true, has5G: false },
      },
      {
        // Outside the NT bbox → excluded.
        geometry: { coordinates: [144.9, -37.8] },
        properties: { carrier: "Telstra", has4G: true, has5G: false },
      },
    ],
  };

  it("keeps NT sites and merges carriers at the same location", () => {
    const sites = extractNTTowerSites(towers);
    expect(sites).toHaveLength(1);
    expect([...sites[0].carriers].sort()).toEqual(["Optus", "Telstra"]);
    expect(sites[0].has4G).toBe(true);
    expect(sites[0].has5G).toBe(true);
  });

  it("handles the legacy raw property names", () => {
    const legacy = {
      features: [
        {
          geometry: { coordinates: [130.84, -12.46] },
          properties: { "MNO/Optus-TPG MOCN": "TPG", "4G": "Y", "5G": "N" },
        },
      ],
    };
    const sites = extractNTTowerSites(legacy);
    expect([...sites[0].carriers]).toEqual(["TPG"]);
    expect(sites[0].has5G).toBe(false);
  });
});

describe("createBushfireRiskMap", () => {
  it("lower-cases and trims community keys", () => {
    const map = createBushfireRiskMap([
      { COMMUNITY: " 10 Mile ", RATING: "Low" },
      { COMMUNITY: "Adelaide River", RATING: "High" },
    ]);
    expect(map.get("10 mile")).toBe("Low");
    expect(map.get("adelaide river")).toBe("High");
  });
});

describe("computeCommunityWBI", () => {
  it("scores an uncovered, remote, non-English outstation as Critical", () => {
    const props = computeCommunityWBI(
      makeCommunity({ main_language: "Kriol", population_count: 5 }),
      [],
      []
    );
    // connectivity 100, hazard 50 (default), proximity 100, exclusion 95+5
    expect(props.connectivity_gap_score).toBe(100);
    expect(props.proximity_score).toBe(100);
    expect(props.digital_exclusion_score).toBe(100);
    expect(props.has_coverage).toBe(false);
    expect(props.wbi_score).toBe(88);
    expect(props.wbi_tier).toBe("Critical");
  });

  it("reduces the connectivity gap when covered with multiple carriers", () => {
    const ring = {
      minX: -1,
      maxX: 1,
      minY: -1,
      maxY: 1,
      ring: [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ],
    };
    const sites = [
      { lat: 0.1, lon: 0.1, carriers: new Set(["Telstra"]), has4G: true, has5G: false },
      { lat: 0.2, lon: 0.2, carriers: new Set(["Optus"]), has4G: true, has5G: false },
    ];
    const props = computeCommunityWBI(makeCommunity(), sites, [ring]);
    expect(props.has_coverage).toBe(true);
    expect(props.coverage_status).toBe("Covered");
    expect(props.connectivity_gap_score).toBe(10);
    expect(props.nearby_carriers).toBe(2);
    expect(props.nearest_tower_km).toBeGreaterThan(0);
  });

  it("uses the CSV risk lookup when properties have no rating", () => {
    const riskMap = createBushfireRiskMap([{ COMMUNITY: "TEST", RATING: "High" }]);
    const props = computeCommunityWBI(makeCommunity(), [], [], riskMap);
    expect(props.hazard_score).toBe(90);
    expect(props.hazard_risk).toBe("Extreme");
  });
});
