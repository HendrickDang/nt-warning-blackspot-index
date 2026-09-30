import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type ScreenTitleProps = {
  label: string;
  title: string;
  right?: ReactNode;
};

export function ScreenTitle({ label, title, right }: ScreenTitleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  textBlock: {
    flexShrink: 1,
  },
  label: {
    marginBottom: 4,
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: "800",
    color: colors.sectionLabel,
  },
  title: {
    fontSize: 21,
    letterSpacing: -0.6,
    fontWeight: "700",
    color: colors.ink,
  },
});
