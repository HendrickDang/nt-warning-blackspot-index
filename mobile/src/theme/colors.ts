/**
 * Design tokens ported from the original web prototype
 * (Warning_Blackspot_App_Source_Code/app/globals.css + overrides.css).
 */
export const colors = {
  // Base
  ink: "#17211d",
  muted: "#6f7c75",
  green: "#244f43",
  greenDark: "#2c594b",
  greenMid: "#2e574b",
  orange: "#ef6737",
  paper: "#fbfaf6",
  stage: "#ece8df",

  // Top bar
  topbarBg: "#fbfaf6",
  greeting: "#849088",
  avatarBg: "#dbe5de",
  avatarText: "#31584a",

  // Offline / online banner
  bannerOffline: "#293d36",
  bannerOnline: "#2c6651",
  bannerTextMuted: "#b7c3bd",

  // Fire danger summary
  riskSummaryBg: "#fff3eb",
  riskSummaryBorder: "#f2d7c7",
  riskSummaryLabel: "#9c5e42",
  riskSummaryValue: "#b83f1d",
  riskSummaryHint: "#8b6a5b",

  // Section headings
  sectionLabel: "#8b978f",
  sectionButtonBorder: "#d8ded9",
  sectionButtonText: "#31584a",

  // Map
  mapBg: "#dfe2d7",
  mapBorder: "#d0d7ce",
  mapGrid: "#c7c9bc",
  mapLabel: "#66756c",
  riverFill: "#b4d1ce",
  riverStroke: "#c8ddd9",
  mapToggleBg: "#ffffffdd",
  mapToggleText: "#718078",
  mapToggleActive: "#2e574b",
  myLocation: "#2b5b4e",
  coverageFill: "rgba(56, 95, 112, 0.44)",
  coverageBorder: "#446978",
  coverageHotFill: "rgba(239, 103, 55, 0.19)",
  coverageHotBorder: "#ef673780",
  coverageLabel: "#834323",

  // Risk spots
  riskVeryHigh: "#F15A2B",
  riskHigh: "#F59D32",
  riskModerate: "#E9B949",

  // Cards
  cardBg: "#ffffff",
  cardBorder: "#dfe3df",
  actionIconBg: "#e3ede7",
  actionIconText: "#285344",
  actionBody: "#7b8780",

  // Bottom navigation
  navBg: "#ffffff",
  navBorder: "#e5e5df",
  navInactive: "#8d9891",
  navActive: "#244f43",
  createLabel: "#714c3e",

  // Report form
  fieldLabel: "#495951",
  categoryBorder: "#dde3de",
  categoryText: "#708078",
  categorySelectedBorder: "#2f6554",
  categorySelectedBg: "#e9f1ec",
  categorySelectedText: "#254f42",

  // Severity
  severityBorder: "#dde1de",
  severityText: "#718078",
  severityLowBg: "#e3f1e7",
  severityLowBorder: "#70a380",
  severityLowText: "#2f6440",
  severityMediumBg: "#fff5d8",
  severityMediumBorder: "#d6a83f",
  severityMediumText: "#84600c",
  severityHighBg: "#fff0e3",
  severityHighBorder: "#e2864e",
  severityHighText: "#a0451e",
  severityUrgentBg: "#f9e3e0",
  severityUrgentBorder: "#cc5a50",
  severityUrgentText: "#9b2f29",

  // Photo box
  photoBorder: "#b9c7be",
  photoBg: "#f3f6f3",
  photoText: "#355c4f",
  photoIconBg: "#dfeae3",
  photoHint: "#7c8982",

  // GPS card
  gpsBg: "#e9f1ed",
  gpsText: "#315b4c",
  gpsHint: "#698078",

  // Inputs / buttons
  inputBorder: "#dce1dd",
  inputFocus: "#4f7b6c",
  primaryButton: "#2c594b",
  primaryButtonText: "#ffffff",
  privacyText: "#87928c",
  outlineBorder: "#cbd6cf",
  outlineText: "#315b4d",

  // Queue
  syncBorderOffline: "#f0d7c8",
  syncBgOffline: "#fff2e9",
  syncIconBgOffline: "#f5d6c2",
  syncIconTextOffline: "#bd542b",
  syncBorderOnline: "#bdd8cb",
  syncBgOnline: "#e8f2ed",
  syncIconBgOnline: "#cce3d8",
  syncIconTextOnline: "#2c6550",
  reportCardBorder: "#e1e5e1",
  reportThumbBg: "#fff1e6",
  reportThumbText: "#c26031",
  reportTime: "#9aa39e",
  statusQueuedBg: "#f3ece5",
  statusQueuedText: "#a1663e",
  statusSyncingBg: "#e4eef1",
  statusSyncingText: "#376d7d",
  statusSyncedBg: "#e0efe7",
  statusSyncedText: "#327052",

  // Profile
  profileAvatarBg: "#d9e8df",
  profileAvatarText: "#2d5d4d",
  profileAvatarBorder: "#edf3ef",
  profileSub: "#7d8982",
  profileDivider: "#e4e7e4",
  profileIconBg: "#e8efea",
  profileIconText: "#315c4e",
  profileLabel: "#8b9690",
  profileNoteBg: "#fff5e9",
  profileNoteText: "#9b6035",
  profileNoteBody: "#826a58",

  // Language panel
  panelBorder: "#dce4df",
  panelBg: "#ffffff",
  langIconBg: "#e4eee8",
  langIconText: "#315f50",
  langLabel: "#849189",
  langBorder: "#dce3de",
  langBg: "#f8faf8",
  langText: "#63736b",
  langSelectedBorder: "#326451",
  langSelectedBg: "#e8f1ec",
  langSelectedText: "#285343",
  listenBg: "#fff3e7",
  listenText: "#9d522c",
  listenHint: "#8b7667",
  noteText: "#7c8881",
} as const;

export type AppColors = typeof colors;
