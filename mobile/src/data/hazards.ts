import type { HazardCategory, Language, RiskSpot, Severity } from "@/types";
import { colors } from "@/theme/colors";

export const HAZARD_CATEGORIES: HazardCategory[] = [
  "Dry grass",
  "Tall grass",
  "Floodwater",
  "Fire / smoke",
];

export const SEVERITIES: Severity[] = ["Low", "Medium", "High", "Urgent"];

export const LANGUAGES: Language[] = ["English", "Murrinh Patha"];

/** Icon name per hazard, mirroring the mapping in the web prototype. */
export const HAZARD_ICON: Record<HazardCategory, "grassDry" | "grassTall" | "flood" | "fire"> = {
  "Dry grass": "grassDry",
  "Tall grass": "grassTall",
  Floodwater: "flood",
  "Fire / smoke": "fire",
};

/** Demonstration risk areas rendered on the offline (SVG) community map. */
export const RISK_SPOTS: RiskSpot[] = [
  { id: 1, label: "Very high", color: colors.riskVeryHigh, x: "57%", y: "31%", size: 98 },
  { id: 2, label: "High", color: colors.riskHigh, x: "28%", y: "56%", size: 72 },
  { id: 3, label: "Moderate", color: colors.riskModerate, x: "69%", y: "68%", size: 54 },
];

/** Wadeye community centre, used to centre the live map. */
export const WADEYE = { latitude: -14.2407, longitude: 129.5211 };

export type MapRiskArea = {
  id: number;
  label: string;
  color: string;
  latitude: number;
  longitude: number;
  radius: number;
};

/** Demonstration risk areas for the live OpenStreetMap view. */
export const MAP_RISK_AREAS: MapRiskArea[] = [
  { id: 1, label: "Very high", color: colors.riskVeryHigh, latitude: -14.2378, longitude: 129.5262, radius: 900 },
  { id: 2, label: "High", color: colors.riskHigh, latitude: -14.2436, longitude: 129.5178, radius: 700 },
  { id: 3, label: "Moderate", color: colors.riskModerate, latitude: -14.2352, longitude: 129.525, radius: 520 },
];

/** Demonstration coordinates used when GPS is unavailable (Wadeye, NT). */
export const DEMO_COORDINATES = "-14.2407, 129.5211";

export const GREETING_WINDOW = {
  morning: "GOOD MORNING",
  afternoon: "GOOD AFTERNOON",
  evening: "GOOD EVENING",
} as const;

export const SAFETY_INSTRUCTION = {
  English:
    "Fire danger is high today. Take extra care. Report any hazard you see, even without signal, and it will be sent when connectivity returns.",
  "Murrinh Patha":
    "Fire danger is high today. Take extra care. Report any hazard you see, even without signal, and it will be sent when connectivity returns.",
} as const;
