// NAFI / FireNorth bushfire overlay configuration.
// Data source: Darwin Centre for Bushfire Research (CDU) — https://www.firenorth.org.au/

export const NAFI_WMS_URL = "https://www.firenorth.org.au/public";
export const NAFI_ATTRIBUTION =
  'Fire data &copy; <a href="https://www.firenorth.org.au/" target="_blank" rel="noreferrer">NAFI / Darwin Centre for Bushfire Research</a>';

// Satellite thermal hotspot detections within the last 24 hours = active fires.
export const ACTIVE_FIRE_LAYERS =
  "HOTSPOTS_00_TO_06_HOURS,HOTSPOTS_06_TO_12_HOURS,HOTSPOTS_12_TO_24_HOURS";

// Current calendar-year burnt areas, colour-coded by month of burning.
export const BURNT_AREAS_LAYER = "fsm_current";

export interface LegendSwatch {
  label: string;
  color: string;
  /** Unicode glyph used to depict the marker in the legend. */
  glyph: string;
}

// NAFI "burnt areas by month" palette. Colours are the full-strength palette;
// the WMS renders them at ~51% opacity, so the legend applies the same fade.
// Warmer colours are allocated to the warmer (later) months where fires are
// generally more intense.
export const BURNT_AREA_MONTHS: Array<{ label: string; color: string }> = [
  { label: "Jan", color: "#826482" },
  { label: "Feb", color: "#6E82A5" },
  { label: "Mar", color: "#374B37" },
  { label: "Apr", color: "#46AF91" },
  { label: "May", color: "#33FF99" },
  { label: "Jun", color: "#33FF33" },
  { label: "Jul", color: "#338433" },
  { label: "Aug", color: "#FFFF00" },
  { label: "Sep", color: "#FF964B" },
  { label: "Oct", color: "#FF80FF" },
  { label: "Nov", color: "#A03CA0" },
  { label: "Dec", color: "#320032" },
];

// Hotspot bands actually rendered by ACTIVE_FIRE_LAYERS, with the marker
// colour/shape taken from the service's SLD style definitions.
export const HOTSPOT_BANDS: LegendSwatch[] = [
  { label: "00–06 hrs", color: "#C800C8", glyph: "★" },
  { label: "06–12 hrs", color: "#FF0000", glyph: "★" },
  { label: "12–24 hrs", color: "#FF0000", glyph: "■" },
];
