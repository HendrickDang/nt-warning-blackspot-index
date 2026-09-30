import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { useApp } from "@/store/AppProvider";
import { colors } from "@/theme/colors";

export function OfflineBanner() {
  const { online, refreshConnectivity } = useApp();

  return (
    <Pressable
      onPress={refreshConnectivity}
      style={[styles.banner, online && styles.bannerOnline]}
      accessibilityRole="button"
      accessibilityLabel={online ? "Connected, tap to re-check" : "Offline mode"}
    >
      <View style={styles.left}>
        <Icon name="signal" size={17} color="#ffffff" />
        <Text style={styles.label}>{online ? "Connected — syncing" : "Offline mode"}</Text>
      </View>
      <Text style={styles.hint}>
        {online ? "Tap to re-check" : "Reports will sync automatically"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 9,
    paddingHorizontal: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bannerOffline,
  },
  bannerOnline: {
    backgroundColor: colors.bannerOnline,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  label: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  hint: {
    color: colors.bannerTextMuted,
    fontSize: 9,
  },
});
