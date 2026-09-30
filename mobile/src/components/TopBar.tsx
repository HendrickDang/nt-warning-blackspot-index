import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GREETING_WINDOW } from "@/data/hazards";
import { colors } from "@/theme/colors";

function greetingForHour(hour: number): string {
  if (hour < 12) return GREETING_WINDOW.morning;
  if (hour < 18) return GREETING_WINDOW.afternoon;
  return GREETING_WINDOW.evening;
}

export function TopBar() {
  const insets = useSafeAreaInsets();
  const greeting = greetingForHour(new Date().getHours());

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 24 }]}>
      <View>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.title}>Wadeye Community</Text>
      </View>
      <Pressable
        style={styles.avatar}
        onPress={() => router.navigate("/profile")}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <Text style={styles.avatarText}>MH</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 14,
    backgroundColor: colors.topbarBg,
  },
  greeting: {
    marginBottom: 4,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.greeting,
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.36,
    fontWeight: "700",
    color: colors.ink,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.avatarBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 11,
    fontWeight: "700",
  },
});
