// Shared WBI tier metadata so the map, tables, cards and charts all speak the
// same visual language. Colours mirror the badge classes used in the
// Communities page.

export type WbiTier = "Critical" | "High" | "Moderate" | "Low";

export interface WbiTierStyle {
  tier: WbiTier;
  /** Score band, e.g. "≥ 75". */
  range: string;
  /** Marker fill colour. */
  fill: string;
  /** Marker / swatch border colour. */
  stroke: string;
  /** Tailwind classes for text badges. */
  badge: string;
}

const TIER_STYLES: Record<WbiTier, WbiTierStyle> = {
  Critical: {
    tier: "Critical",
    range: "≥ 75",
    fill: "#dc2626",
    stroke: "#991b1b",
    badge: "bg-red-100 text-red-800 border-red-300 font-bold",
  },
  High: {
    tier: "High",
    range: "60 – 74",
    fill: "#ea580c",
    stroke: "#9a3412",
    badge: "bg-orange-100 text-orange-800 border-orange-300 font-bold",
  },
  Moderate: {
    tier: "Moderate",
    range: "40 – 59",
    fill: "#eab308",
    stroke: "#a16207",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold",
  },
  Low: {
    tier: "Low",
    range: "< 40",
    fill: "#10b981",
    stroke: "#047857",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold",
  },
};

export const WBI_TIERS: WbiTier[] = ["Critical", "High", "Moderate", "Low"];

export const WBI_TIER_STYLES: WbiTierStyle[] = WBI_TIERS.map(
  (tier) => TIER_STYLES[tier]
);

const FALLBACK: WbiTierStyle = {
  tier: "Low",
  range: "—",
  fill: "#eab308",
  stroke: "#a16207",
  badge: "bg-slate-100 text-slate-700 border-slate-300 font-semibold",
};

export function wbiTierFromScore(score: number): WbiTier {
  if (score >= 75) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

export function getWbiTierStyle(tier?: string): WbiTierStyle {
  if (tier && tier in TIER_STYLES) return TIER_STYLES[tier as WbiTier];
  return FALLBACK;
}
