import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Ellipse, G, Line } from "react-native-svg";
import { RISK_SPOTS } from "@/data/hazards";
import { colors } from "@/theme/colors";
import type { MapLayer } from "@/types";

/** Decorative community map (grid + river + risk areas), redrawn in SVG. */
export function MapCard() {
  const [layer, setLayer] = useState<MapLayer>("risk");

  return (
    <View style={styles.card}>
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 360 270"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 9 }).map((_, index) => (
          <Line
            key={`a-${index}`}
            x1={index * 88 - 80}
            y1={0}
            x2={index * 88 + 120}
            y2={270}
            stroke={colors.mapGrid}
            strokeWidth={1.5}
            opacity={0.5}
          />
        ))}
        {Array.from({ length: 9 }).map((_, index) => (
          <Line
            key={`b-${index}`}
            x1={index * 110 + 60}
            y1={0}
            x2={index * 110 - 90}
            y2={270}
            stroke={colors.mapGrid}
            strokeWidth={1.5}
            opacity={0.4}
          />
        ))}
        <G transform="rotate(-38 330 105)">
          <Ellipse
            cx={330}
            cy={105}
            rx={175}
            ry={34}
            fill={colors.riverFill}
            stroke={colors.riverStroke}
            strokeWidth={12}
          />
        </G>
      </Svg>

      <Text style={styles.mapLabel}>Wadeye</Text>

      {RISK_SPOTS.map((risk) => (
        <Pressable
          key={risk.id}
          style={[
            styles.spot,
            {
              left: risk.x,
              top: risk.y,
              width: risk.size,
              height: risk.size,
              marginLeft: -risk.size / 2,
              marginTop: -risk.size / 2,
              backgroundColor: `${risk.color}22`,
              borderColor: `${risk.color}70`,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${risk.label} risk area`}
        >
          <View style={[styles.spotDot, { backgroundColor: risk.color }]} />
        </Pressable>
      ))}

      <View style={styles.myLocation}>
        <View style={styles.myLocationDot} />
      </View>

      <View style={styles.toggle}>
        <Pressable
          onPress={() => setLayer("risk")}
          style={[styles.toggleButton, layer === "risk" && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, layer === "risk" && styles.toggleTextActive]}>
            Fire risk
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setLayer("coverage")}
          style={[styles.toggleButton, layer === "coverage" && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, layer === "coverage" && styles.toggleTextActive]}>
            Coverage
          </Text>
        </Pressable>
      </View>

      {layer === "coverage" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.coverage, styles.coverageOne]} />
          <View style={[styles.coverage, styles.coverageTwo]} />
          <View style={[styles.coverageHot, styles.coverageThree]} />
          <Text style={styles.coverageLabel}>Limited coverage</Text>
        </View>
      )}
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
  mapLabel: {
    position: "absolute",
    left: "43%",
    top: "48%",
    fontSize: 9,
    color: colors.mapLabel,
    fontWeight: "700",
  },
  spot: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  spotDot: {
    width: 12,
    height: 12,
    borderWidth: 3,
    borderColor: "#ffffff",
    borderRadius: 6,
  },
  myLocation: {
    position: "absolute",
    left: "47%",
    top: "55%",
    width: 23,
    height: 23,
    backgroundColor: colors.myLocation,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.myLocation,
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  myLocationDot: {
    width: 6,
    height: 6,
    backgroundColor: "#ffffff",
    borderRadius: 3,
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
  coverage: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.coverageFill,
    borderWidth: 1,
    borderColor: colors.coverageBorder,
  },
  coverageOne: {
    left: -85,
    top: -50,
  },
  coverageTwo: {
    right: -75,
    bottom: -70,
  },
  coverageHot: {
    position: "absolute",
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: colors.coverageHotFill,
    borderWidth: 1,
    borderColor: colors.coverageHotBorder,
  },
  coverageThree: {
    left: "40%",
    top: "18%",
  },
  coverageLabel: {
    position: "absolute",
    right: 12,
    bottom: 11,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.mapToggleBg,
    color: colors.coverageLabel,
    fontSize: 9,
    fontWeight: "700",
  },
});
