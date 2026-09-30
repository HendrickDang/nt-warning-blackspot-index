import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { API_BASE_CANDIDATES } from "@/config";
import type { HazardCategory, Language, Report, Severity } from "@/types";
import { encodePhotoForUpload } from "@/utils/photo";

const REPORTS_KEY = "warning-blackspot-reports";
const LANGUAGE_KEY = "warning-blackspot-language";
const UPLOAD_TIMEOUT_MS = 8000;
const PROBE_TIMEOUT_MS = 2500;
const RETRY_INTERVAL_MS = 20000;

const SEED_REPORTS: Report[] = [
  {
    id: 1,
    category: "Tall grass",
    severity: "High",
    location: "-14.2418, 129.5216",
    latitude: -14.2418,
    longitude: 129.5216,
    accuracy: 8,
    time: "Today, 8:16 AM",
    status: "synced",
    reportedAt: "2026-09-29T22:16:00.000Z",
  },
  {
    id: 2,
    category: "Dry grass",
    severity: "Medium",
    location: "-14.2371, 129.5262",
    latitude: -14.2371,
    longitude: 129.5262,
    accuracy: 12,
    time: "Yesterday, 4:38 PM",
    status: "synced",
    reportedAt: "2026-09-28T07:38:00.000Z",
  },
];

export type NewReportInput = {
  category: HazardCategory;
  severity: Severity;
  location: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  notes: string;
  photoUri: string | null;
};

type AppContextValue = {
  reports: Report[];
  addReport: (input: NewReportInput) => Report;
  pendingCount: number;
  online: boolean;
  refreshConnectivity: () => void;
  syncNow: () => void;
  language: Language;
  setLanguage: (language: Language) => void;
  lastSyncAt: string | null;
  hydrated: boolean;
  /** The API base URL currently in use (after probing candidates). */
  apiBaseUrl: string;
};

const AppContext = createContext<AppContextValue | null>(null);

