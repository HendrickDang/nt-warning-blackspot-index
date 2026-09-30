import { createContext, useContext } from "react";
import type {
  CommunityFeature,
  FieldReport,
  GeoJsonCollection,
  TowerFeatureCollection,
} from "../types";
import type { DisasterEvent } from "../utils/disasters";

export type LoadStatus = "loading" | "ready" | "error";
export type WbiStatus = "idle" | "loading" | "ready" | "error";
export type DisasterStatus = "idle" | "loading" | "ready" | "error";
export type ReportsStatus = "loading" | "ready" | "error";
export type ReportsSource = "api" | "fallback";

export interface DataContextValue {
  /** Raw community features (no WBI enrichment). */
  communities: CommunityFeature[];
  towers: TowerFeatureCollection | null;
  boundary: GeoJsonCollection | null;
  status: LoadStatus;
  error: string | null;

  /** Communities enriched with WBI scores — null until computed. */
  wbiCommunities: CommunityFeature[] | null;
  wbiStatus: WbiStatus;
  wbiError: string | null;
  /** Request WBI computation (loads coverage on first call). Idempotent. */
  ensureWbi: () => void;
  /** Loads and caches the coverage GeoJSON (shared by the map and WBI). */
  loadCoverage: () => Promise<GeoJsonCollection>;

  /** Live GDACS cyclone/flood events relevant to the NT — null until loaded. */
  disasters: DisasterEvent[] | null;
  disasterStatus: DisasterStatus;
  disasterError: string | null;
  /** Epoch ms of the last successful disaster fetch, or null. */
  disasterUpdatedAt: number | null;
  /** Request the disaster feed (called when Analytics mounts). Idempotent. */
  ensureDisasters: () => void;
  /** Force a fresh disaster fetch, bypassing the cache. */
  refreshDisasters: () => void;

  /** Community-submitted field reports (from the mobile app). */
  reports: FieldReport[];
  reportsStatus: ReportsStatus;
  reportsError: string | null;
  /** Where the current reports came from: live API or bundled fallback. */
  reportsSource: ReportsSource | null;
  /** Force an immediate refetch of reports. */
  refreshReports: () => Promise<void>;
}

export const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
