// Single source of truth for the cell-tower glyph, shared by the Leaflet
// divIcon on the map and the legend swatch in the layers panel so the two can
// never drift apart.

export interface TowerGlyph {
  /** SVG path data drawn in a 24x24 viewBox. */
  paths: string[];
  /** The lit tip on top of the mast. */
  tip: { cx: number; cy: number; r: number };
  /** Stroke width in viewBox units, tuned to stay legible at ~20px. */
  strokeWidth: number;
  stroke: string;
  fill: string;
}

export const TOWER_GLYPH: TowerGlyph = {
  paths: [
    // Lattice mast: two sides from the apex down to the ground
    "M12 4.6 8 20",
    "M12 4.6 16 20",
    // Ground crossbar
    "M8 20h8",
    // Cross braces
    "M9.9 12.5h4.2",
    "M8.9 16.5h6.2",
  ],
  tip: { cx: 12, cy: 3.2, r: 1.4 },
  strokeWidth: 1.3,
  stroke: "#047857",
  fill: "#10b981",
};

/** Inline SVG markup, for handing to a Leaflet divIcon. */
export function towerGlyphMarkup(size = 20): string {
  const paths = TOWER_GLYPH.paths.map((d) => `<path d="${d}"/>`).join("");
  const { cx, cy, r } = TOWER_GLYPH.tip;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
    `fill="none" stroke="${TOWER_GLYPH.stroke}" stroke-width="${TOWER_GLYPH.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    `${paths}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${TOWER_GLYPH.fill}"/></svg>`
  );
}
