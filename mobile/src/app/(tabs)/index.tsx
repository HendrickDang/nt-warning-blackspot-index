import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { MapViewCard, type MapFocus } from "@/components/MapViewCard";
import { useCurrentLocation } from "@/hooks/useLocation";
import { colors } from "@/theme/colors";

export default function MapScreen() {
  const { capture, status } = useCurrentLocation();
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const locate = async () => {
    const next = await capture();
    if (next) setFocus({ latitude: next.latitude, longitude: next.longitude });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.riskSummary}>
        <View style={styles.riskIcon}>
          <Icon name="fire" size={28} color="#ffffff" />
        </View>
        <View style={styles.riskBody}>
          <Text style={styles.riskLabel}>CURRENT FIRE DANGER</Text>
          <Text style={styles.riskValue}>High</Text>
          <Text style={styles.riskHint}>Take extra care today</Text>
        </View>
        <Text style={styles.trend}>↑</Text>
      </View>

      <View style={styles.heading}>
        <View>
          <Text style={styles.headingLabel}>COMMUNITY MAP</Text>
          <Text style={styles.headingTitle}>Nearby risk areas</Text>
        </View>
        <Pressable
          style={styles.locateButton}
          onPress={locate}
          accessibilityRole="button"
          accessibilityLabel="Use my location"
        >
          {status === "loading" ? (
            <ActivityIndicator size="small" color={colors.sectionButtonText} />
          ) : (
            <Icon name="locate" size={20} color={colors.sectionButtonText} />
          )}
        </Pressable>
      </View>

      <MapViewCard focus={focus} />

      <Pressable
        style={styles.actionCard}
        onPress={() => router.navigate("/report")}
        accessibilityRole="button"
        accessibilityLabel="Create report"
      >
        <View style={styles.actionIcon}>
          <Icon name="plus" size={22} color={colors.actionIconText} />
        </View>
        <View style={styles.actionBody}>
          <Text style={styles.actionTitle}>Seen a hazard?</Text>
          <Text style={styles.actionText}>
            Capture it now. Your report will save offline.
          </Text>
        </View>
        <Icon name="chevron" size={20} color="#567168" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },
  riskSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colors.riskSummaryBg,
    borderWidth: 1,
    borderColor: colors.riskSummaryBorder,
    padding: 15,
    borderRadius: 18,
  },
  riskIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange,
    borderRadius: 16,
  },
  riskBody: {
    flex: 1,
  },
  riskLabel: {
    marginBottom: 2,
    color: colors.riskSummaryLabel,
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  riskValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.riskSummaryValue,
  },
  riskHint: {
    fontSize: 11,
    color: colors.riskSummaryHint,
  },
  trend: {
    color: "#c34d27",
    fontSize: 21,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 1,
  },
  headingLabel: {
    marginBottom: 3,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "800",
    color: colors.sectionLabel,
  },
  headingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  locateButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.sectionButtonBorder,
    backgroundColor: "#ffffff",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCard: {
    marginTop: 13,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
  },
  actionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.actionIconBg,
    borderRadius: 12,
  },
  actionBody: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  actionText: {
    marginTop: 3,
    color: colors.actionBody,
    fontSize: 10,
    lineHeight: 14,
  },
});
