import * as Speech from "expo-speech";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icon";
import { LANGUAGES, SAFETY_INSTRUCTION } from "@/data/hazards";
import { useApp } from "@/store/AppProvider";
import { colors } from "@/theme/colors";
import { formatSyncTime } from "@/utils/format";

type InfoRow = { icon: IconName; label: string; value: string };

export default function ProfileScreen() {
  const { language, setLanguage, lastSyncAt, apiBaseUrl } = useApp();
  const [speaking, setSpeaking] = useState(false);

  const rows: InfoRow[] = [
    { icon: "map", label: "COMMUNITY", value: "Wadeye, NT" },
    { icon: "shield", label: "REPORT ACCESS", value: "Community leaders + NTG" },
    { icon: "cloud", label: "LAST SUCCESSFUL SYNC", value: formatSyncTime(lastSyncAt) },
    { icon: "signal", label: "REPORTS API", value: apiBaseUrl.replace(/^https?:\/\//, "") },
  ];

  const listen = () => {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(SAFETY_INSTRUCTION[language], {
      language: "en-AU",
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>MH</Text>
      </View>
      <Text style={styles.name}>MinhHoang</Text>
      <Text style={styles.role}>Authorised community reporter</Text>

      {rows.map((row) => (
        <View key={row.label} style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Icon name={row.icon} size={22} color={colors.profileIconText} />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        </View>
      ))}

      <View style={styles.languagePanel}>
        <View style={styles.languageHeading}>
          <View style={styles.languageIcon}>
            <Icon name="language" size={22} color={colors.langIconText} />
          </View>
          <View style={styles.languageHeadingBody}>
            <Text style={styles.languageLabel}>LANGUAGE & ACCESSIBILITY</Text>
            <Text style={styles.languageTitle}>Choose how information is shown</Text>
          </View>
        </View>

        <View style={styles.languageOptions}>
          {LANGUAGES.map((item) => {
            const selected = language === item;
            return (
              <Pressable
                key={item}
                onPress={() => setLanguage(item)}
                style={[styles.languageOption, selected && styles.languageOptionSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View
                  style={[styles.languageBadge, selected && styles.languageBadgeSelected]}
                >
                  <Text
                    style={[styles.languageBadgeText, selected && styles.languageBadgeTextSelected]}
                  >
                    {item === "English" ? "EN" : "MP"}
                  </Text>
                </View>
                <Text
                  style={[styles.languageOptionText, selected && styles.languageOptionTextSelected]}
                >
                  {item}
                </Text>
                {selected && <Icon name="check" size={16} color={colors.langSelectedText} />}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.listenButton} onPress={listen} accessibilityRole="button">
          <View style={styles.listenIcon}>
            <Icon name="speaker" size={24} color="#ffffff" />
          </View>
          <View style={styles.listenBody}>
            <Text style={styles.listenTitle}>
              {speaking ? "Stop instructions" : "Listen to instructions"}
            </Text>
            <Text style={styles.listenHint}>Play spoken safety information</Text>
          </View>
          <Icon name="chevron" size={18} color={colors.listenText} />
        </Pressable>

        {language === "Murrinh Patha" && (
          <Text style={styles.translationNote}>
            Prototype option — final wording and recorded audio should be reviewed by
            Wadeye community speakers.
          </Text>
        )}
      </View>

      <View style={styles.profileNote}>
        <Icon name="info" size={18} color={colors.profileNoteText} />
        <Text style={styles.profileNoteText}>
          This prototype centres trusted local representatives. Reporter roles and
          data-sharing rules would be agreed with each community before rollout.
        </Text>
      </View>
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
    paddingTop: 32,
    paddingBottom: 26,
    alignItems: "center",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.profileAvatarBg,
    borderWidth: 5,
    borderColor: colors.profileAvatarBorder,
  },
  avatarText: {
    color: colors.profileAvatarText,
    fontSize: 20,
    fontWeight: "700",
  },
  name: {
    marginTop: 13,
    marginBottom: 3,
    fontSize: 19,
    fontWeight: "700",
    color: colors.ink,
  },
  role: {
    marginBottom: 24,
    color: colors.profileSub,
    fontSize: 11,
  },
  infoRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.profileDivider,
  },
  infoIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.profileIconBg,
  },
  infoBody: {
    flex: 1,
    gap: 3,
  },
  infoLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.profileLabel,
    fontWeight: "800",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  languagePanel: {
    width: "100%",
    marginTop: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 16,
    backgroundColor: colors.panelBg,
  },
  languageHeading: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  languageIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.langIconBg,
  },
  languageHeadingBody: {
    flex: 1,
    gap: 3,
  },
  languageLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.langLabel,
    fontWeight: "800",
  },
  languageTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  languageOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  languageOption: {
    flex: 1,
    minHeight: 55,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.langBorder,
    backgroundColor: colors.langBg,
    borderRadius: 12,
    padding: 9,
  },
  languageOptionSelected: {
    borderColor: colors.langSelectedBorder,
    backgroundColor: colors.langSelectedBg,
  },
  languageBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7ece9",
  },
  languageBadgeSelected: {
    backgroundColor: colors.langSelectedBorder,
  },
  languageBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.langText,
  },
  languageBadgeTextSelected: {
    color: "#ffffff",
  },
  languageOptionText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: colors.langText,
  },
  languageOptionTextSelected: {
    color: colors.langSelectedText,
  },
  listenButton: {
    marginTop: 9,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: colors.listenBg,
    borderRadius: 12,
    padding: 10,
  },
  listenIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange,
  },
  listenBody: {
    flex: 1,
    gap: 3,
  },
  listenTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.listenText,
  },
  listenHint: {
    fontSize: 8,
    color: colors.listenHint,
  },
  translationNote: {
    marginTop: 9,
    marginHorizontal: 2,
    color: colors.noteText,
    fontSize: 8,
    lineHeight: 13,
  },
  profileNote: {
    width: "100%",
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
    padding: 12,
    borderRadius: 13,
    backgroundColor: colors.profileNoteBg,
  },
  profileNoteText: {
    flex: 1,
    color: colors.profileNoteBody,
    fontSize: 9,
    lineHeight: 15,
  },
});
