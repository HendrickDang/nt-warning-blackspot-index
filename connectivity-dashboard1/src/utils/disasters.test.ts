import { describe, expect, it } from "vitest";
import type { CommunityFeature } from "../types";
import {
  DISASTER_BUFFER_KM,
  distanceToFootprintKm,
  extractFootprints,
  groupExposures,
  isNtRelevant,
  matchCommunitiesToEvents,
  parseEventList,
  pointInPolygon,
} from "./disasters";
import type { DisasterEvent, FootprintPolygon } from "./disasters";

// A 1° square over the top end of the NT. Positions are [lng, lat].
const SQUARE: FootprintPolygon = [
  [
    [130, -20],
    [131, -20],
    [131, -21],
    [130, -21],
    [130, -20],
  ],
];

const IN_HOLE: FootprintPolygon = [
  [
    [130, -20],
    [132, -20],
    [132, -22],
    [130, -22],
    [130, -20],
  ],
  [
    [130.5, -20.5],
    [131.5, -20.5],
    [131.5, -21.5],
    [130.5, -21.5],
    [130.5, -20.5],
  ],
];

function makeCommunity(
  id: number,
  coordinates: [number, number],
  overrides: Partial<CommunityFeature["properties"]> = {}
): CommunityFeature {
  return {
    type: "Feature",
    properties: {
      objectid: id,
      community_id: id,
      bushtel_url: "",
      community_name: `COMM ${id}`,
      community_aliases: "",
      community_type: "Family Outstation",
      main_language: "English",
      local_govt_council: "",
      ward: "",
      land_council: "",
      electorate: "",
      ntg_region: "TOP END",
      population_source: "",
      population_count: 10,
      longitude: coordinates[0],
      latitude: coordinates[1],
      ...overrides,
    },
    geometry: { type: "Point", coordinates },
  };
}

function makeEvent(overrides: Partial<DisasterEvent> = {}): DisasterEvent {
  return {
    kind: "TC",
    eventId: 1,
    episodeId: 1,
    name: "TC TEST",
    country: "Australia",
    iso3: "AUS",
    affectedCountries: ["AUS"],
    alertLevel: "Orange",
    alertScore: 2,
    severityText: "",
    fromDate: "2026-01-01T00:00:00",
    toDate: "2026-01-03T00:00:00",
    source: "TEST",
    reportUrl: "",
    footprintUrl: "",
    centre: { lat: -20, lng: 130 },
    footprints: [SQUARE],
    ...overrides,
  };
}

describe("parseEventList", () => {
  const fixture = {
    type: "FeatureCollection",
    features: [
      {
        geometry: { type: "Point", coordinates: [130.5, -20.5] },
        properties: {
          eventtype: "TC",
          eventid: 1001,
          episodeid: 3,
          name: "Tropical Cyclone TEST-26",
          country: "Australia",
          iso3: "AUS",
          alertlevel: "Red",
          alertscore: 3,
          fromdate: "2026-01-01T00:00:00",
          todate: "2026-01-04T00:00:00",
          source: "BoM",
          url: { geometry: "https://example.test/geom", report: "https://example.test/report" },
          affectedcountries: [{ iso3: "AUS" }],
          severitydata: { severitytext: "maximum wind speed of 120 km/h" },
        },
      },
      {
        geometry: { type: "Point", coordinates: [10, 10] },
        properties: { eventtype: "FL", eventid: 2, episodeid: 1, name: "Flood in Nowhere", alertlevel: "Green" },
      },
      { geometry: { type: "Point", coordinates: [0, 0] }, properties: { eventtype: "EQ", eventid: 3 } },
      { geometry: null, properties: { eventtype: "TC", eventid: 4 } },
      { geometry: { type: "Point", coordinates: [1, 1] } },
    ],
  };

  it("keeps only supported hazard types with a usable centroid", () => {
    const events = parseEventList(fixture);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.eventId)).toEqual([1001, 2]);
  });

  it("maps GDACS fields onto the domain shape", () => {
    const [tc] = parseEventList(fixture);
    expect(tc.kind).toBe("TC");
    expect(tc.name).toBe("Tropical Cyclone TEST-26");
    expect(tc.iso3).toBe("AUS");
    expect(tc.affectedCountries).toEqual(["AUS"]);
    expect(tc.alertLevel).toBe("Red");
    expect(tc.alertScore).toBe(3);
    expect(tc.severityText).toBe("maximum wind speed of 120 km/h");
    expect(tc.footprintUrl).toBe("https://example.test/geom");
    expect(tc.reportUrl).toBe("https://example.test/report");
    expect(tc.centre).toEqual({ lat: -20.5, lng: 130.5 });
    expect(tc.footprints).toEqual([]);
  });

  it("defaults missing alert levels to Green", () => {
    const [, flood] = parseEventList(fixture);
    expect(flood.alertLevel).toBe("Green");
    expect(flood.iso3).toBe("");
  });

  it("returns an empty list for malformed input", () => {
    expect(parseEventList(null)).toEqual([]);
    expect(parseEventList({})).toEqual([]);
  });
});

