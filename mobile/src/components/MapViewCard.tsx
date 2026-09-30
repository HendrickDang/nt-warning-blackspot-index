import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { MapCard } from "@/components/MapCard";
import { MAP_RISK_AREAS, WADEYE, type MapRiskArea } from "@/data/hazards";
import { useApp } from "@/store/AppProvider";
import { colors } from "@/theme/colors";
import type { MapLayer } from "@/types";

type Center = { latitude: number; longitude: number };

/**
 * Live community map using OpenStreetMap raster tiles rendered in a WebView
 * (Leaflet), so no Google Maps API key is required. Falls back to the offline
 * decorative SVG map when there is no connectivity.
 */
function buildHtml(areas: MapRiskArea[], center: Center): string {
  const areasJson = JSON.stringify(areas);
  const coverageJson = JSON.stringify(
    areas.map((area, index) => ({
      latitude: area.latitude + (index - 1) * 0.004,
      longitude: area.longitude + (index - 1) * 0.004,
      radius: area.radius * 2.6,
    })),
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.mapBg}; }
  .leaflet-control-attribution { font-size: 8px; background: rgba(255,255,255,0.75); }
  .leaflet-control-zoom { display: none; }
  .place-label {
    font: 700 11px Arial, Helvetica, sans-serif;
    color: ${colors.mapLabel};
    text-shadow: 0 1px 2px #fff, 0 0 3px #fff;
    white-space: nowrap;
  }
  .me-label {
    font: 700 10px Arial, Helvetica, sans-serif;
    color: #ffffff;
    background: #4f46e5;
    padding: 2px 7px;
    border-radius: 9999px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    white-space: nowrap;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var center = [${center.latitude}, ${center.longitude}];
  var areas = ${areasJson};
  var coverage = ${coverageJson};

  var map = L.map('map', { zoomControl: false, attributionControl: true, preferCanvas: true })
    .setView(center, 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  L.marker(center, {
    icon: L.divIcon({ className: 'place-label', html: 'Wadeye' }),
    interactive: false
  }).addTo(map);

  var riskLayer = L.layerGroup().addTo(map);
  areas.forEach(function (area) {
    L.circle([area.latitude, area.longitude], {
      radius: area.radius,
      color: area.color,
      weight: 1,
      fillColor: area.color,
      fillOpacity: 0.22
    }).addTo(riskLayer);
    L.circleMarker([area.latitude, area.longitude], {
      radius: 7, color: '#ffffff', weight: 3,
      fillColor: area.color, fillOpacity: 1
    }).addTo(riskLayer);
  });

  var coverageLayer = L.layerGroup();
  coverage.forEach(function (area, index) {
    L.circle([area.latitude, area.longitude], {
      radius: area.radius,
      color: '${colors.coverageBorder}',
      weight: 1,
      fillColor: index === 2 ? '${colors.coverageHotFill}' : 'rgba(56, 95, 112, 0.30)',
      fillOpacity: 0.8
    }).addTo(coverageLayer);
  });

  function setLayer(name) {
    if (name === 'coverage') {
      map.removeLayer(riskLayer);
      coverageLayer.addTo(map);
    } else {
      map.removeLayer(coverageLayer);
      riskLayer.addTo(map);
    }
  }
  window.setLayer = setLayer;

  var meMarker = null;
  function centerOn(lat, lng) {
    if (meMarker) { map.removeLayer(meMarker); }
    meMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: 'me-label', html: 'You' })
    }).addTo(map);
    map.flyTo([lat, lng], 15, { duration: 1 });
  }
  window.centerOn = centerOn;

  setTimeout(function () { map.invalidateSize(); }, 200);
</script>
</body>
</html>`;
}

export type MapFocus = { latitude: number; longitude: number };

type MapViewCardProps = {
  /** When set, the map centres on this position and marks it "You". */
  focus?: MapFocus | null;
};

export function MapViewCard({ focus = null }: MapViewCardProps) {
  const { online } = useApp();
  const webRef = useRef<WebView>(null);
  const [layer, setLayer] = useState<MapLayer>("risk");
  const focusRef = useRef<MapFocus | null>(focus);

  const html = useMemo(() => buildHtml(MAP_RISK_AREAS, WADEYE), []);

  useEffect(() => {
    focusRef.current = focus;
    if (!focus) return;
    webRef.current?.injectJavaScript(
      `window.centerOn && window.centerOn(${focus.latitude}, ${focus.longitude}); true;`,
    );
  }, [focus]);

  // Offline: show the decorative, fully local map instead.
  if (!online) return <MapCard />;

  const changeLayer = (next: MapLayer) => {
    setLayer(next);
    webRef.current?.injectJavaScript(`window.setLayer && window.setLayer('${next}'); true;`);
  };

  return (
    <View style={styles.card}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        containerStyle={styles.webContainer}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onLoadEnd={() => {
          webRef.current?.injectJavaScript(`window.setLayer && window.setLayer('${layer}'); true;`);
          const pending = focusRef.current;
          if (pending) {
            webRef.current?.injectJavaScript(
              `window.centerOn && window.centerOn(${pending.latitude}, ${pending.longitude}); true;`,
            );
          }
        }}
      />

      <View style={styles.toggle}>
        <Pressable
          onPress={() => changeLayer("risk")}
          style={[styles.toggleButton, layer === "risk" && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, layer === "risk" && styles.toggleTextActive]}>
            Fire risk
          </Text>
        </Pressable>
        <Pressable
          onPress={() => changeLayer("coverage")}
          style={[styles.toggleButton, layer === "coverage" && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, layer === "coverage" && styles.toggleTextActive]}>
            Coverage
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 270,
    borderRadius: 19,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.mapBg,
    borderWidth: 1,
    borderColor: colors.mapBorder,
  },
  web: {
    flex: 1,
    backgroundColor: colors.mapBg,
  },
  webContainer: {
    backgroundColor: colors.mapBg,
  },
  toggle: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    gap: 3,
    padding: 3,
    backgroundColor: colors.mapToggleBg,
    borderRadius: 10,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  toggleActive: {
    backgroundColor: colors.mapToggleActive,
  },
  toggleText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.mapToggleText,
  },
  toggleTextActive: {
    color: "#ffffff",
  },
});
