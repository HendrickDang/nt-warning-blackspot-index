import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraModal } from "@/components/CameraModal";
import { Icon } from "@/components/Icon";
import { ScreenTitle } from "@/components/ScreenTitle";
import { DEMO_COORDINATES, HAZARD_CATEGORIES, HAZARD_ICON, SEVERITIES, WADEYE } from "@/data/hazards";
import { useCurrentLocation } from "@/hooks/useLocation";
import { useApp } from "@/store/AppProvider";
import { colors } from "@/theme/colors";
import type { HazardCategory, Severity } from "@/types";
import { formatCoordinates } from "@/utils/format";

const CATEGORY_COLORS = [
  { bg: "#fff3dd", fg: "#9a641d" },
  { bg: "#e9f1df", fg: "#52723d" },
  { bg: "#e4f1f5", fg: "#28718a" },
  { bg: "#fff0e7", fg: "#bd4c25" },
];

const SEVERITY_COLORS: Record<Severity, { bg: string; border: string; text: string }> = {
  Low: { bg: colors.severityLowBg, border: colors.severityLowBorder, text: colors.severityLowText },
  Medium: {
    bg: colors.severityMediumBg,
    border: colors.severityMediumBorder,
    text: colors.severityMediumText,
  },
  High: {
    bg: colors.severityHighBg,
    border: colors.severityHighBorder,
    text: colors.severityHighText,
  },
  Urgent: {
    bg: colors.severityUrgentBg,
    border: colors.severityUrgentBorder,
    text: colors.severityUrgentText,
  },
};

