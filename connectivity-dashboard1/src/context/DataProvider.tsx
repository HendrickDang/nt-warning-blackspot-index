import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  CommunityFeature,
  FieldReport,
  GeoJsonCollection,
  TowerFeatureCollection,
} from "../types";
import { parseCsv } from "../utils/csv";
import { DATA_PATHS, fetchJson, fetchText } from "../utils/dataLoader";
import { loadDisasterEvents } from "../utils/disasters";
import type { DisasterEvent } from "../utils/disasters";
import { createBushfireRiskMap } from "../utils/wbiCalculators";
import { DataContext } from "./dataContext";
import type {
  DataContextValue,
  DisasterStatus,
  LoadStatus,
  ReportsSource,
  ReportsStatus,
  WbiStatus,
} from "./dataContext";

const REPORTS_POLL_MS = 5000;

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

  const [reports, setReports] = useState<FieldReport[]>([]);
  const [reportsStatus, setReportsStatus] = useState<ReportsStatus>("loading");
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsSource, setReportsSource] = useState<ReportsSource | null>(null);

  const coverageRef = useRef<GeoJsonCollection | null>(null);
  const coveragePromiseRef = useRef<Promise<GeoJsonCollection> | null>(null);
  const wbiPromiseRef = useRef<Promise<void> | null>(null);

  const [disasterRequested, setDisasterRequested] = useState(false);
  const [disasters, setDisasters] = useState<DisasterEvent[] | null>(null);
  const [disasterStatus, setDisasterStatus] = useState<DisasterStatus>("idle");
  const [disasterError, setDisasterError] = useState<string | null>(null);
  const [disasterUpdatedAt, setDisasterUpdatedAt] = useState<number | null>(null);
  const disasterPromiseRef = useRef<Promise<void> | null>(null);

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

  /**
   * Fetch community field reports from the reports API. If the API is not
   * running (e.g. a static preview build), fall back to the bundled snapshot.
   */
  const loadReports = useCallback(async () => {
    try {
      const data = await fetchJson<{ reports: FieldReport[] }>(DATA_PATHS.reports);
      const next = Array.isArray(data.reports) ? data.reports : [];
      setReports((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setReportsStatus("ready");
      setReportsError(null);
      setReportsSource("api");
    } catch (err) {
      try {
        const snapshot = await fetchJson<FieldReport[]>(DATA_PATHS.reportsFallback);
        const next = Array.isArray(snapshot) ? snapshot : [];
        setReports((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        setReportsStatus("ready");
        setReportsSource("fallback");
        setReportsError(err instanceof Error ? err.message : "Reports API unavailable");
      } catch {
        setReportsStatus("error");
        setReportsError("Reports API and bundled snapshot are both unavailable");
      }
    }
  }, []);

  // Poll for new reports so a submission on the phone appears on the dashboard.
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled) void loadReports();
    };
    tick();
    const id = setInterval(tick, REPORTS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loadReports]);

  const ensureWbi = useCallback(() => setWbiRequested(true), []);

  useEffect(() => {
    if (!wbiRequested || status !== "ready" || !core) return;
    if (wbiPromiseRef.current) return;

    // State updates happen after the awaits, so no synchronous setState in the
    // effect body; the in-flight promise ref dedupes StrictMode double-runs.
    wbiPromiseRef.current = (async () => {
      try {
        // The index is computed once in Python (Bushfire_analysis/wbi_index.py)
        // and shipped as a static file, so the dashboard shows exactly the
        // numbers in the report and needs no network.
        const scored = await fetchJson<CommunitiesGeoJson>(DATA_PATHS.wbi);
        setWbiCommunities(scored.features ?? []);
      } catch (err) {
        wbiPromiseRef.current = null;
        setWbiError(
          err instanceof Error ? err.message : "Failed to load WBI scores (run Bushfire_analysis/wbi_index.py)"
        );
      }
    })();
  }, [wbiRequested, status, core]);

  const wbiStatus: WbiStatus = wbiError
    ? "error"
    : wbiCommunities
      ? "ready"
      : wbiRequested && status === "ready"
        ? "loading"
        : "idle";

  // Live disaster feed (GDACS). Loaded lazily when a page asks for it and
  // refreshable on demand; the promise ref dedupes concurrent requests.
  const loadDisasters = useCallback((force = false) => {
    if (!force && disasterPromiseRef.current) return;
    disasterPromiseRef.current = (async () => {
      setDisasterStatus("loading");
      setDisasterError(null);
      try {
        const events = await loadDisasterEvents();
        setDisasters(events);
        setDisasterUpdatedAt(Date.now());
        setDisasterStatus("ready");
      } catch (err) {
        // Allow a later retry after a failed fetch.
        disasterPromiseRef.current = null;
        setDisasterError(
          err instanceof Error ? err.message : "Failed to load live disaster data"
        );
        setDisasterStatus("error");
      }
    })();
  }, []);

  const ensureDisasters = useCallback(() => setDisasterRequested(true), []);
  const refreshDisasters = useCallback(() => loadDisasters(true), [loadDisasters]);

  useEffect(() => {
    if (!disasterRequested || status !== "ready") return;
    loadDisasters();
  }, [disasterRequested, status, loadDisasters]);

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
      reports,
      reportsStatus,
      reportsError,
      reportsSource,
      refreshReports: loadReports,
      disasters,
      disasterStatus,
      disasterError,
      disasterUpdatedAt,
      ensureDisasters,
      refreshDisasters,
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
      reports,
      reportsStatus,
      reportsError,
      reportsSource,
      loadReports,
      disasters,
      disasterStatus,
      disasterError,
      disasterUpdatedAt,
      ensureDisasters,
      refreshDisasters,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
