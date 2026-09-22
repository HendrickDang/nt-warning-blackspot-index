// src/utils/wbiCalculator.ts

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function buildCoverageIndex(coverageGeoJSON: any): Array<{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  ring: number[][];
}> {
  const covRings = [];
  if (!coverageGeoJSON?.features) return covRings;

  for (const feat of coverageGeoJSON.features) {
    if (!feat.geometry?.coordinates) continue;
    for (const poly of feat.geometry.coordinates) {
      for (const ring of poly) {
        const lons = ring.map((p: number[]) => p[0]);
        const lats = ring.map((p: number[]) => p[1]);
        covRings.push({
          minX: Math.min(...lons),
          maxX: Math.max(...lons),
          minY: Math.min(...lats),
          maxY: Math.max(...lats),
          ring,
        });
      }
    }
  }
  return covRings;
}

export function extractNTTowerSites(allTowersGeoJSON: any): Array<{
  lat: number;
  lon: number;
  carriers: Set<string>;
  has4G: boolean;
  has5G: boolean;
}> {
  if (!allTowersGeoJSON?.features) return [];

  const ntTowers = allTowersGeoJSON.features.filter((f: any) => {
    const [lon, lat] = f.geometry.coordinates;
    return lon >= 129 && lon <= 138 && lat >= -26 && lat <= -11;
  });

  const towerSites: Array<{ lat: number; lon: number; carriers: Set<string>; has4G: boolean; has5G: boolean }> = [];
  const siteMap = new Map<string, typeof towerSites[0]>();

  for (const t of ntTowers) {
    const [lon, lat] = t.geometry.coordinates;
    const key = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const carrier = t.properties["MNO/Optus-TPG MOCN"] || "Unknown";

    if (!siteMap.has(key)) {
      const site = {
        lat,
        lon,
        carriers: new Set([carrier]),
        has4G: t.properties["4G"] === "Y",
        has5G: t.properties["5G"] === "Y",
      };
      siteMap.set(key, site);
      towerSites.push(site);
    } else {
      const site = siteMap.get(key)!;
      site.carriers.add(carrier);
      if (t.properties["4G"] === "Y") site.has4G = true;
      if (t.properties["5G"] === "Y") site.has5G = true;
    }
  }

  return towerSites;
}

export function computeCommunityWBI(communityFeature: any, towerSites: any[] = [], covRings: any[] = []) {
  const props = { ...communityFeature.properties };
  const [lon, lat] = communityFeature.geometry.coordinates;

  // Pillar 1: Connectivity Gap
  let isCovered = false;
  for (const cr of covRings) {
    if (lon >= cr.minX && lon <= cr.maxX && lat >= cr.minY && lat <= cr.maxY) {
      if (pointInRing(lon, lat, cr.ring)) {
        isCovered = true;
        break;
      }
    }
  }

  const nearbyCarriers = new Set<string>();
  let minDist = Infinity;
  let nearestTowerSite: any = null;

  for (const site of towerSites) {
    const dist = haversineKm(lat, lon, site.lat, site.lon);
    if (dist < 35) {
      for (const c of site.carriers) nearbyCarriers.add(c);
    }
    if (dist < minDist) {
      minDist = dist;
      nearestTowerSite = site;
    }
  }

  const connectivityGap = !isCovered ? (nearbyCarriers.size > 0 ? 80 : 100) : (nearbyCarriers.size >= 2 ? 10 : 30);

  // Pillar 2: Natural Hazard Exposure
  let hazardScore = lat > -14 ? 90 : lat > -17 ? 75 : lat > -20 ? 65 : lat > -24 ? 60 : 55;

  if (["Major", "Town", "City"].includes(props.community_type)) {
    hazardScore = Math.max(0, hazardScore - 15);
  } else if (props.community_type === "Village" || props.community_type === "Minor") {
    hazardScore = Math.max(0, hazardScore - 5);
  }

  // Pillar 3: Infrastructure Proximity
  let proximityScore = minDist > 100 ? 100 : minDist > 50 ? 80 : minDist > 35 ? 60 : minDist > 15 ? 40 : minDist > 5 ? 15 : 5;

  // Pillar 4: Digital Exclusion
  const ctype = props.community_type || "Family Outstation";
  const pop = props.population_count || 0;
  let digitalExclusion = 80;

  if (ctype === "Family Outstation") digitalExclusion = pop <= 10 ? 95 : pop <= 30 ? 88 : 82;
  else if (ctype === "Minor") digitalExclusion = 72;
  else if (ctype === "Town Camp") digitalExclusion = 65;
  else if (ctype === "Major") digitalExclusion = pop > 500 ? 45 : 55;
  else if (ctype === "Village") digitalExclusion = 50;
  else if (ctype === "Town") digitalExclusion = 30;
  else if (ctype === "City") digitalExclusion = 15;

  const lang = (props.main_language || "Not recorded").toLowerCase();
  if (lang !== "not recorded" && lang !== "english") {
    digitalExclusion = Math.min(100, digitalExclusion + 5);
  }

  // Composite Score
  const wbi = Math.round(
    0.35 * connectivityGap +
    0.25 * hazardScore +
    0.20 * proximityScore +
    0.20 * digitalExclusion
  );

  let tier: "Critical" | "High" | "Moderate" | "Low" =
    wbi >= 75 ? "Critical" : wbi >= 60 ? "High" : wbi >= 40 ? "Moderate" : "Low";

  return {
    ...props,
    has_coverage: isCovered,
    coverage_status: isCovered ? "Covered" : "Warning Blackspot",
    nearby_carriers: nearbyCarriers.size,
    carrier_names: [...nearbyCarriers].join(", ") || "None",
    nearest_tower_km: Math.round(minDist * 10) / 10,
    nearest_tower_carriers: nearestTowerSite ? [...nearestTowerSite.carriers].join(", ") : "N/A",
    nearest_tower_4g: nearestTowerSite?.has4G || false,
    nearest_tower_5g: nearestTowerSite?.has5G || false,
    connectivity_gap_score: Math.round(connectivityGap),
    hazard_score: Math.round(hazardScore),
    proximity_score: Math.round(proximityScore),
    digital_exclusion_score: Math.round(digitalExclusion),
    wbi_score: wbi,
    wbi_tier: tier,
    hazard_risk: hazardScore >= 80 ? "Extreme" : hazardScore >= 65 ? "High" : hazardScore >= 50 ? "Moderate" : "Low",
  };
}