function isOnline(state: Awaited<ReturnType<typeof NetInfo.fetch>>): boolean {
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

async function withTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Pick the first candidate base URL whose /api/health responds. */
async function resolveApiBase(preferred?: string): Promise<string | null> {
  const order = preferred
    ? [preferred, ...API_BASE_CANDIDATES.filter((base) => base !== preferred)]
    : [...API_BASE_CANDIDATES];

  for (const base of order) {
    try {
      const ok = await withTimeout(PROBE_TIMEOUT_MS, async (signal) => {
        const response = await fetch(`${base}/api/health`, { signal });
        return response.ok;
      });
      if (ok) return base;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** POST a single report to the field-reports API. Throws on any failure. */
async function uploadReport(base: string, report: Report): Promise<void> {
  // The photo is compressed and encoded at upload time (not stored in the
  // offline queue) so AsyncStorage stays small and the image stays fresh.
  let photo: string | null = null;
  if (report.photoUri) {
    const encoded = await encodePhotoForUpload(report.photoUri);
    photo = encoded?.dataUri ?? null;
  }

  await withTimeout(UPLOAD_TIMEOUT_MS, async (signal) => {
    const response = await fetch(`${base}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: String(report.id),
        category: report.category,
        severity: report.severity,
        latitude: report.latitude,
        longitude: report.longitude,
        accuracy: report.accuracy,
        notes: report.notes ?? "",
        reportedAt: report.reportedAt,
        ...(photo ? { photo } : {}),
      }),
      signal,
    });
    if (!response.ok) throw new Error(`Upload failed (HTTP ${response.status})`);
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(SEED_REPORTS);
  const [language, setLanguageState] = useState<Language>("English");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(API_BASE_CANDIDATES[0]);

  const onlineRef = useRef(true);
  const reportsRef = useRef(reports);
  const apiBaseRef = useRef(apiBaseUrl);
  const inFlightRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  useEffect(() => {
    apiBaseRef.current = apiBaseUrl;
  }, [apiBaseUrl]);

  /** Upload one report: queued -> syncing -> synced (or back to queued). */
  const syncReport = useCallback(async (report: Report) => {
    if (inFlightRef.current.has(report.id)) return;
    inFlightRef.current.add(report.id);
    setReports((current) =>
      current.map((item) => (item.id === report.id ? { ...item, status: "syncing" } : item)),
    );
    try {
      await uploadReport(apiBaseRef.current, report);
      setReports((current) =>
        current.map((item) => (item.id === report.id ? { ...item, status: "synced" } : item)),
      );
      setLastSyncAt(new Date().toISOString());
    } catch {
      // Keep it queued so a later retry can pick it up.
      setReports((current) =>
        current.map((item) => (item.id === report.id ? { ...item, status: "queued" } : item)),
      );
    } finally {
      inFlightRef.current.delete(report.id);
    }
  }, []);

  /** Send every unsynced report in the given list. */
  const flush = useCallback(
    (list: Report[]) => {
      list
        .filter((report) => report.status !== "synced" && !inFlightRef.current.has(report.id))
        .forEach((report) => {
          void syncReport(report);
        });
    },
    [syncReport],
  );

  /** Re-probe the API base, then flush anything queued. */
  const connectAndFlush = useCallback(async () => {
    const base = await resolveApiBase(apiBaseRef.current);
    if (base && base !== apiBaseRef.current) {
      apiBaseRef.current = base;
      setApiBaseUrl(base);
    }
    if (base) flush(reportsRef.current);
  }, [flush]);

  // Connectivity is an external system: react to it inside its subscription.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = isOnline(state);
      onlineRef.current = next;
      setOnline(next);
      if (next) void connectAndFlush();
    });
    return () => unsubscribe();
  }, [connectAndFlush]);

  // Restore persisted queue + language, then try to sync.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [storedReports, storedLanguage] = await Promise.all([
          AsyncStorage.getItem(REPORTS_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
        ]);
        if (!active) return;
        if (storedReports) {
          const restored = JSON.parse(storedReports) as Report[];
          setReports(restored);
          reportsRef.current = restored;
        }
        if (storedLanguage === "English" || storedLanguage === "Murrinh Patha") {
          setLanguageState(storedLanguage);
        }
      } catch {
        // Corrupt storage — keep the seed reports.
      } finally {
        if (active) {
          setHydrated(true);
          await connectAndFlush();
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [connectAndFlush]);

  // Retry queued reports on a timer while online (self-healing queue).
  useEffect(() => {
    const id = setInterval(() => {
      if (onlineRef.current) void connectAndFlush();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [connectAndFlush]);

  // Retry when the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && onlineRef.current) void connectAndFlush();
    });
    return () => subscription.remove();
  }, [connectAndFlush]);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  }, [reports, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(LANGUAGE_KEY, language);
  }, [language, hydrated]);

  const syncNow = useCallback(() => {
    void connectAndFlush();
  }, [connectAndFlush]);

  const addReport = useCallback(
    (input: NewReportInput) => {
      const report: Report = {
        id: Date.now(),
        category: input.category,
        severity: input.severity,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        time: "Just now",
        status: "queued",
        notes: input.notes,
        photoUri: input.photoUri,
        reportedAt: new Date().toISOString(),
      };
      setReports((current) => [report, ...current]);
      // Attempt an immediate upload; the retry timer covers failures.
      void syncReport(report);
      return report;
    },
    [syncReport],
  );

  const pendingCount = useMemo(
    () => reports.filter((report) => report.status !== "synced").length,
    [reports],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      reports,
      addReport,
      pendingCount,
      online,
      refreshConnectivity: syncNow,
      syncNow,
      language,
      setLanguage: setLanguageState,
      lastSyncAt,
      hydrated,
      apiBaseUrl,
    }),
    [reports, addReport, pendingCount, online, syncNow, language, lastSyncAt, hydrated, apiBaseUrl],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside <AppProvider>");
  return context;
}
