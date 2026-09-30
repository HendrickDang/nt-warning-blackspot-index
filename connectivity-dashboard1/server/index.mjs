// Field-report ingestion API for the Warning Blackspot mobile app.
//
// Zero-dependency Node HTTP server. The mobile app POSTs hazard reports here
// (captured GPS coordinates and an optional photo included) and the dashboard
// reads them back to plot them on the map. Reports are persisted to
// server/data/reports.json; photos are written to server/data/photos/ and
// referenced by URL so the JSON file stays small and readable.
//
//   node server/index.mjs            # listens on 0.0.0.0:8787
//   PORT=9000 node server/index.mjs  # custom port
//
// Endpoints:
//   GET  /api/health            -> { status, count }
//   GET  /api/reports           -> { reports: Report[] }
//   POST /api/reports           -> 201 { report } | 400 { errors }
//   GET  /api/photos/<file>     -> image bytes
//
// A report may include `photo` as a data URI
// ("data:image/jpeg;base64,...."); the server decodes it to disk and replaces
// it with `photoUrl` in the stored report.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "data");
const DATA_FILE = join(DATA_DIR, "reports.json");
const PHOTO_DIR = join(DATA_DIR, "photos");

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

// Reports are small, but an inline photo needs headroom. ~10 MB covers a
// 1280px JPEG at high quality with base64 overhead.
const MAX_BODY_BYTES = 10 * 1024 * 1024;
// Largest decoded image we will store (~5 MB).
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const CATEGORIES = ["Dry grass", "Tall grass", "Floodwater", "Fire / smoke"];
const SEVERITIES = ["Low", "Medium", "High", "Urgent"];

const PHOTO_TYPES = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** @type {Array<Record<string, unknown>>} */
let reports = [];
let writeChain = Promise.resolve();

async function loadReports() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    reports = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not read ${DATA_FILE}: ${error.message}. Starting empty.`);
    }
    reports = [];
  }
}

function persist() {
  writeChain = writeChain.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, `${JSON.stringify(reports, null, 2)}\n`, "utf8");
  });
  return writeChain;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...CORS_HEADERS,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Decode a `data:image/...;base64,...` URI, or null when it is not one. */
function decodeDataUri(value) {
  if (typeof value !== "string") return null;
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value.trim());
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const ext = PHOTO_TYPES[mime];
  if (!ext) return null;

  let bytes;
  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return null;

  return { bytes, mime, ext };
}

async function savePhoto(id, decoded) {
  await mkdir(PHOTO_DIR, { recursive: true });
  const file = `${id}${decoded.ext}`;
  await writeFile(join(PHOTO_DIR, file), decoded.bytes);
  return `/api/photos/${file}`;
}

async function deletePhotoFor(report) {
  const url = typeof report?.photoUrl === "string" ? report.photoUrl : null;
  if (!url) return;
  const file = basename(url);
  // Guard against path traversal from tampered data.
  if (!/^[A-Za-z0-9._-]+$/.test(file)) return;
  try {
    await unlink(join(PHOTO_DIR, file));
  } catch {
    // Already gone — nothing to do.
  }
}

function validate(input) {
  const errors = [];
  if (!CATEGORIES.includes(input?.category)) {
    errors.push(`category must be one of: ${CATEGORIES.join(", ")}`);
  }
  if (!SEVERITIES.includes(input?.severity)) {
    errors.push(`severity must be one of: ${SEVERITIES.join(", ")}`);
  }
  const latitude = Number(input?.latitude);
  const longitude = Number(input?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push("latitude must be a number between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push("longitude must be a number between -180 and 180");
  }
  if (input?.photo !== undefined && input?.photo !== null && input?.photo !== "") {
    if (!decodeDataUri(input.photo)) {
      errors.push("photo must be a base64 data URI (image/jpeg, image/png or image/webp)");
    }
  }
  return { errors, latitude, longitude };
}

function normalise(input) {
  const { latitude, longitude } = validate(input);
  const accuracy = Number(input?.accuracy);
  const notes = typeof input?.notes === "string" ? input.notes.slice(0, 2000) : "";
  return {
    id: typeof input?.id === "string" && input.id.trim() ? input.id.trim() : randomUUID(),
    category: input.category,
    severity: input.severity,
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    notes,
    reportedAt:
      typeof input?.reportedAt === "string" && !Number.isNaN(Date.parse(input.reportedAt))
        ? input.reportedAt
        : new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };
}

async function servePhoto(res, fileName) {
  // Only ever serve plain file names from the photos directory.
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) {
    sendJson(res, 400, { errors: ["Invalid photo name"] });
    return;
  }
  try {
    const bytes = await readFile(join(PHOTO_DIR, fileName));
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extname(fileName).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": bytes.length,
      "Cache-Control": "public, max-age=300",
      ...CORS_HEADERS,
    });
    res.end(bytes);
  } catch {
    sendJson(res, 404, { errors: ["Photo not found"] });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { status: "ok", count: reports.length });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/photos/")) {
    await servePhoto(res, decodeURIComponent(url.pathname.slice("/api/photos/".length)));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/reports") {
    const sorted = [...reports].sort(
      (a, b) => Date.parse(String(b.reportedAt)) - Date.parse(String(a.reportedAt)),
    );
    sendJson(res, 200, { reports: sorted });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reports") {
    let input;
    try {
      // Tolerate a leading UTF-8 BOM (some clients/tools add one).
      const raw = (await readBody(req)).replace(/^\uFEFF/, "");
      input = JSON.parse(raw);
    } catch (error) {
      sendJson(res, 400, { errors: [error.message || "Invalid JSON body"] });
      return;
    }

    const { errors } = validate(input);
    if (errors.length > 0) {
      sendJson(res, 400, { errors });
      return;
    }

    const report = normalise(input);
    const existingIndex = reports.findIndex((item) => item.id === report.id);

    // A re-sent report may carry a fresh photo; drop any previous file.
    if (existingIndex >= 0) await deletePhotoFor(reports[existingIndex]);

    const decoded = decodeDataUri(input?.photo);
    if (decoded) {
      try {
        report.photoUrl = await savePhoto(report.id, decoded);
      } catch (error) {
        console.warn(`Could not store photo for ${report.id}: ${error.message}`);
      }
    }

    if (existingIndex >= 0) reports[existingIndex] = report;
    else reports.push(report);
    await persist();

    console.log(
      `+ ${report.severity.padEnd(6)} ${report.category} @ ${report.latitude},${report.longitude}` +
        `${report.photoUrl ? " [photo]" : ""} (${reports.length} total)`,
    );
    sendJson(res, 201, { report });
    return;
  }

  sendJson(res, 404, { errors: ["Not found"] });
});

await loadReports();

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `\n[X] Port ${PORT} is already in use — another reports API is probably running.\n` +
        `    Stop it first (close the "Blackspot API" window, or find the PID with:\n` +
        `      netstat -ano | findstr :${PORT}\n` +
        `    then: taskkill /PID <pid> /F), or start this one on another port:\n` +
        `      set PORT=8788 && node server/index.mjs\n`,
    );
  } else {
    console.error(`\n[X] Could not start the reports API: ${error.message}\n`);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Warning Blackspot reports API listening on http://${HOST}:${PORT}`);
  console.log(`  ${reports.length} report(s) loaded from ${DATA_FILE}`);
  console.log(`  POST /api/reports   GET /api/reports   GET /api/photos/<file>   GET /api/health`);
});
