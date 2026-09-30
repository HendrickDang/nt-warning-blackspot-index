import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { ReportListItem } from "@/components/ReportListItem";
import { ScreenTitle } from "@/components/ScreenTitle";
import { useApp } from "@/store/AppProvider";
import { colors } from "@/theme/colors";

export default function QueueScreen() {
  const { reports, online, pendingCount, apiBaseUrl, syncNow } = useApp();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTitle
        label="OFFLINE STORAGE"
        title="Saved reports"
        right={
          <View style={styles.count}>
            <Text style={styles.countText}>{pendingCount} waiting</Text>
          </View>
        }
      />

      <View style={[styles.syncCard, online && styles.syncCardOnline]}>
        <View style={[styles.syncIcon, online && styles.syncIconOnline]}>
          <Icon
            name={online ? "cloud" : "signal"}
            size={23}
            color={online ? colors.syncIconTextOnline : colors.syncIconTextOffline}
          />
        </View>
        <View style={styles.syncBody}>
          <Text style={styles.syncTitle}>
            {online ? "Connection available" : "Waiting for connectivity"}
          </Text>
          <Text style={styles.syncText}>
            {online
              ? "Reports are being sent securely."
              : "Reports will sync automatically when a network is found."}
          </Text>
        </View>
      </View>

      <Text style={styles.apiLine}>Reports API: {apiBaseUrl.replace(/^https?:\/\//, "")}</Text>

      <View style={styles.list}>
        {reports.map((report) => (
          <ReportListItem key={report.id} report={report} />
        ))}
        {reports.length === 0 && (
          <Text style={styles.empty}>No reports saved yet.</Text>
        )}
      </View>

      <Pressable
        style={styles.outlineButton}
        onPress={() => router.navigate("/report")}
        accessibilityRole="button"
      >
        <Icon name="plus" size={17} color={colors.outlineText} />
        <Text style={styles.outlineText}>Add another report</Text>
      </Pressable>

      <Pressable style={styles.hint} onPress={syncNow} accessibilityRole="button">
        <Icon name="cloud" size={14} color={colors.privacyText} />
        <Text style={styles.hintText}>Tap to sync again now</Text>
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
    padding: 20,
    paddingBottom: 26,
  },
  count: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: "#e6eee9",
  },
  countText: {
    color: "#376052",
    fontSize: 9,
    fontWeight: "700",
  },
  syncCard: {
    borderWidth: 1,
    borderColor: colors.syncBorderOffline,
    backgroundColor: colors.syncBgOffline,
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  syncCardOnline: {
    borderColor: colors.syncBorderOnline,
    backgroundColor: colors.syncBgOnline,
  },
  syncIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.syncIconBgOffline,
  },
  syncIconOnline: {
    backgroundColor: colors.syncIconBgOnline,
  },
  syncBody: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  syncText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
  },
  list: {
    marginTop: 13,
    gap: 8,
  },
  empty: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 12,
  },
  outlineButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    borderRadius: 12,
  },
  outlineText: {
    color: colors.outlineText,
    fontSize: 12,
    fontWeight: "700",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 9,
  },
  hintText: {
    color: colors.privacyText,
    fontSize: 8,
  },
  apiLine: {
    marginTop: 8,
    marginLeft: 2,
    color: colors.privacyText,
    fontSize: 9,
  },
});
