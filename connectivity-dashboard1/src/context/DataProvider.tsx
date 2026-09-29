import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  CommunityFeature,
  GeoJsonCollection,
  TowerFeatureCollection,
} from "../types";
import { parseCsv } from "../utils/csv";
import { DATA_PATHS, fetchJson, fetchText } from "../utils/dataLoader";
import {
  buildCoverageIndex,
  computeCommunityWBI,
  createBushfireRiskMap,
  extractNTTowerSites,
} from "../utils/wbiCalculators";
import { DataContext } from "./dataContext";
import type { DataContextValue, LoadStatus, WbiStatus } from "./dataContext";

interface CoreData {
  communities: CommunityFeature[];
  towers: TowerFeatureCollection;
  boundary: GeoJsonCollection;
  riskMap: Map<string, string>;
}

interface CommunitiesGeoJson {
  features?: CommunityFeature[];
}

const EMPTY_COMMUNITIES: CommunityFeature[] = [];

/**
 * Loads every bundled dataset exactly once and shares it with the whole app.
 * The four lightweight files load eagerly; the ~20 MB coverage contours load
 * only when WBI is requested or the coverage layer is switched on.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [core, setCore] = useState<CoreData | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [wbiRequested, setWbiRequested] = useState(false);
  const [wbiCommunities, setWbiCommunities] = useState<CommunityFeature[] | null>(null);
  const [wbiError, setWbiError] = useState<string | null>(null);

  const coverageRef = useRef<GeoJsonCollection | null>(null);
  const coveragePromiseRef = useRef<Promise<GeoJsonCollection> | null>(null);
  const wbiPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const [communities, towers, boundary, csv] = await Promise.all([
          fetchJson<CommunitiesGeoJson>(DATA_PATHS.communities, controller.signal),
          fetchJson<TowerFeatureCollection>(DATA_PATHS.towers, controller.signal),
          fetchJson<GeoJsonCollection>(DATA_PATHS.boundary, controller.signal),
          fetchText(DATA_PATHS.bushfireRisk, controller.signal),
        ]);

        if (controller.signal.aborted) return;
        setCore({
          communities: communities.features ?? [],
          towers,
          boundary,
          riskMap: createBushfireRiskMap(parseCsv(csv)),
        });
        setStatus("ready");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, []);

  const loadCoverage = useCallback((): Promise<GeoJsonCollection> => {
    if (coverageRef.current) return Promise.resolve(coverageRef.current);
    if (!coveragePromiseRef.current) {
      coveragePromiseRef.current = fetchJson<GeoJsonCollection>(DATA_PATHS.coverage)
        .then((data) => {
          coverageRef.current = data;
          return data;
        })
        .catch((err) => {
          // Allow a later retry after a failed load.
          coveragePromiseRef.current = null;
          throw err;
        });
    }
    return coveragePromiseRef.current;
  }, []);

  const ensureWbi = useCallback(() => setWbiRequested(true), []);

  useEffect(() => {
    if (!wbiRequested || status !== "ready" || !core) return;
    if (wbiPromiseRef.current) return;

    // State updates happen after the awaits, so no synchronous setState in the
    // effect body; the in-flight promise ref dedupes StrictMode double-runs.
    wbiPromiseRef.current = (async () => {
      try {
        const coverage = await loadCoverage();
        const coverageRings = buildCoverageIndex(coverage);
        const towerSites = extractNTTowerSites(core.towers);
        const enriched = core.communities.map((feature) => ({
          ...feature,
          properties: computeCommunityWBI(
            feature,
            towerSites,
            coverageRings,
            core.riskMap
          ),
        }));
        setWbiCommunities(enriched);
      } catch (err) {
        wbiPromiseRef.current = null;
        setWbiError(
          err instanceof Error ? err.message : "Failed to compute the WBI index"
        );
      }
    })();
  }, [wbiRequested, status, core, loadCoverage]);

  const wbiStatus: WbiStatus = wbiError
    ? "error"
    : wbiCommunities
      ? "ready"
      : wbiRequested && status === "ready"
        ? "loading"
        : "idle";

  const value = useMemo<DataContextValue>(
    () => ({
      communities: core?.communities ?? EMPTY_COMMUNITIES,
      towers: core?.towers ?? null,
      boundary: core?.boundary ?? null,
      status,
      error,
      wbiCommunities,
      wbiStatus,
      wbiError,
      ensureWbi,
      loadCoverage,
    }),
    [
      core,
      status,
      error,
      wbiCommunities,
      wbiStatus,
      wbiError,
      ensureWbi,
      loadCoverage,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