describe("isNtRelevant", () => {
  it("accepts events tagged to Australia anywhere", () => {
    expect(isNtRelevant(makeEvent({ iso3: "AUS", centre: { lat: 29, lng: -109 } }))).toBe(true);
  });

  it("accepts events whose affected countries include Australia", () => {
    expect(
      isNtRelevant(makeEvent({ iso3: "IDN", affectedCountries: ["IDN", "AUS"], centre: { lat: 5, lng: 120 } }))
    ).toBe(true);
  });

  it("accepts events whose centroid is near the NT", () => {
    expect(isNtRelevant(makeEvent({ iso3: "IDN", affectedCountries: [], centre: { lat: -12.46, lng: 130.84 } }))).toBe(true);
  });

  it("rejects distant overseas events", () => {
    expect(isNtRelevant(makeEvent({ iso3: "MEX", affectedCountries: [], centre: { lat: 29, lng: -109.7 } }))).toBe(false);
  });
});

describe("extractFootprints", () => {
  it("ignores centroid points and flattens polygons", () => {
    const json = {
      features: [
        { geometry: { type: "Point", coordinates: [130, -20] } },
        { geometry: { type: "Polygon", coordinates: SQUARE } },
        { geometry: { type: "MultiPolygon", coordinates: [SQUARE, SQUARE] } },
      ],
    };
    expect(extractFootprints(json)).toHaveLength(3);
  });

  it("returns an empty list for malformed input", () => {
    expect(extractFootprints(null)).toEqual([]);
  });
});

describe("pointInPolygon", () => {
  it("detects points inside and outside", () => {
    expect(pointInPolygon(130.5, -20.5, SQUARE)).toBe(true);
    expect(pointInPolygon(135, -20.5, SQUARE)).toBe(false);
  });

  it("treats holes as outside", () => {
    expect(pointInPolygon(131, -21, IN_HOLE)).toBe(false);
    expect(pointInPolygon(130.2, -20.2, IN_HOLE)).toBe(true);
  });
});

describe("distanceToFootprintKm", () => {
  it("is zero inside the footprint", () => {
    expect(distanceToFootprintKm(-20.5, 130.5, [SQUARE])).toBe(0);
  });

  it("measures roughly the correct distance outside", () => {
    // 0.2° of latitude south of the footprint edge (~22 km).
    const distance = distanceToFootprintKm(-21.2, 130.5, [SQUARE]);
    expect(distance).toBeGreaterThan(20);
    expect(distance).toBeLessThan(24);
  });

  it("returns Infinity when there are no footprints", () => {
    expect(distanceToFootprintKm(-20.5, 130.5, [])).toBe(Infinity);
  });
});

describe("matchCommunitiesToEvents", () => {
  const inside = makeCommunity(1, [130.5, -20.5]);
  const near = makeCommunity(2, [130.5, -21.2]);
  const far = makeCommunity(3, [130.5, -30]);

  it("classifies inside as affected and near as at-risk", () => {
    const exposures = matchCommunitiesToEvents([makeEvent()], [inside, near, far]);
    expect(exposures).toHaveLength(2);
    expect(exposures.find((e) => e.community.properties.community_id === 1)?.status).toBe("affected");
    const nearExposure = exposures.find((e) => e.community.properties.community_id === 2);
    expect(nearExposure?.status).toBe("at-risk");
    expect(nearExposure!.distanceKm).toBeLessThanOrEqual(DISASTER_BUFFER_KM);
  });

  it("ignores events without footprints", () => {
    expect(matchCommunitiesToEvents([makeEvent({ footprints: [] })], [inside])).toEqual([]);
  });

  it("skips communities with invalid coordinates", () => {
    const broken = makeCommunity(4, [NaN, NaN]);
    expect(matchCommunitiesToEvents([makeEvent()], [broken])).toEqual([]);
  });
});

describe("groupExposures", () => {
  const community = makeCommunity(1, [130.5, -20.5], { wbi_score: 55, wbi_tier: "High" });
  const cyclone = makeEvent({ kind: "TC", eventId: 10, alertLevel: "Red" });
  const flood = makeEvent({ kind: "FL", eventId: 20, alertLevel: "Orange" });

  it("collapses multiple hazards into one row and keeps the worst status", () => {
    const groups = groupExposures(
      matchCommunitiesToEvents([cyclone, flood], [community])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].hazards).toHaveLength(2);
    expect(groups[0].status).toBe("affected");
    expect(groups[0].peakAlert).toBe("Red");
  });

  it("sorts affected rows ahead of at-risk rows", () => {
    const affected = makeCommunity(1, [130.5, -20.5], { wbi_score: 10 });
    const atRisk = makeCommunity(2, [130.5, -21.2], { wbi_score: 99 });
    const groups = groupExposures(matchCommunitiesToEvents([makeEvent()], [affected, atRisk]));
    expect(groups.map((g) => g.community.properties.community_id)).toEqual([1, 2]);
  });
});
