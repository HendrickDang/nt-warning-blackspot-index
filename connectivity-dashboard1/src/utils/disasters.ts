// Live natural-disaster exposure from GDACS.
//
// GDACS (Global Disaster Alert and Coordination System, run by the European
// Commission JRC with UN OCHA) publishes key-free, CORS-enabled GeoJSON for
// active disasters. The dashboard surfaces tropical cyclones (TC) and floods
// (FL): for any event that could reach the Northern Territory we pull the
// affected-area footprint — current plus forecast — and classify each
// community as "affected" (point inside a footprint) or "at risk" (within a
// small buffer of one).
//
// API reference: https://www.gdacs.org/gdacsapi/swagger/index.html

import type { CommunityFeature } from "../types";
import { fetchJson } from "./dataLoader";
import { pointInRing } from "./wbiCalculators";

export const GDACS_BASE = "https://www.gdacs.org/gdacsapi/api";

/** Hazard types surfaced in the UI. */
export type DisasterKind = "TC" | "FL";
export type AlertLevel = "Green" | "Orange" | "Red";
export type ExposureStatus = "affected" | "at-risk";

/** Events within this many km of a footprint still count as "at risk". */
export const DISASTER_BUFFER_KM = 25;

/** How far either side of today to query. Forecast events extend into the future. */
export const DISASTER_WINDOW_DAYS = 7;

/** GeoJSON positions/rings. Positions are [lng, lat] pairs. */
export type Ring = number[][];
/** A polygon: outer ring first, followed by any holes. */
export type FootprintPolygon = Ring[];

export interface DisasterEvent {
  kind: DisasterKind;
  eventId: number;
  episodeId: number;
  name: string;
  country: string;
  iso3: string;
  /** ISO3 codes of every country the event touches. */
  affectedCountries: string[];
  alertLevel: AlertLevel;
  alertScore: number;
  /** Human-readable severity, e.g. "Tropical Storm (maximum wind speed of 287 km/h)". */
  severityText: string;
  fromDate: string;
  toDate: string;
  source: string;
  /** GDACS report page (safe to show as a link). */
  reportUrl: string;
  /** Endpoint returning this event's footprint geometry (internal). */
  footprintUrl: string;
  /** Centroid used for the NT relevance filter. */
  centre: { lat: number; lng: number };
  /** Current + forecast affected-area polygons in [lng, lat]; empty if unavailable. */
  footprints: FootprintPolygon[];
}

export interface CommunityExposure {
  community: CommunityFeature;
  event: DisasterEvent;
  status: ExposureStatus;
  distanceKm: number;
}

/** All hazards affecting one community, collapsed into a single row. */
export interface CommunityExposureGroup {
  community: CommunityFeature;
  hazards: CommunityExposure[];
  status: ExposureStatus;
  distanceKm: number;
  peakAlert: AlertLevel;
}

export const DISASTER_KIND_LABELS: Record<DisasterKind, string> = {
  TC: "Cyclone",
  FL: "Flood",
};

