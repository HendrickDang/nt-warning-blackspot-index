import { useEffect, useRef } from "react";
import L, { Map as LeafletMap, GeoJSON, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  layers: {
    towers: boolean;
    communities: boolean;
    coverage: boolean;
    activeNodes: boolean;
    offlineNodes: boolean;
    communityHubs: boolean;
    nodeDensity: boolean;
    signalStrength: boolean;
    baseMap: boolean;
    ntBoundary: boolean;
  };
}

export default function MapView({ layers }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const baseMapRef = useRef<TileLayer | null>(null);
  
  // Cache fetched geoJSON layers so we don't re-fetch on every toggle
  const geoCache = useRef<Record<string, GeoJSON>>({});

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

    // Initialize Base Map Layer (but don't add it yet, let the sync effect handle it)
    baseMapRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 12 }
    );

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. SYNC LAYERS (Runs when 'layers' prop changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // --- Base Map Toggle ---
    if (layers.baseMap && baseMapRef.current && !map.hasLayer(baseMapRef.current)) {
      baseMapRef.current.addTo(map);
    } else if (!layers.baseMap && baseMapRef.current && map.hasLayer(baseMapRef.current)) {
      map.removeLayer(baseMapRef.current);
    }

    // --- Helper function to manage GeoJSON layers efficiently ---
    const syncGeoJsonLayer = async (
      layerKey: keyof Props["layers"],
      url: string,
      options: L.GeoJSONOptions
    ) => {
      const isActive = layers[layerKey];
      const cachedLayer = geoCache.current[layerKey];

      if (isActive) {
        // If it's cached, just add it back to the map
        if (cachedLayer && !map.hasLayer(cachedLayer)) {
          cachedLayer.addTo(map);
        } 
        // If not cached, fetch it once and save it
        else if (!cachedLayer) {
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            const newLayer = L.geoJSON(data, options);
            
            geoCache.current[layerKey] = newLayer;

            // Check if the layer wasn't toggled off while fetching
            if (layers[layerKey]) {
              newLayer.addTo(map);
            }
          } catch (error) {
            console.error(`Failed to load layer: ${layerKey}`, error);
          }
        }
      } else {
        // If layer is toggled off, remove it from the map view
        if (cachedLayer && map.hasLayer(cachedLayer)) {
          map.removeLayer(cachedLayer);
        }
      }
    };

    // --- Trigger Data Syncs ---
    syncGeoJsonLayer("communities", "src/data/communities.geojson", {
      pane: "communitiesPane",
      pointToLayer: (_, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          fillColor: "#eab308", // Tailwind yellow-500
          color: "#ca8a04",    // Tailwind yellow-600
          weight: 2,
          fillOpacity: 0.9,
        }),
    });

    syncGeoJsonLayer("coverage", "src/data/coverage.geojson", {
      pane: "coveragePane",
      style: {
        color: "#3b82f6", // Tailwind blue-500
        weight: 2,
        fillOpacity: 0.15,
      },
    });

    syncGeoJsonLayer("ntBoundary", "src/data/nt_boundary.geojson", {
      style: {
        color: "#ef4444", // Tailwind red-500
        weight: 2,
        opacity: 0.7,
        fill: false,
        dashArray: "5, 10", // Adds a nice dashed border for boundaries
      },
    });

    /* 
      Add future layers here easily:
      syncGeoJsonLayer("activeNodes", "src/data/active_nodes.geojson", { ... });
    */

  }, [layers]); // Only re-runs when the `layers` state changes

  return (
    <div className="relative w-full h-full min-h-screen z-0">
      <div id="map" className="w-full h-full absolute inset-0 bg-slate-50" />
    </div>
  );
}