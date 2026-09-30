import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { useApp } from "@/store/AppProvider";
import { colors } from "@/theme/colors";

/** Prop type for a custom tab bar, derived from expo-router's own Tabs. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

type TabConfig = {
  route: string;
  label: string;
  icon: IconName;
  create?: boolean;
  badge?: boolean;
};

const TABS: TabConfig[] = [
  { route: "index", label: "Map", icon: "map" },
  { route: "report", label: "Report", icon: "plus", create: true },
  { route: "queue", label: "Queue", icon: "list", badge: true },
  { route: "profile", label: "Profile", icon: "user" },
];

/** Custom bottom tab bar with a raised centre "Report" button and queue badge. */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { pendingCount } = useApp();
  const activeName = state.routes[state.index]?.name;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 9) }]}>
      {TABS.map((tab) => {
        const active = activeName === tab.route;
        const onPress = () => navigation.navigate(tab.route);

        if (tab.create) {
          return (
            <Pressable
              key={tab.route}
              onPress={onPress}
              style={[styles.item, styles.createItem]}
              accessibilityRole="button"
              accessibilityLabel="Create report"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.plusWrap}>
                <Icon name="plus" size={24} color="#ffffff" strokeWidth={2.2} />
              </View>
              <Text style={[styles.label, styles.createLabel]}>Report</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={tab.route}
            onPress={onPress}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <View>
              <Icon
                name={tab.icon}
                size={22}
                color={active ? colors.navActive : colors.navInactive}
              />
              {tab.badge && pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 7,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.navBorder,
    backgroundColor: colors.navBg,
    overflow: "visible",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
  },
  createItem: {
    marginTop: -19,
  },
  plusWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.orange,
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  badge: {
    position: "absolute",
    right: -8,
    top: -6,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "700",
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.navInactive,
  },
  labelActive: {
    color: colors.navActive,
  },
  createLabel: {
    color: colors.createLabel,
  },
});
