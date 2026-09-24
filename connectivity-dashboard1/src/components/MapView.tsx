import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import L, { Map as LeafletMap, GeoJSON, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LayerState } from "../types";
import {
  NAFI_WMS_URL,
  NAFI_ATTRIBUTION,
  ACTIVE_FIRE_LAYERS,
  BURNT_AREAS_LAYER,
} from "../bushfire";

interface Props {
  layers: LayerState;
}

export default function MapView({ layers }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const baseMapRef = useRef<TileLayer | null>(null);
  const activeFireRef = useRef<TileLayer | null>(null);
  const burntAreasRef = useRef<TileLayer | null>(null);
  const [searchParams] = useSearchParams();
  
  // Cache fetched geoJSON layers so we don't re-fetch on every toggle
  const geoCache = useRef<Record<string, GeoJSON>>({});

  // De-duplicate in-flight fetches. Without this, concurrent syncs (e.g. React
  // StrictMode double-invoking effects) create two copies of the same layer and
  // the cache ends up pointing at the one that is not on the map.
  const geoLoading = useRef<Record<string, Promise<GeoJSON | null>>>({});

  // Always-fresh copy of the layers prop for async callbacks, so they read the
  // latest toggle state instead of the value captured when the fetch started.
  const layersRef = useRef(layers);

  // 1. INITIALIZE MAP (Runs once on mount)
  useEffect(() => {
    if (mapRef.current) return;

    // Initialize map
    const map = L.map("map", {
      zoomControl: true,
    }).setView([-19.0, 133.0], 5);
    mapRef.current = map;

    // Setup Z-Index Panes for ordering
    map.createPane("coveragePane");
    map.getPane("coveragePane")!.style.zIndex = "500";

    map.createPane("nodesPane");
    map.getPane("nodesPane")!.style.zIndex = "600";

    map.createPane("communitiesPane");
    map.getPane("communitiesPane")!.style.zIndex = "700";

    // Bushfire overlays sit above coverage fills but below node/community markers
    map.createPane("bushfirePane");
    map.getPane("bushfirePane")!.style.zIndex = "550";

    // Initialize Base Map Layer (but don't add it yet, let the sync effect handle it)
    baseMapRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 12 }
    );

    // Live active-fire hotspots (last 24h) from the NAFI WMS
    activeFireRef.current = L.tileLayer.wms(NAFI_WMS_URL, {
      layers: ACTIVE_FIRE_LAYERS,
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      crs: L.CRS.EPSG4326,
      pane: "bushfirePane",
      maxZoom: 12,
      attribution: NAFI_ATTRIBUTION,
    });

    // Burnt areas for the current calendar year, colour-coded by month.
    // The service already applies ~51% opacity, so no extra layer opacity here.
    burntAreasRef.current = L.tileLayer.wms(NAFI_WMS_URL, {
      layers: BURNT_AREAS_LAYER,
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      crs: L.CRS.EPSG4326,
      pane: "bushfirePane",
      maxZoom: 12,
      attribution: NAFI_ATTRIBUTION,
    });

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle URL query parameters (e.g. from Communities page "View on Map")
  useEffect(() => {
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const nameStr = searchParams.get("name");
    const map = mapRef.current;

    if (map && latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], 10, { duration: 1.5 });
        L.popup()
          .setLatLng([lat, lng])
          .setContent(`
            <div style="font-family: system-ui, sans-serif; padding: 2px;">
              <strong style="color: #4f46e5; font-size: 13px;">${nameStr || "Target Community"}</strong>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Selected from Directory</div>
            </div>
          `)
          .openOn(map);
      }
    }
  }, [searchParams]);

  // 2. SYNC LAYERS (Runs when 'layers' prop changes)
  useEffect(() => {
    // Keep the async callbacks below reading the latest toggle state.
    layersRef.current = layers;

    const map = mapRef.current;
    if (!map) return;

    // --- Helper to add/remove a cached tile layer based on its toggle ---
    const syncTileLayer = (layer: TileLayer | null, isActive: boolean) => {
      if (!layer) return;
      if (isActive && !map.hasLayer(layer)) {
        layer.addTo(map);
      } else if (!isActive && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };

    // --- Base Map + Bushfire Overlay Toggles ---
    syncTileLayer(baseMapRef.current, layers.baseMap);
    syncTileLayer(activeFireRef.current, layers.activeBushfires);
    syncTileLayer(burntAreasRef.current, layers.burntAreas);

    // --- Helper function to manage GeoJSON layers efficiently ---
    const syncGeoJsonLayer = async (
      layerKey: keyof LayerState,
      url: string,
      options: L.GeoJSONOptions
    ) => {
      // Resolve the map and toggle state when the async work finishes: the map
      // is recreated under StrictMode/remounts and toggles can change mid-fetch.
      const currentMap = () => mapRef.current;
      const isActive = () => layersRef.current[layerKey];
      const cachedLayer = geoCache.current[layerKey];

      // Cached: just show/hide it.
      if (cachedLayer) {
        const m = currentMap();
        if (!m) return;
        if (isActive() && !m.hasLayer(cachedLayer)) {
          cachedLayer.addTo(m);
        } else if (!isActive() && m.hasLayer(cachedLayer)) {
          m.removeLayer(cachedLayer);
        }
        return;
      }

      // Nothing cached and the layer is off: nothing to do.
      if (!isActive()) return;

      // Fetch once, even if several syncs run before the fetch resolves.
      let pending = geoLoading.current[layerKey];
      if (!pending) {
        pending = (async () => {
          try {
            let response = await fetch(url);
            if (!response.ok) {
              const cleanUrl = url.split("?")[0];
              const fallbackUrl = cleanUrl.startsWith("/") ? cleanUrl.replace(/^\/data\//, "src/data/") : cleanUrl;
              response = await fetch(fallbackUrl);
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            return L.geoJSON(data, options);
          } catch (error) {
            console.error(`Failed to load layer: ${layerKey}`, error);
            return null;
          } finally {
            delete geoLoading.current[layerKey];
          }
        })();
        geoLoading.current[layerKey] = pending;
      }

      const newLayer = await pending;
      if (!newLayer) return;

      // A concurrent sync may have cached the layer while we awaited.
      if (geoCache.current[layerKey]) return;
      geoCache.current[layerKey] = newLayer;

      // Only add it if it is still enabled and the map is still alive.
      const m = currentMap();
      if (m && isActive()) {
        newLayer.addTo(m);
      }
    };

    // --- Trigger Data Syncs ---
    syncGeoJsonLayer("communities", "/data/communities.geojson?v=2", {
      pane: "communitiesPane",
      pointToLayer: (_, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          fillColor: "#eab308", // Tailwind yellow-500
          color: "#ca8a04",    // Tailwind yellow-600
          weight: 2,
          fillOpacity: 0.9,
        }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        if (p) {
          layer.bindPopup(`
            <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 200px; padding: 2px;">
              <h3 style="margin: 0 0 4px; font-weight: 700; font-size: 14px; color: #0f172a;">${p.community_name || "Community"}</h3>
              <div style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-bottom: 6px;">
                ${p.community_type || "Outstation"} • ${p.ntg_region || "NT"}
              </div>
              <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                <div><strong>Council:</strong> ${p.local_govt_council || "N/A"}</div>
                <div><strong>Population:</strong> ${p.population_count !== null && p.population_count !== undefined ? p.population_count.toLocaleString() : "Not recorded"}</div>
                <div><strong>Language:</strong> ${p.main_language || "Not recorded"}</div>
              </div>
              ${
                p.bushtel_url
                  ? `<div style="margin-top: 8px; border-top: 1px solid #f1f5f9; pt: 6px;">
                      <a href="${p.bushtel_url}" target="_blank" rel="noreferrer" style="color: #4f46e5; text-decoration: underline; font-size: 11px; font-weight: 600;">View BushTel Profile &rarr;</a>
                    </div>`
                  : ""
              }
            </div>
          `);
        }
      },
    });

    syncGeoJsonLayer("coverage", "/data/coverage.geojson?v=2", {
      pane: "coveragePane",
      style: {
        color: "#2563eb", // Tailwind blue-600
        weight: 1.5,
        fillColor: "#3b82f6", // Tailwind blue-500
        fillOpacity: 0.25,
      },
    });

    syncGeoJsonLayer("ntBoundary", "/data/nt_boundary.geojson?v=2", {
      style: {
        color: "#ef4444", // Tailwind red-500
        weight: 2,
        opacity: 0.7,
        fill: false,
        dashArray: "5, 10", // Adds a nice dashed border for boundaries
      },
    });

    syncGeoJsonLayer("towers", "/data/towers.geojson?v=2", {
      pane: "nodesPane",
      pointToLayer: (_, latlng) =>
        L.circleMarker(latlng, {
          radius: 5,
          fillColor: "#10b981",
          color: "#047857",
          weight: 2,
          fillOpacity: 0.9,
        }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        if (p) {
          layer.bindPopup(`
            <div style="font-family: system-ui, sans-serif; padding: 2px;">
              <strong style="color: #047857; font-size: 13px;">${p.name || "Cell Tower"}</strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                ${p.carrier ? `Carrier: ${p.carrier}` : "Telecommunication Site"}
              </div>
            </div>
          `);
        }
      },
    });

  }, [layers]); // Only re-runs when the `layers` state changes

  return (
    <div className="relative w-full h-full min-h-screen z-0">
      <div id="map" className="w-full h-full absolute inset-0 bg-slate-50" />
    </div>
  );
}