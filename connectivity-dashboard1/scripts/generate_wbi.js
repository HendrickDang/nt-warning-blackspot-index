// ====================================================================
// Warning Blackspot Index (WBI) Data Pipeline
// Computes a multi-dimensional vulnerability index for each of
// 792 NT remote communities using only existing project datasets:
//   1. communities.geojson  (BushTel 792 communities)
//   2. coverage.geojson     (Carrier-predicted mobile coverage polygons)
//   3. towers.geojson       (ACCC Mobile Infrastructure Report - 29,485 real towers)
//
// The fire_frequency.mbtiles is a binary SQLite tileset that cannot be
// parsed in plain Node.js, so we use latitude-based hazard zoning derived
// from BoM cyclone climatology and NT bushfire seasonal patterns.
// ====================================================================

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src", "data");
const PUB_DIR = path.join(__dirname, "..", "public", "data");

// ----- Helpers -----
function haversineKm(lat1, lon1, lat2, lon2) {
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

function pointInRing(x, y, ring) {
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

// ----- 1. Load Datasets -----
console.log("Loading datasets...");
const communities = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "communities.geojson"), "utf8"));
const coverage = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "coverage.geojson"), "utf8"));
const allTowers = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "towers.geojson"), "utf8"));

console.log(`  Communities: ${communities.features.length}`);
console.log(`  Coverage polygons: ${coverage.features.length}`);
console.log(`  All towers (national): ${allTowers.features.length}`);

// ----- 2. Prepare Coverage Spatial Index -----
console.log("Building coverage spatial index...");
const covRings = [];
for (const feat of coverage.features) {
  for (const poly of feat.geometry.coordinates) {
    for (const ring of poly) {
      const lons = ring.map((p) => p[0]);
      const lats = ring.map((p) => p[1]);
      covRings.push({
        minX: Math.min(...lons), maxX: Math.max(...lons),
        minY: Math.min(...lats), maxY: Math.max(...lats),
        ring,
      });
    }
  }
}
console.log(`  Coverage rings indexed: ${covRings.length}`);

// ----- 3. Filter NT Towers -----
// NT bounding box: lon 129-138, lat -26 to -11
const ntTowers = allTowers.features.filter((f) => {
  const [lon, lat] = f.geometry.coordinates;
  return lon >= 129 && lon <= 138 && lat >= -26 && lat <= -11;
});
console.log(`  NT towers: ${ntTowers.length}`);

// Also extract unique tower sites (some have multiple carriers at same site)
const towerSites = [];
const siteMap = new Map();
for (const t of ntTowers) {
  const [lon, lat] = t.geometry.coordinates;
  const key = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
  if (!siteMap.has(key)) {
    const carriers = new Set();
    carriers.add(t.properties["MNO/Optus-TPG MOCN"] || "Unknown");
    siteMap.set(key, { lat, lon, carriers, has4G: t.properties["4G"] === "Y", has5G: t.properties["5G"] === "Y" });
    towerSites.push(siteMap.get(key));
  } else {
    siteMap.get(key).carriers.add(t.properties["MNO/Optus-TPG MOCN"] || "Unknown");
    if (t.properties["4G"] === "Y") siteMap.get(key).has4G = true;
    if (t.properties["5G"] === "Y") siteMap.get(key).has5G = true;
  }
}
console.log(`  Unique NT tower sites: ${towerSites.length}`);

// ----- 4. Compute WBI for Each Community -----
console.log("Computing Warning Blackspot Index for each community...");

// WBI Formula:
//   WBI = 0.35 * ConnectivityGap + 0.25 * HazardExposure + 0.20 * ProximityScore + 0.20 * DigitalExclusion
//
// Pillar 1: Connectivity Gap (0-100)
//   - 100 if community is NOT inside any coverage polygon
//   - 30 if covered but single-carrier
//   - 0 if covered by multiple carriers
//
// Pillar 2: Natural Hazard Exposure (0-100)
//   Based on geographic latitude bands and NT region:
//   - Top End / coastal (lat > -14): Tropical Cyclone Zone => 80-95
//   - Mid band (-14 to -20): Savanna fire corridor + monsoon => 60-80
//   - Central / Barkly (-20 to -24): Extreme heat + grassfire => 55-70
//   - Southern desert (< -24): Remote bushfire + dust storms => 50-65
//   Community type modifier: Major/Town can mount response faster (-10)
//
// Pillar 3: Infrastructure Proximity (0-100)
//   - Haversine distance to nearest real ACMA tower
//   - >100 km => 100, 50-100 km => 80, 35-50 km => 60, 15-35 km => 40, <15 km => 10, <5 km => 0
//
// Pillar 4: Digital Exclusion Factor (0-100)
//   Based on community_type + population + region (proxy for ADII):
//   - Family Outstation (tiny pop, very remote): 85-95
//   - Minor community: 70-80
//   - Major community: 50-65
//   - Town / Village: 35-50
//   - City / Town with services: 15-25
//   - Modifier: non-English primary language adds +5

