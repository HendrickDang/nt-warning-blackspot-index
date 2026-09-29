// scripts/prepare-data.mjs
//
// One-off / repeatable data preparation for the connectivity dashboard.
// Run from the dashboard directory:  npm run prepare-data
//
// It performs two jobs:
//
//   1. TOWERS — the shipped ACCC tower dataset is national (~29k features).
//      This dashboard only maps NT sites, so we filter to the NT bounding box
//      and remap the raw column names to a small, stable schema the app uses
//      ({ name, carrier, has4G, has5G, rfnsa_id, remoteness }). This shrinks
//      the file by an order of magnitude and fixes the tower popups, which
//      previously read properties that did not exist on the raw dataset.
//
//   2. COVERAGE — the raw coverage contours are ~38 MB of very dense rings.
//      We simplify each ring with the Douglas–Peucker algorithm, which keeps
//      the contour shape at map scale while cutting the file size and the cost
//      of the point-in-polygon test used by the WBI connectivity pillar.
//
// Both files are overwritten in place under public/data/. The original
// national towers dataset remains recoverable from git history.
//
// NOTE: filtering and simplification are idempotent-ish; running the coverage
// pass repeatedly will keep eroding detail, so only re-run when regenerating
// from a fresh upstream export.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "..", "public", "data");

// NT bounding box (matches extractNTTowerSites in src/utils/wbiCalculators.ts).
const NT = { minLon: 129, maxLon: 138, minLat: -26, maxLat: -11 };

// Coordinates are rounded to 5 decimal places (~1 m) before writing. The raw
// export carries full float noise (e.g. 129.00541400040024), which is pure file
// bloat with no analytical value. Set COVERAGE_TOLERANCE (degrees) to also run
// Douglas–Peucker simplification; it is opt-in because the contours are
// genuinely detailed and simplification shifts boundary cases in the WBI test.
const COVERAGE_TOLERANCE = process.env.COVERAGE_TOLERANCE
  ? Number(process.env.COVERAGE_TOLERANCE)
  : 0;
const NUMERIC_PRECISION = 5;

function inNT(lon, lat) {
  return lon >= NT.minLon && lon <= NT.maxLon && lat >= NT.minLat && lat <= NT.maxLat;
}

// ---------------------------------------------------------------------------
// Towers
// ---------------------------------------------------------------------------

async function prepareTowers() {
  const path = resolve(dataDir, "towers.geojson");
  const raw = JSON.parse(await readFile(path, "utf8"));
  const features = raw.features ?? [];

  const kept = [];
  for (const f of features) {
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lon, lat] = coords;
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    if (!inNT(lon, lat)) continue;

    const p = f.properties ?? {};
    kept.push({
      type: "Feature",
      properties: {
        name:
          p["RFNSA Site Name"] ||
          p["Site Name"] ||
          p.name ||
          `Tower ${p["RFNSA ID"] ?? ""}`.trim(),
        carrier: p["MNO/Optus-TPG MOCN"] || p["Carrier"] || p.carrier || "Unknown",
        has4G: p["4G"] === "Y" || p.has4G === true,
        has5G: p["5G"] === "Y" || p.has5G === true,
        rfnsa_id: p["RFNSA ID"] ?? p.rfnsa_id ?? null,
        remoteness: p["ABS Remoteness Area"] || p.remoteness || null,
      },
      geometry: { type: "Point", coordinates: [lon, lat] },
    });
  }

  const out = {
    type: "FeatureCollection",
    name: "towers_nt",
    crs: raw.crs,
    features: kept,
  };
  await writeFile(path, JSON.stringify(out));
  console.log(
    `towers: kept ${kept.length} of ${features.length} features (NT only)` +
      ` — carriers: ${[...new Set(kept.map((f) => f.properties.carrier))].join(", ")}`
  );
}

// ---------------------------------------------------------------------------
// Coverage simplification
// ---------------------------------------------------------------------------

function perpendicularDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + clamped * dx), py - (ay + clamped * dy));
}

/** Ramer–Douglas–Peucker on an open polyline (array of [x, y]). */
function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist <= tolerance) return [first, last];

  const left = douglasPeucker(points.slice(0, index + 1), tolerance);
  const right = douglasPeucker(points.slice(index), tolerance);
  return left.slice(0, -1).concat(right);
}

/** Simplify one closed ring, preserving closure and a valid minimum length. */
function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;

  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const open = closed ? ring.slice(0, -1) : ring.slice();
  if (open.length <= 3) return ring;

  const simplified = douglasPeucker(open, tolerance);
  if (simplified.length < 3) return ring;

  return [...simplified, simplified[0]];
}

async function prepareCoverage() {
  const path = resolve(dataDir, "coverage.geojson");
  const raw = JSON.parse(await readFile(path, "utf8"));
  const features = raw.features ?? [];

  let pointsBefore = 0;
  let pointsAfter = 0;

  if (COVERAGE_TOLERANCE > 0) {
    for (const f of features) {
      const polys = f.geometry?.coordinates;
      if (!Array.isArray(polys)) continue;
      for (const poly of polys) {
        if (!Array.isArray(poly)) continue;
        for (let r = 0; r < poly.length; r++) {
          const ring = poly[r];
          if (!Array.isArray(ring)) continue;
          pointsBefore += ring.length;
          poly[r] = simplifyRing(ring, COVERAGE_TOLERANCE);
          pointsAfter += poly[r].length;
        }
      }
    }
  }

  const factor = 10 ** NUMERIC_PRECISION;
  const text = JSON.stringify(raw, (_key, value) =>
    typeof value === "number" ? Math.round(value * factor) / factor : value
  );
  await writeFile(path, text);

  const mb = (text.length / 1048576).toFixed(1);
  if (COVERAGE_TOLERANCE > 0) {
    const pct = pointsBefore ? Math.round((1 - pointsAfter / pointsBefore) * 100) : 0;
    console.log(
      `coverage: simplified ${features.length} features, ` +
        `${pointsBefore} → ${pointsAfter} vertices (-${pct}%), rounded to ${NUMERIC_PRECISION} dp — ${mb} MB`
    );
  } else {
    console.log(
      `coverage: rounded ${features.length} features to ${NUMERIC_PRECISION} dp — ${mb} MB`
    );
  }
}

async function main() {
  const only = process.argv[2];
  if (only !== "coverage") await prepareTowers();
  if (only !== "towers") await prepareCoverage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
