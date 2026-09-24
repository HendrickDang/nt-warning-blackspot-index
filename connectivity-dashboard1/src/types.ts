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
    // Optional fields present on some datasets / risk CSV fallbacks
    RATING?: string;
    rating?: string;
    COMMUNITY?: string;
    COMMTYPE?: string;
    POPULATION?: number;
    // WBI enriched fields
    wbi_score?: number;
    wbi_tier?: "Critical" | "High" | "Moderate" | "Low";
    hazard_risk?: "Extreme" | "High" | "Moderate" | "Low";
    coverage_status?: string;
    has_coverage?: boolean;
    nearby_carriers?: number;
    carrier_names?: string;
    nearest_tower_km?: number;
    nearest_tower_carriers?: string;
    nearest_tower_4g?: boolean;
    nearest_tower_5g?: boolean;
    connectivity_gap_score?: number;
    hazard_score?: number;
    proximity_score?: number;
    digital_exclusion_score?: number;
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
