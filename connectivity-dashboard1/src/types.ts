// Shared domain types used across the dashboard.

/** Toggleable map layers. Single source of truth for App, MapView and LayersPanel. */
export interface LayerState {
  towers: boolean;
  communities: boolean;
  coverage: boolean;
  baseMap: boolean;
  ntBoundary: boolean;
  // Live bushfire overlays (NAFI / FireNorth WMS)
  activeBushfires: boolean;
  burntAreas: boolean;
}

/**
 * Default visibility applied when no `?layers=` state is present.
 * Deliberately minimal — only the NT boundary and communities start visible so
 * the map opens uncluttered; towers, coverage and bushfire overlays are opt-in
 * via the layers panel.
 */
export const DEFAULT_LAYERS: LayerState = {
  towers: false,
  communities: true,
  coverage: false,
  baseMap: true,
  ntBoundary: true,
  activeBushfires: false,
  burntAreas: false,
};

export interface CommunityFeature {
  type: string;
  properties: {
    objectid: number;
    community_id: number;
    bushtel_url: string;
    community_name: string;
    community_aliases: string;
    community_type: string;
    main_language: string;
    local_govt_council: string;
    ward: string;
    land_council: string;
    electorate: string;
    ntg_region: string;
    population_source: string;
    population_count: number | null;
    longitude: number;
    latitude: number;
    // Fields added by Bushfire_analysis/wbi_index.py (public/data/wbi_communities.geojson)
    population_used_in_index?: number;
    population_basis?: "risk_dataset" | "bushtel" | "imputed_type_median";
    risk_rating?: "High" | "Moderate" | "Low";
    fire_plan?: string;
    firebreak?: string;
    fuel_reduction?: string;
    has_coverage?: boolean;
    coverage_status?: string;
    nearest_tower_km?: number;
    nearby_carriers?: number;
    carrier_names?: string;
    hazard_H?: number;
    unreachability_U?: number;
    exposure_E?: number;
    wbi_score?: number;
    wbi_tier?: "Critical" | "High" | "Moderate" | "Low";
    wbi_rank?: number;
    strict_blackspot?: boolean;
    // Pillar scores emitted by src/utils/wbiCalculators.ts when the WBI is
    // computed in the browser instead of pre-baked into the GeoJSON.
    connectivity_gap_score?: number;
    hazard_score?: number;
    proximity_score?: number;
    digital_exclusion_score?: number;
    hazard_risk?: "Extreme" | "High" | "Moderate" | "Low";
    nearest_tower_carriers?: string;
    nearest_tower_4g?: boolean;
    nearest_tower_5g?: boolean;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

/** A de-duplicated mobile tower site used by the WBI proximity pillar. */
export interface TowerSite {
  lat: number;
  lon: number;
  carriers: Set<string>;
  has4G: boolean;
  has5G: boolean;
}

/** A coverage polygon ring with a pre-computed bounding box for fast lookup. */
export interface CoverageRing {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  ring: number[][];
}

/** Properties on the app's NT-filtered tower dataset (see scripts/prepare-data.mjs). */
export interface TowerProperties {
  name: string;
  carrier: string;
  has4G: boolean;
  has5G: boolean;
  rfnsa_id: number | null;
  remoteness: string | null;
}

export interface TowerFeature {
  type: "Feature";
  properties: TowerProperties;
  geometry: { type: "Point"; coordinates: [number, number] };
}

export interface TowerFeatureCollection {
  type: "FeatureCollection";
  features: TowerFeature[];
}

/** Loose GeoJSON collection shape for datasets rendered directly by Leaflet. */
export interface GeoJsonCollection {
  type: string;
  features?: unknown[];
}