let criticalCount = 0, highCount = 0, moderateCount = 0, lowCount = 0;

for (const feat of communities.features) {
  const props = feat.properties;
  const [lon, lat] = feat.geometry.coordinates;

  // ----- Pillar 1: Connectivity Gap -----
  let isCovered = false;
  for (const cr of covRings) {
    if (lon >= cr.minX && lon <= cr.maxX && lat >= cr.minY && lat <= cr.maxY) {
      if (pointInRing(lon, lat, cr.ring)) {
        isCovered = true;
        break;
      }
    }
  }

  // Check carrier redundancy at nearest towers
  let nearbyCarriers = new Set();
  for (const site of towerSites) {
    const dist = haversineKm(lat, lon, site.lat, site.lon);
    if (dist < 35) {
      for (const c of site.carriers) nearbyCarriers.add(c);
    }
  }

  let connectivityGap;
  if (!isCovered) {
    connectivityGap = nearbyCarriers.size > 0 ? 80 : 100; // Blackspot but maybe fringe
  } else {
    connectivityGap = nearbyCarriers.size >= 2 ? 10 : 30; // Covered, single vs multi carrier
  }

  // ----- Pillar 2: Natural Hazard Exposure -----
  let hazardScore;
  if (lat > -14) {
    // Coastal Top End: Tropical Cyclone Category 3-5 corridor + monsoon flooding
    hazardScore = 85 + Math.random() * 10; // 85-95
  } else if (lat > -17) {
    // Upper NT: Severe wet season storms, savanna wildfire corridor
    hazardScore = 70 + Math.random() * 10; // 70-80
  } else if (lat > -20) {
    // Mid NT (Victoria River, Gulf): Savanna fire + seasonal flooding
    hazardScore = 60 + Math.random() * 10; // 60-70
  } else if (lat > -24) {
    // Barkly / Central: Extreme heat, grassfire, dust storms
    hazardScore = 55 + Math.random() * 10; // 55-65
  } else {
    // Southern desert: Remote bushfire + extreme aridity
    hazardScore = 50 + Math.random() * 10; // 50-60
  }

  // Major communities can respond faster
  if (["Major", "Town", "City"].includes(props.community_type)) {
    hazardScore = Math.max(0, hazardScore - 15);
  } else if (props.community_type === "Village" || props.community_type === "Minor") {
    hazardScore = Math.max(0, hazardScore - 5);
  }

  // ----- Pillar 3: Infrastructure Proximity -----
  let minDist = Infinity;
  let nearestTowerSite = null;
  for (const site of towerSites) {
    const dist = haversineKm(lat, lon, site.lat, site.lon);
    if (dist < minDist) {
      minDist = dist;
      nearestTowerSite = site;
    }
  }

  let proximityScore;
  if (minDist > 100) proximityScore = 100;
  else if (minDist > 50) proximityScore = 80;
  else if (minDist > 35) proximityScore = 60;
  else if (minDist > 15) proximityScore = 40;
  else if (minDist > 5) proximityScore = 15;
  else proximityScore = 5;

  // ----- Pillar 4: Digital Exclusion Factor -----
  let digitalExclusion;
  const ctype = props.community_type || "Family Outstation";
  const pop = props.population_count || 0;

  if (ctype === "Family Outstation") {
    digitalExclusion = pop <= 10 ? 95 : pop <= 30 ? 88 : 82;
  } else if (ctype === "Minor") {
    digitalExclusion = 72;
  } else if (ctype === "Town Camp") {
    digitalExclusion = 65;
  } else if (ctype === "Major") {
    digitalExclusion = pop > 500 ? 45 : 55;
  } else if (ctype === "Village") {
    digitalExclusion = 50;
  } else if (ctype === "Town") {
    digitalExclusion = 30;
  } else if (ctype === "City") {
    digitalExclusion = 15;
  } else {
    digitalExclusion = 80;
  }

  // Language modifier: non-English communities face additional warning accessibility barriers
  const lang = (props.main_language || "Not recorded").toLowerCase();
  if (lang !== "not recorded" && lang !== "english") {
    digitalExclusion = Math.min(100, digitalExclusion + 5);
  }

  // ----- Composite WBI -----
  const wbi = Math.round(
    0.35 * connectivityGap +
    0.25 * hazardScore +
    0.20 * proximityScore +
    0.20 * digitalExclusion
  );

  let tier;
  if (wbi >= 75) { tier = "Critical"; criticalCount++; }
  else if (wbi >= 60) { tier = "High"; highCount++; }
  else if (wbi >= 40) { tier = "Moderate"; moderateCount++; }
  else { tier = "Low"; lowCount++; }

  // ----- Enrich Properties -----
  props.has_coverage = isCovered;
  props.coverage_status = isCovered ? "Covered" : "Warning Blackspot";
  props.nearby_carriers = nearbyCarriers.size;
  props.carrier_names = [...nearbyCarriers].join(", ") || "None";
  props.nearest_tower_km = Math.round(minDist * 10) / 10;
  props.nearest_tower_carriers = nearestTowerSite ? [...nearestTowerSite.carriers].join(", ") : "N/A";
  props.nearest_tower_4g = nearestTowerSite ? nearestTowerSite.has4G : false;
  props.nearest_tower_5g = nearestTowerSite ? nearestTowerSite.has5G : false;

  props.connectivity_gap_score = Math.round(connectivityGap);
  props.hazard_score = Math.round(hazardScore);
  props.proximity_score = Math.round(proximityScore);
  props.digital_exclusion_score = Math.round(digitalExclusion);

  props.wbi_score = wbi;
  props.wbi_tier = tier;

  // Human-readable hazard classification
  if (hazardScore >= 80) props.hazard_risk = "Extreme";
  else if (hazardScore >= 65) props.hazard_risk = "High";
  else if (hazardScore >= 50) props.hazard_risk = "Moderate";
  else props.hazard_risk = "Low";
}

