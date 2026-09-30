import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";
import type { Report, ReportStatus, Severity } from "@/types";

const THUMB: Record<Severity, { bg: string; fg: string }> = {
  Low: { bg: colors.reportThumbBg, fg: colors.reportThumbText },
  Medium: { bg: "#fff6dd", fg: "#a57817" },
  High: { bg: colors.reportThumbBg, fg: colors.reportThumbText },
  Urgent: { bg: "#f7e4e1", fg: "#ac3930" },
};

const BADGE: Record<Severity, { bg: string; fg: string }> = {
  Low: { bg: "#f5e8dd", fg: "#a04d28" },
  Medium: { bg: "#fff1c8", fg: "#81610d" },
  High: { bg: "#f5e8dd", fg: "#a04d28" },
  Urgent: { bg: "#f4d8d4", fg: "#97372f" },
};

const STATUS: Record<ReportStatus, { bg: string; fg: string; icon: IconName }> = {
  queued: { bg: colors.statusQueuedBg, fg: colors.statusQueuedText, icon: "clock" },
  syncing: { bg: colors.statusSyncingBg, fg: colors.statusSyncingText, icon: "cloud" },
  synced: { bg: colors.statusSyncedBg, fg: colors.statusSyncedText, icon: "check" },
};

function iconForCategory(category: string): IconName {
  const value = category.toLowerCase();
  if (value.includes("grass")) return "grassTall";
  if (value.includes("flood")) return "flood";
  if (value.includes("fire") || value.includes("smoke")) return "fire";
  return "alert";
}

export function ReportListItem({ report }: { report: Report }) {
  const thumb = THUMB[report.severity];
  const badge = BADGE[report.severity];
  const status = STATUS[report.status];

  return (
    <View style={styles.card}>
      <View style={[styles.thumb, { backgroundColor: thumb.bg }]}>
        <Icon name={iconForCategory(report.category)} size={23} color={thumb.fg} />
      </View>

      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={styles.category}>{report.category}</Text>
          <Text style={[styles.severity, { backgroundColor: badge.bg, color: badge.fg }]}>
            {report.severity}
          </Text>
        </View>
        <Text style={styles.location}>{report.location}</Text>
        <Text style={styles.time}>{report.time}</Text>
      </View>

      <View style={[styles.status, { backgroundColor: status.bg }]}>
        <Icon name={status.icon} size={15} color={status.fg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.reportCardBorder,
    borderRadius: 14,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  category: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  severity: {
    fontSize: 7,
    fontWeight: "800",
    textTransform: "uppercase",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 5,
    overflow: "hidden",
  },
  location: {
    marginTop: 3,
    marginBottom: 2,
    color: colors.muted,
    fontSize: 9,
  },
  time: {
    fontSize: 8,
    color: colors.reportTime,
  },
  status: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