export const ALERT_BADGE_CLASS: Record<AlertLevel, string> = {
  Red: "bg-red-100 text-red-800 border-red-300",
  Orange: "bg-orange-100 text-orange-800 border-orange-300",
  Green: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const ALERT_RANK: Record<AlertLevel, number> = { Green: 0, Orange: 1, Red: 2 };

/** Northern Territory bounding box, matching `extractNTTowerSites()`. */
export const NT_BBOX = { minLon: 129, maxLon: 138, minLat: -26, maxLat: -11 };

// Cyclones sit offshore before landfall, so accept events a few degrees out.
const NT_MARGIN_DEG = 5;

const SUPPORTED_KINDS: DisasterKind[] = ["TC", "FL"];

// ---------------------------------------------------------------------------
// Minimal GDACS response shapes
// ---------------------------------------------------------------------------

interface GdacsProperties {
  eventtype?: string;
  eventid?: number;
  episodeid?: number;
  name?: string;
  country?: string;
  iso3?: string;
  alertlevel?: string;
  alertscore?: number;
  fromdate?: string;
  todate?: string;
  source?: string;
  url?: { geometry?: string; report?: string };
  affectedcountries?: Array<{ iso3?: string }>;
  severitydata?: { severitytext?: string };
}

interface GdacsFeature {
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: GdacsProperties;
}

interface GdacsFeatureCollection {
  features?: GdacsFeature[];
}

// ---------------------------------------------------------------------------
// Parsing (pure — unit tested)
// ---------------------------------------------------------------------------

function toAlertLevel(value: string | undefined): AlertLevel {
  return value === "Red" || value === "Orange" ? value : "Green";
}

function pointCoordinates(feature: GdacsFeature): [number, number] | null {
  const geometry = feature.geometry;
  if (!geometry || geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) {
    return null;
  }
  const [lng, lat] = geometry.coordinates as number[];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

/** Parse the GDACS event list, keeping only the hazard types we surface. */
export function parseEventList(json: unknown): DisasterEvent[] {
  const features = (json as GdacsFeatureCollection | null)?.features ?? [];
  const events: DisasterEvent[] = [];

  for (const feature of features) {
    const p = feature.properties;
    if (!p) continue;

    const kind = p.eventtype as DisasterKind | undefined;
    if (!kind || !SUPPORTED_KINDS.includes(kind)) continue;

    const coordinates = pointCoordinates(feature);
    if (!coordinates) continue;
    const [lng, lat] = coordinates;

    events.push({
      kind,
      eventId: p.eventid ?? 0,
      episodeId: p.episodeid ?? 0,
      name: p.name?.trim() || DISASTER_KIND_LABELS[kind],
      country: p.country?.trim() ?? "",
      iso3: p.iso3?.trim() ?? "",
      affectedCountries: (p.affectedcountries ?? [])
        .map((c) => c.iso3?.trim() ?? "")
        .filter(Boolean),
      alertLevel: toAlertLevel(p.alertlevel),
      alertScore: typeof p.alertscore === "number" ? p.alertscore : 0,
      severityText: p.severitydata?.severitytext?.trim() ?? "",
      fromDate: p.fromdate ?? "",
      toDate: p.todate ?? "",
      source: p.source?.trim() ?? "",
      reportUrl: p.url?.report ?? "",
      footprintUrl: p.url?.geometry ?? "",
      centre: { lat, lng },
      footprints: [],
    });
  }

  return events;
}

/** Does this event plausibly touch the Northern Territory? */
export function isNtRelevant(event: Pick<DisasterEvent, "iso3" | "affectedCountries" | "centre">): boolean {
  if (event.iso3 === "AUS" || event.affectedCountries.includes("AUS")) return true;

  const { lat, lng } = event.centre;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  return (
    lng >= NT_BBOX.minLon - NT_MARGIN_DEG &&
    lng <= NT_BBOX.maxLon + NT_MARGIN_DEG &&
    lat >= NT_BBOX.minLat - NT_MARGIN_DEG &&
    lat <= NT_BBOX.maxLat + NT_MARGIN_DEG
  );
}

/** Flatten a GDACS geometry payload into a list of polygons (points are ignored). */
export function extractFootprints(json: unknown): FootprintPolygon[] {
  const features = (json as GdacsFeatureCollection | null)?.features ?? [];
  const polygons: FootprintPolygon[] = [];

  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry || !Array.isArray(geometry.coordinates)) continue;

    if (geometry.type === "Polygon") {
      polygons.push(geometry.coordinates as number[][][]);
    } else if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates as number[][][][]) {
        polygons.push(polygon);
      }
    }
  }

  return polygons;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Project [lng, lat] to local x/y kilometres relative to an origin. Accurate
 * enough at NT scale and far cheaper than repeated haversine maths.
 */
function projectKm(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): [number, number] {
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos((originLat * Math.PI) / 180);
  return [(lng - originLng) * kmPerDegLng, (lat - originLat) * kmPerDegLat];
}