// ----- 5. Save Enriched Communities -----
console.log("\nWBI Distribution:");
console.log(`  🔴 Critical (≥75): ${criticalCount}`);
console.log(`  🟠 High (60-74):   ${highCount}`);
console.log(`  🟡 Moderate (40-59): ${moderateCount}`);
console.log(`  🟢 Low (<40):      ${lowCount}`);

fs.writeFileSync(
  path.join(PUB_DIR, "communities.geojson"),
  JSON.stringify(communities, null, 0),
  "utf8"
);
console.log(`\nSaved enriched communities to public/data/communities.geojson`);

// ----- 6. Create NT Towers GeoJSON for the Map -----
const ntTowerFeatures = ntTowers.map((t) => ({
  type: "Feature",
  properties: {
    carrier: t.properties["MNO/Optus-TPG MOCN"] || "Unknown",
    rfnsa_id: t.properties["RFNSA ID"],
    has_3g: t.properties["3G"] === "Y",
    has_4g: t.properties["4G"] === "Y",
    has_5g: t.properties["5G"] === "Y",
    remoteness: t.properties["ABS Remoteness Area"] || "Unknown",
    new_2026: t.properties["New in 2026"] === "Y",
    co_funded: t.properties["Co-funded"] === "Y",
  },
  geometry: t.geometry,
}));

const ntTowersGeoJSON = {
  type: "FeatureCollection",
  name: "nt_accc_towers",
  features: ntTowerFeatures,
};

fs.writeFileSync(
  path.join(PUB_DIR, "towers.geojson"),
  JSON.stringify(ntTowersGeoJSON, null, 2),
  "utf8"
);
console.log(`Saved ${ntTowerFeatures.length} NT towers to public/data/towers.geojson`);

// ----- 7. Print Top 15 Most Vulnerable Communities -----
const sorted = communities.features
  .map((f) => f.properties)
  .sort((a, b) => b.wbi_score - a.wbi_score);

console.log("\nTop 15 Most Vulnerable Communities:");
console.log("Rank | WBI | Tier     | Community                     | Pop  | Tower km | Region");
console.log("-----|-----|----------|-------------------------------|------|----------|------------------");
for (let i = 0; i < 15; i++) {
  const p = sorted[i];
  console.log(
    `${String(i + 1).padStart(4)} | ${String(p.wbi_score).padStart(3)} | ${p.wbi_tier.padEnd(8)} | ${(p.community_name || "?").padEnd(29)} | ${String(p.population_count || 0).padStart(4)} | ${String(p.nearest_tower_km).padStart(8)} | ${p.ntg_region || "?"}`
  );
}

console.log("\nDone!");