export default function ReportScreen() {
  const { addReport, online } = useApp();
  const { coordinates, status, capture } = useCurrentLocation();

  const [category, setCategory] = useState<HazardCategory>("Dry grass");
  const [severity, setSeverity] = useState<Severity>("High");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void capture();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [capture]);

  const locationLabel = coordinates
    ? formatCoordinates(coordinates.latitude, coordinates.longitude)
    : DEMO_COORDINATES;

  const accuracyLabel =
    status === "loading"
      ? "Locating…"
      : coordinates?.accuracy != null
        ? `± ${Math.round(coordinates.accuracy)} m`
        : "± 8 m";

  const gpsTitle =
    status === "denied"
      ? "Demo location — GPS unavailable"
      : status === "loading"
        ? "Capturing GPS location…"
        : "GPS location captured";

  const submit = () => {
    if (saved) return;
    addReport({
      category,
      severity,
      location: locationLabel,
      latitude: coordinates?.latitude ?? WADEYE.latitude,
      longitude: coordinates?.longitude ?? WADEYE.longitude,
      accuracy: coordinates?.accuracy ?? null,
      notes: notes.trim(),
      photoUri,
    });
    setSaved(true);
    setNotes("");
    setPhotoUri(null);
    saveTimer.current = setTimeout(() => {
      setSaved(false);
      router.navigate("/queue");
    }, 900);
  };

  const buttonIcon = saved ? "check" : online ? "cloud" : "clock";
  const buttonLabel = saved ? "Saved" : online ? "Send report" : "Save to offline queue";

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle
          label="FIELD OBSERVATION"
          title="Report a hazard"
          right={
            <View style={styles.saveState}>
              <View style={styles.saveDot} />
              <Text style={styles.saveStateText}>Saves offline</Text>
            </View>
          }
        />

        <Text style={styles.label}>What did you notice?</Text>
        <View style={styles.categoryGrid}>
          {HAZARD_CATEGORIES.map((item, index) => {
            const palette = CATEGORY_COLORS[index];
            const selected = category === item;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[
                  styles.categoryButton,
                  { backgroundColor: palette.bg },
                  selected && {
                    backgroundColor: "#ffffff",
                    borderColor: palette.fg,
                    shadowColor: palette.fg,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Icon name={HAZARD_ICON[item]} size={28} color={palette.fg} />
                <Text style={[styles.categoryText, { color: palette.fg }]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Risk level</Text>
        <View style={styles.severityRow}>
          {SEVERITIES.map((item) => {
            const selected = severity === item;
            const palette = SEVERITY_COLORS[item];
            return (
              <Pressable
                key={item}
                onPress={() => setSeverity(item)}
                style={[
                  styles.severityButton,
                  selected && {
                    backgroundColor: palette.bg,
                    borderColor: palette.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.severityText, selected && { color: palette.text }]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.photoBox}
          onPress={() => setCameraOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={photoUri ? "Retake photo" : "Add a photo"}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoIcon}>
              <Icon name="camera" size={25} color={colors.photoText} />
            </View>
          )}
          <View style={styles.photoText}>
            <Text style={styles.photoTitle} numberOfLines={1}>
              {photoUri ? "Photo attached" : "Add a photo"}
            </Text>
            <Text style={styles.photoHint}>
              {photoUri
                ? "Stored on this device — tap to retake"
                : "Camera works without connectivity"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.gpsCard}>
          <Icon name="locate" size={20} color={colors.gpsText} />
          <View style={styles.gpsBody}>
            <Text style={styles.gpsTitle}>{gpsTitle}</Text>
            <Text style={styles.gpsCoords}>
              {locationLabel} · {accuracyLabel}
            </Text>
          </View>
          {status === "loading" ? (
            <ActivityIndicator size="small" color={colors.gpsText} />
          ) : (
            <Icon name="check" size={18} color={colors.gpsText} />
          )}
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Describe what you can see…"
          placeholderTextColor="#9aa39e"
          multiline
          style={styles.notes}
        />

        <Pressable
          style={styles.primaryButton}
          onPress={submit}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Icon name={buttonIcon} size={19} color="#ffffff" />
          <Text style={styles.primaryText}>{buttonLabel}</Text>
        </Pressable>

        <View style={styles.privacyLine}>
          <Icon name="shield" size={14} color={colors.privacyText} />
          <Text style={styles.privacyText}>
            Shared only with authorised community and NTG responders.
          </Text>
        </View>
      </ScrollView>

      <CameraModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={setPhotoUri}
      />
    </KeyboardAvoidingView>
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
  saveState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: "#e6eee9",
  },
  saveDot: {
    width: 6,
    height: 6,
    backgroundColor: "#4c866f",
    borderRadius: 3,
  },
  saveStateText: {
    color: "#376052",
    fontSize: 9,
    fontWeight: "700",
  },
  label: {
    marginTop: 15,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    color: colors.fieldLabel,
  },
  categoryGrid: {
    flexDirection: "row",
    gap: 7,
  },
  categoryButton: {
    flex: 1,
    height: 82,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.categoryBorder,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  severityRow: {
    flexDirection: "row",
    gap: 6,
  },
  severityButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.severityBorder,
    backgroundColor: "#ffffff",
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  severityText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.severityText,
  },
  photoBox: {
    marginTop: 15,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.photoBorder,
    backgroundColor: colors.photoBg,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 14,
    minHeight: 78,
  },
  photoIcon: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.photoIconBg,
    borderRadius: 13,
  },
  photoPreview: {
    width: 45,
    height: 45,
    borderRadius: 13,
  },
  photoText: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.photoText,
  },
  photoHint: {
    marginTop: 3,
    fontSize: 9,
    color: colors.photoHint,
  },
  gpsCard: {
    marginTop: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: colors.gpsBg,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gpsBody: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gpsText,
  },
  gpsCoords: {
    marginTop: 2,
    fontSize: 9,
    color: colors.gpsHint,
  },
  notes: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    color: colors.ink,
    textAlignVertical: "top",
  },
  primaryButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 13,
    backgroundColor: colors.primaryButton,
    borderRadius: 12,
  },
  primaryText: {
    color: colors.primaryButtonText,
    fontSize: 12,
    fontWeight: "700",
  },
  privacyLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 9,
  },
  privacyText: {
    color: colors.privacyText,
    fontSize: 8,
  },
});
