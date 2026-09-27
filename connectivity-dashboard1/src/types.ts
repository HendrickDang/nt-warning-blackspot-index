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
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}
