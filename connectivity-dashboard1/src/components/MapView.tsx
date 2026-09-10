import { useEffect, useRef } from "react";
import L, { Map as LeafletMap, GeoJSON } from "leaflet";
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

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("map").setView([-19.0, 133.0], 5);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
    }).addTo(map);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous overlay layers
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof GeoJSON) {
        map.removeLayer(layer);
      }
    });

  map.createPane("communitiesPane");
  map.getPane("communitiesPane")!.style.zIndex = "700";

  map.createPane("nodesPane");
  map.getPane("nodesPane")!.style.zIndex = "600";

  map.createPane("coveragePane");
  map.getPane("coveragePane")!.style.zIndex = "500"; 

    // Communities
   if (layers.communities) {
  fetch("src/data/communities.geojson")
    .then((r) => r.json())
    .then((data) =>
      L.geoJSON(data, {
        pane: "communitiesPane",
        pointToLayer: (_, latlng) =>
          L.circleMarker(latlng, {
            radius: 6,
            fillColor: "yellow",
            color: "orange",
            weight: 1,
            fillOpacity: 0.9,
          }),
      }).addTo(map)
    );
}


    // Coverage polygons
   fetch("src/data/coverage.geojson")
  .then((r) => {
    if (!r.ok) throw new Error(`Failed to load geojson: ${r.status}`);
    return r.json();
  })
  .then((data) => {
    L.geoJSON(data, {
      pane: "coveragePane",
      style: {
        color: "#3388ff",
        weight: 2,
        fillOpacity: 0.2,
      },
    }).addTo(map);
  })
  .catch((err) => console.error("GeoJSON load error:", err));

    // NT Boundary
    if (layers.ntBoundary) {
      
      fetch("src/data/nt_boundary.geojson")
        .then((r) => r.json())
        .then((data) =>
          L.geoJSON(data, {
            
            style: {
              color: "red",
              weight: 3,
              opacity: 0.8,
              fill: false,
            },
          }).addTo(map)
        );
    }
  }, [layers]);

  return <div id="map" className="w-full h-screen"></div>;
}