function distanceToSegmentKm(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Standard ray-casting test, minus any polygon holes. */
export function pointInPolygon(lng: number, lat: number, polygon: FootprintPolygon): boolean {
  const [outer, ...holes] = polygon;
  if (!outer || outer.length < 3) return false;
  if (!pointInRing(lng, lat, outer)) return false;
  return !holes.some((hole) => pointInRing(lng, lat, hole));
}

/**
 * Distance in km from a point to the nearest footprint edge (0 when inside).
 * Returns `Infinity` when there are no footprints to measure.
 */
export function distanceToFootprintKm(
  lat: number,
  lng: number,
  footprints: FootprintPolygon[]
): number {
  let min = Infinity;

  for (const polygon of footprints) {
    if (pointInPolygon(lng, lat, polygon)) return 0;

    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        if (!Array.isArray(a) || !Array.isArray(b)) continue;

        const [ax, ay] = projectKm(a[1], a[0], lat, lng);
        const [bx, by] = projectKm(b[1], b[0], lat, lng);
        const distance = distanceToSegmentKm(0, 0, ax, ay, bx, by);
        if (distance < min) min = distance;
      }
    }
  }

  return min;
}

// ---------------------------------------------------------------------------
// Matching (pure — unit tested)
// ---------------------------------------------------------------------------

export function matchCommunitiesToEvents(
  events: DisasterEvent[],
  communities: CommunityFeature[],
  bufferKm: number = DISASTER_BUFFER_KM
): CommunityExposure[] {
  const exposures: CommunityExposure[] = [];

  for (const community of communities) {
    const [lng, lat] = community.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    for (const event of events) {
      if (event.footprints.length === 0) continue;

      const distanceKm = distanceToFootprintKm(lat, lng, event.footprints);
      if (distanceKm === 0) {
        exposures.push({ community, event, status: "affected", distanceKm: 0 });
      } else if (distanceKm <= bufferKm) {
        exposures.push({ community, event, status: "at-risk", distanceKm });
      }
    }
  }

  return exposures;
}

function communityKey(community: CommunityFeature): number {
  return community.properties.community_id ?? community.properties.objectid;
}

/** Collapse per-event exposures into one row per community, worst status first. */
export function groupExposures(exposures: CommunityExposure[]): CommunityExposureGroup[] {
  const groups = new Map<number, CommunityExposureGroup>();

  for (const exposure of exposures) {
    const key = communityKey(exposure.community);
    let group = groups.get(key);
    if (!group) {
      group = {
        community: exposure.community,
        hazards: [],
        status: "at-risk",
        distanceKm: Infinity,
        peakAlert: "Green",
      };
      groups.set(key, group);
    }

    group.hazards.push(exposure);
    if (exposure.status === "affected") group.status = "affected";
    group.distanceKm = Math.min(group.distanceKm, exposure.distanceKm);
    if (ALERT_RANK[exposure.event.alertLevel] > ALERT_RANK[group.peakAlert]) {
      group.peakAlert = exposure.event.alertLevel;
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (a.status !== b.status) return a.status === "affected" ? -1 : 1;
    const scoreA = a.community.properties.wbi_score ?? 0;
    const scoreB = b.community.properties.wbi_score ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (a.community.properties.community_name || "").localeCompare(
      b.community.properties.community_name || ""
    );
  });
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface LoadDisasterOptions {
  signal?: AbortSignal;
  /** Days either side of today to include. */
  windowDays?: number;
  /** Injectable clock for tests. */
  now?: Date;
}

/**
 * Fetch the active cyclone/flood events that could reach the NT, then load
 * each one's footprint. A footprint failure degrades that single event to
 * "no footprint" rather than failing the whole panel.
 */
export async function loadDisasterEvents(
  options: LoadDisasterOptions = {}
): Promise<DisasterEvent[]> {
  const { signal, windowDays = DISASTER_WINDOW_DAYS, now = new Date() } = options;
  const fromDate = isoDate(addDays(now, -windowDays));
  const toDate = isoDate(addDays(now, windowDays));

  const lists = await Promise.all(
    SUPPORTED_KINDS.map((kind) =>
      fetchJson<unknown>(
        `${GDACS_BASE}/events/geteventlist/SEARCH?eventtype=${kind}` +
          `&fromDate=${fromDate}&toDate=${toDate}`,
        signal
      )
    )
  );

  const relevant = lists.flatMap(parseEventList).filter(isNtRelevant);

  return Promise.all(
    relevant.map(async (event) => {
      if (!event.footprintUrl) return event;
      try {
        const geometry = await fetchJson<unknown>(event.footprintUrl, signal);
        return { ...event, footprints: extractFootprints(geometry) };
      } catch {
        return event;
      }
    })
  );
}
