import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import L, { Map as LeafletMap, GeoJSON, TileLayer } from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import type { CommunityFeature, LayerState, TowerProperties } from "../types";
import {
  NAFI_WMS_URL,
  NAFI_ATTRIBUTION,
  ACTIVE_FIRE_LAYERS,
  BURNT_AREAS_LAYER,
} from "../bushfire";
import { useData } from "../context/dataContext";
import { escapeHtml, safeUrl } from "../utils/html";
import { getWbiTierStyle } from "../utils/wbi";

interface Props {
  layers: LayerState;
}

type CommunityLayerMap = Map<number, L.CircleMarker>;

function communityPopupHtml(p: CommunityFeature["properties"]): string {
  const style = getWbiTierStyle(p.wbi_tier);
  const hasWbi = typeof p.wbi_score === "number";
  const bushtelUrl = safeUrl(p.bushtel_url);

  const wbiBlock = hasWbi
    ? `
      <div style="margin-top:8px;padding:8px;border-radius:8px;background:#0f172a;color:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">Warning Blackspot Index</span>
          <span style="font-weight:700;font-size:14px;color:${style.fill};">${escapeHtml(p.wbi_score)} / 100</span>
        </div>
        <div style="font-size:11px;line-height:1.6;color:#cbd5e1;">
          <div>Connectivity gap: <strong style="color:#fff;">${escapeHtml(p.connectivity_gap_score)}</strong></div>
          <div>Hazard exposure: <strong style="color:#fff;">${escapeHtml(p.hazard_score)}</strong></div>
          <div>Tower proximity: <strong style="color:#fff;">${escapeHtml(p.proximity_score)}</strong></div>
          <div>Digital exclusion: <strong style="color:#fff;">${escapeHtml(p.digital_exclusion_score)}</strong></div>
        </div>
      </div>`
    : `<div style="margin-top:8px;font-size:11px;color:#94a3b8;">Calculating WBI…</div>`;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;min-width:210px;padding:2px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${style.fill};border:1px solid ${style.stroke};"></span>
        <h3 style="margin:0;font-weight:700;font-size:14px;color:#0f172a;">${escapeHtml(p.community_name || "Community")}</h3>
      </div>
      <div style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:#e0e7ff;color:#3730a3;margin-bottom:6px;">
        ${escapeHtml(p.community_type || "Outstation")} • ${escapeHtml(p.ntg_region || "NT")}
      </div>
      <div style="font-size:12px;color:#334155;line-height:1.5;">
        <div><strong>Council:</strong> ${escapeHtml(p.local_govt_council || "N/A")}</div>
        <div><strong>Population:</strong> ${p.population_count !== null && p.population_count !== undefined ? escapeHtml(p.population_count.toLocaleString()) : "Not recorded"}</div>
        <div><strong>Language:</strong> ${escapeHtml(p.main_language || "Not recorded")}</div>
        <div><strong>Coverage:</strong> ${escapeHtml(p.coverage_status || "—")}${typeof p.nearest_tower_km === "number" ? ` • nearest tower ${escapeHtml(p.nearest_tower_km)} km` : ""}</div>
      </div>
      ${wbiBlock}
      ${
        bushtelUrl
          ? `<div style="margin-top:8px;border-top:1px solid #f1f5f9;padding-top:6px;">
              <a href="${bushtelUrl}" target="_blank" rel="noreferrer" style="color:#4f46e5;text-decoration:underline;font-size:11px;font-weight:600;">View BushTel Profile &rarr;</a>
            </div>`
          : ""
      }
    </div>
  `;
}

function towerPopupHtml(p: TowerProperties): string {
  const generations = [p.has4G ? "4G" : null, p.has5G ? "5G" : null]
    .filter(Boolean)
    .join(" / ");
  return `
    <div style="font-family:system-ui,sans-serif;padding:2px;min-width:170px;">
      <strong style="color:#047857;font-size:13px;">${escapeHtml(p.name || "Cell Tower")}</strong>
      <div style="font-size:11px;color:#64748b;margin-top:2px;line-height:1.5;">
        <div>Carrier: ${escapeHtml(p.carrier || "Unknown")}</div>
        ${generations ? `<div>Services: ${escapeHtml(generations)}</div>` : ""}
        ${p.remoteness ? `<div>${escapeHtml(p.remoteness)}</div>` : ""}
      </div>
    </div>
  `;
}

export default function MapView({ layers }: Props) {
  const {
    communities,
    wbiCommunities,
    towers,
    boundary,
    status,
    wbiStatus,
    ensureWbi,
    loadCoverage,
  } = useData();

  const mapRef = useRef<LeafletMap | null>(null);
  const baseMapRef = useRef<TileLayer | null>(null);
  const activeFireRef = useRef<TileLayer | null>(null);
  const burntAreasRef = useRef<TileLayer | null>(null);

  // Vector layers built from in-memory data (no re-fetching on toggle).
  const communityLayerRef = useRef<GeoJSON | null>(null);
  const towersLayerRef = useRef<GeoJSON | null>(null);
  const boundaryLayerRef = useRef<GeoJSON | null>(null);
  const coverageLayerRef = useRef<GeoJSON | null>(null);
  const coverageLoadingRef = useRef(false);
  const communityMarkersRef = useRef<CommunityLayerMap>(new Map());

  // Always-fresh toggles for async callbacks / layer build effects.
  const layersRef = useRef(layers);

  const [searchParams] = useSearchParams();
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  // Pending "fly to community" request from the URL, applied once data is ready.
  const focusRef = useRef<{ lat: number; lng: number; name: string; commId: number | null } | null>(null);

  // One canvas renderer keeps the heavy coverage polygons and the many tower
  // markers off the DOM/SVG tree, which is far faster to pan and zoom.
  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  // WBI powers the community colouring and popups, so ask for it up front.
  useEffect(() => {
    ensureWbi();
  }, [ensureWbi]);

  // Keep the latest layer toggles available to synchronous build effects.
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // ---------------------------------------------------------------------------
  // 1. INITIALIZE MAP (once)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("map", { zoomControl: true }).setView([-19.0, 133.0], 5);
    mapRef.current = map;

    map.createPane("coveragePane");
    map.getPane("coveragePane")!.style.zIndex = "500";
    map.createPane("nodesPane");
    map.getPane("nodesPane")!.style.zIndex = "600";
    map.createPane("communitiesPane");
    map.getPane("communitiesPane")!.style.zIndex = "700";
    map.createPane("bushfirePane");
    map.getPane("bushfirePane")!.style.zIndex = "550";

    baseMapRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    });

    activeFireRef.current = L.tileLayer.wms(NAFI_WMS_URL, {
      layers: ACTIVE_FIRE_LAYERS,
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      crs: L.CRS.EPSG4326,
      pane: "bushfirePane",
      maxZoom: 18,
      attribution: NAFI_ATTRIBUTION,
    });

    burntAreasRef.current = L.tileLayer.wms(NAFI_WMS_URL, {
      layers: BURNT_AREAS_LAYER,
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      crs: L.CRS.EPSG4326,
      pane: "bushfirePane",
      maxZoom: 18,
      attribution: NAFI_ATTRIBUTION,
    });

    return () => {
      map.remove();
      mapRef.current = null;
      communityLayerRef.current = null;
      towersLayerRef.current = null;
      boundaryLayerRef.current = null;
      coverageLayerRef.current = null;
      communityMarkersRef.current = new Map();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. TILE LAYER TOGGLES (base map + live bushfire)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = (layer: TileLayer | null, active: boolean) => {
      if (!layer) return;
      if (active && !map.hasLayer(layer)) layer.addTo(map);
      else if (!active && map.hasLayer(layer)) map.removeLayer(layer);
    };

    sync(baseMapRef.current, layers.baseMap);
    sync(activeFireRef.current, layers.activeBushfires);
    sync(burntAreasRef.current, layers.burntAreas);
  }, [layers.baseMap, layers.activeBushfires, layers.burntAreas]);

  // ---------------------------------------------------------------------------
  // 3a. COMMUNITY LAYER — rebuilt only when the data changes (raw → WBI).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = communityLayerRef.current;
    if (existing && map.hasLayer(existing)) map.removeLayer(existing);
    communityLayerRef.current = null;

    const communityData = wbiCommunities ?? communities;
    if (communityData.length === 0) {
      communityMarkersRef.current = new Map();
      return;
    }

    const markers: CommunityLayerMap = new Map();
    const layer = L.geoJSON(communityData as unknown as GeoJsonObject, {
      pane: "communitiesPane",
      pointToLayer: (_feature, latlng) => {
        const props = (_feature as unknown as CommunityFeature).properties;
        const style = getWbiTierStyle(props.wbi_tier);
        return L.circleMarker(latlng, {
          renderer: canvasRenderer,
          radius: 6,
          fillColor: style.fill,
          color: style.stroke,
          weight: 1.5,
          fillOpacity: 0.9,
        });
      },
      onEachFeature: (feature, featureLayer) => {
        const props = (feature as unknown as CommunityFeature).properties;
        (featureLayer as L.CircleMarker).bindPopup(communityPopupHtml(props));
        if (typeof props.community_id === "number") {
          markers.set(props.community_id, featureLayer as L.CircleMarker);
        }
      },
    });

    communityMarkersRef.current = markers;
    communityLayerRef.current = layer;
    if (layersRef.current.communities) layer.addTo(map);

    // If the URL asked us to focus a community, open it now that markers exist.
    const focus = focusRef.current;
    if (focus?.commId !== null && focus?.commId !== undefined) {
      const marker = markers.get(focus.commId);
      if (marker) {
        marker.openPopup();
        focusRef.current = null;
      }
    }
  }, [wbiCommunities, communities, canvasRenderer]);

  // 3b. Community visibility toggle.
  useEffect(() => {
    const map = mapRef.current;
    const layer = communityLayerRef.current;
    if (!map || !layer) return;
    if (layers.communities && !map.hasLayer(layer)) layer.addTo(map);
    else if (!layers.communities && map.hasLayer(layer)) map.removeLayer(layer);
  }, [layers.communities]);

  // ---------------------------------------------------------------------------
  // 3c. TOWER LAYER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !towers) return;

    const existing = towersLayerRef.current;
    if (existing && map.hasLayer(existing)) map.removeLayer(existing);

    const layer = L.geoJSON(towers as unknown as GeoJsonObject, {
      pane: "nodesPane",
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, {
          renderer: canvasRenderer,
          radius: 5,
          fillColor: "#10b981",
          color: "#047857",
          weight: 1.5,
          fillOpacity: 0.9,
        }),
      onEachFeature: (feature, featureLayer) => {
        const props = (feature as unknown as { properties: TowerProperties }).properties;
        featureLayer.bindPopup(towerPopupHtml(props));
      },
    });
    towersLayerRef.current = layer;
    if (layersRef.current.towers) layer.addTo(map);
  }, [towers, canvasRenderer]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = towersLayerRef.current;
    if (!map || !layer) return;
    if (layers.towers && !map.hasLayer(layer)) layer.addTo(map);
    else if (!layers.towers && map.hasLayer(layer)) map.removeLayer(layer);
  }, [layers.towers]);

  // ---------------------------------------------------------------------------
  // 3d. NT BOUNDARY LAYER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !boundary) return;

    const existing = boundaryLayerRef.current;
    if (existing && map.hasLayer(existing)) map.removeLayer(existing);

    const layer = L.geoJSON(boundary as unknown as GeoJsonObject, {
      style: {
        color: "#ef4444",
        weight: 2,
        opacity: 0.7,
        fill: false,
        dashArray: "5, 10",
      },
    });
    boundaryLayerRef.current = layer;
    if (layersRef.current.ntBoundary) layer.addTo(map);
  }, [boundary]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = boundaryLayerRef.current;
    if (!map || !layer) return;
    if (layers.ntBoundary && !map.hasLayer(layer)) layer.addTo(map);
    else if (!layers.ntBoundary && map.hasLayer(layer)) map.removeLayer(layer);
  }, [layers.ntBoundary]);

  // ---------------------------------------------------------------------------
  // 4. COVERAGE (lazy — only fetched when the layer is switched on)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = coverageLayerRef.current;
    if (layers.coverage && !existing && !coverageLoadingRef.current && !coverageError) {
      coverageLoadingRef.current = true;
      setCoverageLoading(true);
      loadCoverage()
        .then((data) => {
          const layer = L.geoJSON(data as unknown as GeoJsonObject, {
            pane: "coveragePane",
            style: {
              renderer: canvasRenderer,
              color: "#2563eb",
              weight: 1.5,
              fillColor: "#3b82f6",
              fillOpacity: 0.25,
            },
          });
          coverageLayerRef.current = layer;
          if (layersRef.current.coverage) layer.addTo(mapRef.current!);
        })
        .catch((err) => {
          setCoverageError(err instanceof Error ? err.message : "Failed to load coverage");
        })
        .finally(() => {
          coverageLoadingRef.current = false;
          setCoverageLoading(false);
        });
      return;
    }

    if (existing) {
      if (layers.coverage && !map.hasLayer(existing)) existing.addTo(map);
      else if (!layers.coverage && map.hasLayer(existing)) map.removeLayer(existing);
    }
  }, [layers.coverage, loadCoverage, canvasRenderer, coverageError]);

  // ---------------------------------------------------------------------------
  // 5. Handle URL focus parameters (e.g. "View on Map" from Communities)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const nameStr = searchParams.get("name") ?? "";
    const commIdStr = searchParams.get("commId");
    const map = mapRef.current;
    if (!map || !latStr || !lngStr) return;

    const lat = Number.parseFloat(latStr);
    const lng = Number.parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const parsedId = commIdStr ? Number.parseInt(commIdStr, 10) : NaN;
    const commId = Number.isNaN(parsedId) ? null : parsedId;
    focusRef.current = { lat, lng, name: nameStr, commId };

    map.flyTo([lat, lng], 10, { duration: 1.5 });

    const marker = commId !== null ? communityMarkersRef.current.get(commId) : undefined;
    if (marker) {
      marker.openPopup();
      focusRef.current = null;
    } else if (commId === null) {
      L.popup()
        .setLatLng([lat, lng])
        .setContent(
          `<div style="font-family:system-ui,sans-serif;padding:2px;">
            <strong style="color:#4f46e5;font-size:13px;">${escapeHtml(nameStr || "Target Community")}</strong>
            <div style="color:#64748b;font-size:11px;margin-top:2px;">Selected from Directory</div>
          </div>`
        )
        .openOn(map);
    }
  }, [searchParams]);

  const busy = status === "loading" || wbiStatus === "loading";

  return (
    <div className="relative w-full h-full min-h-screen z-0">
      <div id="map" className="w-full h-full absolute inset-0 bg-slate-50" />

      {busy && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 border border-slate-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-600">
            {status === "loading" ? "Loading map data…" : "Calculating WBI index…"}
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 shadow-lg rounded-lg px-4 py-2 text-xs font-medium">
          Failed to load map data.
        </div>
      )}

      {coverageLoading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 border border-slate-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-600">Loading coverage contours…</span>
        </div>
      )}

      {coverageError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 shadow-lg rounded-lg px-4 py-2 text-xs font-medium">
          Coverage layer failed to load.
        </div>
      )}
    </div>
  );
}
